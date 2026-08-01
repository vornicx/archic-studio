import { and, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { clients, projects } from "../../../db/schema";
import { runtimeEnv } from "../../../lib/runtime-env";
import { assessProject, buildSiteBundle, type GeneratorClient, type GeneratorProject } from "../../../lib/site-generator";
import { normalizeGeneratorProject, type StudioClient, type StudioProject } from "../../../lib/studio-local";

type GithubUser = { login: string; name?: string | null; avatar_url?: string; html_url: string };
type GithubRepo = { full_name: string; html_url: string; default_branch: string; private: boolean };

function ownerEmail(request: Request) {
  return request.headers.get("oai-authenticated-user-email") ?? "vadim@archic.es";
}

async function githubConfig() {
  const runtime = await runtimeEnv();
  const requiresPublishKey = runtime.VERCEL === "1";
  return {
    token: runtime.GITHUB_TOKEN?.trim() ?? "",
    owner: runtime.GITHUB_OWNER?.trim() ?? "",
    publishKey: runtime.ARCHIC_PUBLISH_KEY?.trim() ?? "",
    requiresPublishKey,
  };
}

function secretMatches(expected: string, supplied: string) {
  if (!expected || expected.length !== supplied.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
  }
  return difference === 0;
}

function clean(value: unknown, maxLength = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function publishClient(input: Partial<StudioClient>): GeneratorClient {
  return {
    name: clean(input.name),
    legalName: clean(input.legalName),
    taxId: clean(input.taxId),
    email: clean(input.email, 320),
    phone: clean(input.phone, 120),
    address: clean(input.address),
    city: clean(input.city, 240),
    country: clean(input.country, 240),
    sector: clean(input.sector, 240),
    registryData: clean(input.registryData),
    professionalData: clean(input.professionalData),
  };
}

async function githubRequest<T>(token: string, path: string, init?: RequestInit) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "Archic-Studio",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({})) as T & { message?: string };
  if (!response.ok) {
    const error = new Error(payload.message || `GitHub respondió con ${response.status}.`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return payload;
}

function base64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary);
}

function repoName(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/(^[-.]+|[-.]+$)/g, "")
    .slice(0, 80);
}

async function upsertFile(token: string, repo: string, path: string, content: string, branch?: string) {
  let sha = "";
  try {
    const current = await githubRequest<{ sha: string }>(token, `/repos/${repo}/contents/${encodeURIComponent(path)}${branch ? `?ref=${encodeURIComponent(branch)}` : ""}`);
    sha = current.sha;
  } catch (error) {
    if ((error as Error & { status?: number }).status !== 404) throw error;
  }
  return githubRequest(token, `/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Archic Studio: actualizar ${path}`,
      content: base64Utf8(content),
      ...(branch ? { branch } : {}),
      ...(sha ? { sha } : {}),
    }),
  });
}

export async function GET() {
  const config = await githubConfig();
  if (!config.token) {
    return Response.json({ connected: false, owner: config.owner, reason: "missing_token", requiresPublishKey: config.requiresPublishKey });
  }
  if (config.requiresPublishKey && !config.publishKey) {
    return Response.json({ connected: false, owner: config.owner, reason: "missing_publish_key", requiresPublishKey: true });
  }
  try {
    const user = await githubRequest<GithubUser>(config.token, "/user");
    return Response.json({ connected: true, owner: config.owner || user.login, user, requiresPublishKey: config.requiresPublishKey });
  } catch (error) {
    return Response.json({ connected: false, owner: config.owner, reason: "invalid_token", error: error instanceof Error ? error.message : "No se pudo validar GitHub.", requiresPublishKey: config.requiresPublishKey });
  }
}

export async function POST(request: Request) {
  try {
    const config = await githubConfig();
    if (!config.token) {
      return Response.json({ error: "GitHub todavía no está conectado. Añade GITHUB_TOKEN como secreto del Studio." }, { status: 503 });
    }
    if (config.requiresPublishKey) {
      if (!config.publishKey) {
        return Response.json({ error: "Configura ARCHIC_PUBLISH_KEY como secreto de Vercel antes de habilitar publicaciones." }, { status: 503 });
      }
      const supplied = request.headers.get("x-archic-publish-key") ?? "";
      if (!secretMatches(config.publishKey, supplied)) {
        return Response.json({ error: "La clave de publicación no es válida." }, { status: 401 });
      }
    }
    const body = await request.json() as {
      projectId?: string;
      repoName?: string;
      visibility?: "private" | "public";
      project?: Partial<StudioProject>;
      client?: Partial<StudioClient>;
    };
    const projectId = body.project?.id || body.projectId;
    if (!projectId) return Response.json({ error: "Proyecto no válido." }, { status: 400 });
    const name = repoName(body.repoName);
    if (!name) return Response.json({ error: "Escribe un nombre válido para el repositorio." }, { status: 400 });

    let client: GeneratorClient;
    let generatedProject: GeneratorProject;
    let persistence: {
      db: Awaited<ReturnType<typeof getDb>>;
      email: string;
      projectId: string;
    } | null = null;

    if (body.project && body.client) {
      client = publishClient(body.client);
      generatedProject = normalizeGeneratorProject(body.project);
    } else {
      await ensureSchema();
      const email = ownerEmail(request);
      const db = await getDb();
      const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, email))).limit(1);
      if (!project) return Response.json({ error: "Proyecto no encontrado." }, { status: 404 });
      const [storedClient] = await db.select().from(clients).where(and(eq(clients.id, project.clientId), eq(clients.ownerEmail, email))).limit(1);
      if (!storedClient) return Response.json({ error: "Cliente no encontrado." }, { status: 404 });
      client = storedClient;
      generatedProject = {
        name: project.name,
        slug: project.slug,
        siteType: project.siteType,
        template: project.template,
        primaryColor: project.primaryColor,
        accentColor: project.accentColor,
        headline: project.headline,
        subheadline: project.subheadline,
        heroImageUrl: project.heroImageUrl,
        sections: JSON.parse(project.sectionsJson) as string[],
        integrations: JSON.parse(project.integrationsJson) as string[],
        legal: JSON.parse(project.legalJson) as Record<string, boolean>,
        brief: JSON.parse(project.briefJson),
        legalProfile: JSON.parse(project.legalProfileJson),
      };
      persistence = { db, email, projectId: project.id };
    }

    const audit = assessProject(client, generatedProject);
    if (audit.blockers.length) {
      return Response.json({
        error: `Publicación bloqueada: ${audit.blockers.map((finding) => finding.label).join(", ")}.`,
        audit,
      }, { status: 409 });
    }

    const user = await githubRequest<GithubUser>(config.token, "/user");
    const targetOwner = config.owner || user.login;
    const fullName = `${targetOwner}/${name}`;
    let repo: GithubRepo;
    let created = false;
    try {
      repo = await githubRequest<GithubRepo>(config.token, `/repos/${fullName}`);
    } catch (error) {
      if ((error as Error & { status?: number }).status !== 404) throw error;
      const endpoint = targetOwner.toLowerCase() === user.login.toLowerCase() ? "/user/repos" : `/orgs/${targetOwner}/repos`;
      repo = await githubRequest<GithubRepo>(config.token, endpoint, {
        method: "POST",
        body: JSON.stringify({
          name,
          description: `${client.name || generatedProject.name || "Sitio"} · sitio generado con Archic Studio`,
          private: body.visibility !== "public",
          has_issues: true,
          has_projects: false,
          has_wiki: false,
          auto_init: false,
        }),
      });
      created = true;
    }

    const files = buildSiteBundle(client, generatedProject);
    let branch = repo.default_branch || "main";
    const entries = Object.entries(files);

    if (created) {
      const readme = entries.find(([path]) => path === "README.md");
      if (readme) await upsertFile(config.token, repo.full_name, readme[0], readme[1]);
      repo = await githubRequest<GithubRepo>(config.token, `/repos/${repo.full_name}`);
      branch = repo.default_branch || "main";
    }
    for (const [path, content] of entries) {
      if (created && path === "README.md") continue;
      await upsertFile(config.token, repo.full_name, path, content, branch);
    }

    const pushedAt = new Date().toISOString();
    if (persistence) {
      await persistence.db.update(projects).set({
        githubRepoFullName: repo.full_name,
        githubRepoUrl: repo.html_url,
        githubDefaultBranch: branch,
        githubLastPushAt: pushedAt,
        updatedAt: pushedAt,
      }).where(and(eq(projects.id, persistence.projectId), eq(projects.ownerEmail, persistence.email)));
    }

    return Response.json({
      ok: true,
      created,
      repository: { fullName: repo.full_name, url: repo.html_url, branch, private: repo.private },
      pushedAt,
      files: Object.keys(files),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo publicar en GitHub." }, { status: 500 });
  }
}
