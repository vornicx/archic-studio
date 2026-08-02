import { getFounder } from "../../../lib/founder-auth";
import { runtimeEnv } from "../../../lib/runtime-env";
import { assessProject, buildSiteBundle, type GeneratorClient, type GeneratorProject } from "../../../lib/site-generator";
import type { StudioClient } from "../../../lib/studio-local";
import { createAdminSupabase } from "../../../lib/supabase/server";

type GithubUser = { login: string; name?: string | null; avatar_url?: string; html_url: string };
type GithubRepo = { full_name: string; html_url: string; default_branch: string; private: boolean };

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

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const expectedHost = request.headers.get("x-forwarded-host")
      || request.headers.get("host")
      || new URL(request.url).host;
    return new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
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
  const founder = await getFounder();
  if (!founder) return Response.json({ error: "Inicia sesión con una cuenta de fundador." }, { status: 401 });
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
    if (!sameOrigin(request)) return Response.json({ error: "Solicitud rechazada." }, { status: 403 });
    const founder = await getFounder();
    if (!founder) return Response.json({ error: "Inicia sesión con una cuenta de fundador." }, { status: 401 });
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
    };
    const projectId = body.projectId;
    if (!projectId) return Response.json({ error: "Proyecto no válido." }, { status: 400 });
    const name = repoName(body.repoName);
    if (!name) return Response.json({ error: "Escribe un nombre válido para el repositorio." }, { status: 400 });

    const admin = createAdminSupabase();
    const { data: project, error: projectError } = await admin.from("projects").select("*").eq("id", projectId).maybeSingle();
    if (projectError) throw new Error(projectError.message);
    if (!project) return Response.json({ error: "Proyecto no encontrado." }, { status: 404 });
    const { data: storedClient, error: clientError } = await admin.from("clients").select("*").eq("id", project.client_id).maybeSingle();
    if (clientError) throw new Error(clientError.message);
    if (!storedClient) return Response.json({ error: "Cliente no encontrado." }, { status: 404 });
    const client: GeneratorClient = publishClient({
      name: storedClient.name,
      legalName: storedClient.legal_name,
      taxId: storedClient.tax_id,
      email: storedClient.email,
      phone: storedClient.phone,
      address: storedClient.address,
      city: storedClient.city,
      country: storedClient.country,
      sector: storedClient.sector,
      registryData: storedClient.registry_data,
      professionalData: storedClient.professional_data,
    });
    const generatedProject: GeneratorProject = {
      name: project.name,
      slug: project.slug,
      siteType: project.site_type,
      template: project.template,
      primaryColor: project.primary_color,
      accentColor: project.accent_color,
      headline: project.headline,
      subheadline: project.subheadline,
      heroImageUrl: project.hero_image_url,
      sections: Array.isArray(project.sections) ? project.sections : [],
      integrations: Array.isArray(project.integrations) ? project.integrations : [],
      legal: project.legal && typeof project.legal === "object" ? project.legal : {},
      brief: project.brief && typeof project.brief === "object" ? project.brief : {},
      legalProfile: project.legal_profile && typeof project.legal_profile === "object" ? project.legal_profile : {},
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
    const { data: persistedProject, error: persistenceError } = await admin.from("projects").update({
      github_repo_full_name: repo.full_name,
      github_repo_url: repo.html_url,
      github_default_branch: branch,
      github_last_push_at: pushedAt,
      revision: Number(project.revision || 1) + 1,
      updated_by: founder.id,
      updated_at: pushedAt,
    }).eq("id", project.id).eq("revision", project.revision).select("revision").maybeSingle();
    if (persistenceError) throw new Error(persistenceError.message);
    if (!persistedProject) {
      return Response.json({ error: "El proyecto cambió mientras se publicaba. GitHub ya está actualizado; recarga el Studio antes de volver a guardar." }, { status: 409 });
    }
    await admin.from("activity_events").insert({
      actor_id: founder.id,
      action: "publicó",
      entity_type: "project",
      entity_id: project.id,
      entity_name: project.name,
      detail: `Actualizó ${repo.full_name} en GitHub`,
    });

    return Response.json({
      ok: true,
      created,
      repository: { fullName: repo.full_name, url: repo.html_url, branch, private: repo.private },
      pushedAt,
      revision: persistedProject.revision,
      files: Object.keys(files),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo publicar en GitHub." }, { status: 500 });
  }
}
