import { and, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { clients, projects } from "../../../db/schema";
import { assessProject, buildSiteBundle, type GeneratorProject } from "../../../lib/site-generator";

type GithubUser = { login: string; name?: string | null; avatar_url?: string; html_url: string };
type GithubRepo = { full_name: string; html_url: string; default_branch: string; private: boolean };

function ownerEmail(request: Request) {
  return request.headers.get("oai-authenticated-user-email") ?? "vadim@archic.es";
}

async function githubConfig() {
  const workers = await import("cloudflare:workers");
  const runtime = workers.env as unknown as Record<string, string | undefined>;
  return {
    token: runtime.GITHUB_TOKEN?.trim() ?? "",
    owner: runtime.GITHUB_OWNER?.trim() ?? "",
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
    return Response.json({ connected: false, owner: config.owner, reason: "missing_token" });
  }
  try {
    const user = await githubRequest<GithubUser>(config.token, "/user");
    return Response.json({ connected: true, owner: config.owner || user.login, user });
  } catch (error) {
    return Response.json({ connected: false, owner: config.owner, reason: "invalid_token", error: error instanceof Error ? error.message : "No se pudo validar GitHub." });
  }
}

export async function POST(request: Request) {
  try {
    const config = await githubConfig();
    if (!config.token) {
      return Response.json({ error: "GitHub todavía no está conectado. Añade GITHUB_TOKEN como secreto del Studio." }, { status: 503 });
    }
    const body = await request.json() as { projectId?: string; repoName?: string; visibility?: "private" | "public" };
    if (!body.projectId) return Response.json({ error: "Proyecto no válido." }, { status: 400 });
    const name = repoName(body.repoName);
    if (!name) return Response.json({ error: "Escribe un nombre válido para el repositorio." }, { status: 400 });

    await ensureSchema();
    const email = ownerEmail(request);
    const db = await getDb();
    const [project] = await db.select().from(projects).where(and(eq(projects.id, body.projectId), eq(projects.ownerEmail, email))).limit(1);
    if (!project) return Response.json({ error: "Proyecto no encontrado." }, { status: 404 });
    const [client] = await db.select().from(clients).where(and(eq(clients.id, project.clientId), eq(clients.ownerEmail, email))).limit(1);
    if (!client) return Response.json({ error: "Cliente no encontrado." }, { status: 404 });

    const generatedProject: GeneratorProject = {
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
          description: `${client.name} · sitio generado con Archic Studio`,
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
    await db.update(projects).set({
      githubRepoFullName: repo.full_name,
      githubRepoUrl: repo.html_url,
      githubDefaultBranch: branch,
      githubLastPushAt: pushedAt,
      updatedAt: pushedAt,
    }).where(and(eq(projects.id, project.id), eq(projects.ownerEmail, email)));

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
