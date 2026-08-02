import type { SupabaseClient } from "@supabase/supabase-js";
import { getFounder, type Founder } from "../../../lib/founder-auth";
import {
  assessProject,
  type BusinessBrief,
  type GeneratorProject,
  type LegalProfile,
} from "../../../lib/site-generator";
import { createAdminSupabase } from "../../../lib/supabase/server";

type ClientInput = {
  id?: string;
  revision?: number;
  name?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  sector?: string;
  registryData?: string;
  professionalData?: string;
};

type ProjectInput = {
  id?: string;
  revision?: number;
  clientId?: string;
  name?: string;
  slug?: string;
  siteType?: string;
  template?: string;
  primaryColor?: string;
  accentColor?: string;
  headline?: string;
  subheadline?: string;
  heroImageUrl?: string;
  sections?: string[];
  integrations?: string[];
  legal?: Record<string, boolean>;
  brief?: BusinessBrief;
  legalProfile?: LegalProfile;
  status?: string;
};

type ClientRow = {
  id: string;
  name: string;
  legal_name: string;
  tax_id: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  sector: string;
  registry_data: string;
  professional_data: string;
  status: string;
  revision: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectRow = {
  id: string;
  client_id: string;
  name: string;
  slug: string;
  site_type: string;
  template: string;
  primary_color: string;
  accent_color: string;
  headline: string;
  subheadline: string;
  hero_image_url: string;
  sections: unknown;
  integrations: unknown;
  legal: unknown;
  brief: unknown;
  legal_profile: unknown;
  status: string;
  compliance_score: number;
  github_repo_full_name: string;
  github_repo_url: string;
  github_default_branch: string;
  github_last_push_at: string | null;
  revision: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function clean(value: unknown, fallback = "", maxLength = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function stringList(value: unknown, limit = 12) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => clean(item, "", 600)).filter(Boolean).slice(0, limit)
    : [];
}

function booleanRecord(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).filter(([, enabled]) => typeof enabled === "boolean"));
}

function objectValue<T extends object>(value: unknown): T {
  return value && typeof value === "object" && !Array.isArray(value) ? value as T : {} as T;
}

function cleanBrief(value: BusinessBrief | undefined): BusinessBrief {
  return {
    objective: clean(value?.objective),
    audience: clean(value?.audience),
    valueProposition: clean(value?.valueProposition),
    services: stringList(value?.services),
    differentiators: stringList(value?.differentiators, 8),
    tone: clean(value?.tone, "natural", 40),
    primaryCta: clean(value?.primaryCta, "", 120),
    aboutStory: clean(value?.aboutStory),
    proofPoints: stringList(value?.proofPoints, 8),
    seoKeywords: stringList(value?.seoKeywords, 20),
  };
}

function cleanLegalProfile(value: LegalProfile | undefined): LegalProfile {
  return {
    dataCategories: clean(value?.dataCategories),
    privacyPurposes: clean(value?.privacyPurposes),
    legalBasis: clean(value?.legalBasis),
    retention: clean(value?.retention),
    recipients: clean(value?.recipients),
    internationalTransfers: clean(value?.internationalTransfers),
    dpoEmail: clean(value?.dpoEmail, "", 320),
    marketing: Boolean(value?.marketing),
    minors: Boolean(value?.minors),
    specialCategories: Boolean(value?.specialCategories),
    profiling: Boolean(value?.profiling),
    professionalReview: Boolean(value?.professionalReview),
    paymentMethods: clean(value?.paymentMethods),
    deliveryTerms: clean(value?.deliveryTerms),
    returnCosts: clean(value?.returnCosts),
    withdrawalInfo: clean(value?.withdrawalInfo),
    lastReviewedAt: clean(value?.lastReviewedAt, "", 40),
  };
}

function generatorProject(input: ProjectInput): GeneratorProject {
  return {
    name: clean(input.name),
    slug: clean(input.slug),
    siteType: clean(input.siteType, "corporate"),
    template: clean(input.template, "costa"),
    primaryColor: clean(input.primaryColor, "#0B1628"),
    accentColor: clean(input.accentColor, "#B7924C"),
    headline: clean(input.headline),
    subheadline: clean(input.subheadline),
    heroImageUrl: clean(input.heroImageUrl),
    sections: stringList(input.sections, 20),
    integrations: stringList(input.integrations, 20),
    legal: booleanRecord(input.legal),
    brief: cleanBrief(input.brief),
    legalProfile: cleanLegalProfile(input.legalProfile),
  };
}

function mapClient(row: ClientRow) {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    taxId: row.tax_id,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    country: row.country,
    sector: row.sector,
    registryData: row.registry_data,
    professionalData: row.professional_data,
    status: row.status,
    revision: row.revision,
    createdBy: row.created_by ?? "",
    updatedBy: row.updated_by ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProject(row: ProjectRow) {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    slug: row.slug,
    siteType: row.site_type,
    template: row.template,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    headline: row.headline,
    subheadline: row.subheadline,
    heroImageUrl: row.hero_image_url,
    sections: stringList(row.sections, 20),
    integrations: stringList(row.integrations, 20),
    legal: booleanRecord(row.legal),
    brief: objectValue<BusinessBrief>(row.brief),
    legalProfile: objectValue<LegalProfile>(row.legal_profile),
    status: row.status,
    complianceScore: row.compliance_score,
    githubRepoFullName: row.github_repo_full_name,
    githubRepoUrl: row.github_repo_url,
    githubDefaultBranch: row.github_default_branch,
    githubLastPushAt: row.github_last_push_at ?? "",
    revision: row.revision,
    createdBy: row.created_by ?? "",
    updatedBy: row.updated_by ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function projectInputFromRow(row: ProjectRow): ProjectInput {
  const mapped = mapProject(row);
  return {
    ...mapped,
    brief: mapped.brief,
    legalProfile: mapped.legalProfile,
  };
}

function clientValues(input: ClientInput) {
  return {
    name: clean(input.name),
    legal_name: clean(input.legalName),
    tax_id: clean(input.taxId),
    email: clean(input.email, "", 320),
    phone: clean(input.phone, "", 120),
    address: clean(input.address),
    city: clean(input.city, "", 240),
    country: clean(input.country, "España", 240),
    sector: clean(input.sector, "Servicios", 240),
    registry_data: clean(input.registryData),
    professional_data: clean(input.professionalData),
  };
}

function projectValues(input: ProjectInput) {
  const normalized = generatorProject(input);
  return {
    normalized,
    values: {
      client_id: clean(input.clientId),
      name: clean(input.name),
      slug: clean(input.slug, "nuevo-proyecto", 160),
      site_type: normalized.siteType,
      template: normalized.template,
      primary_color: normalized.primaryColor,
      accent_color: normalized.accentColor,
      headline: normalized.headline,
      subheadline: normalized.subheadline,
      hero_image_url: normalized.heroImageUrl,
      sections: normalized.sections,
      integrations: normalized.integrations,
      legal: normalized.legal,
      brief: normalized.brief,
      legal_profile: normalized.legalProfile,
    },
  };
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

function databaseError(error: { message: string; code?: string } | null, fallback: string) {
  if (!error) return;
  if (error.code === "42P01" || error.code === "PGRST205") {
    throw new HttpError("La base compartida de Archic Studio aún no está inicializada.", 503);
  }
  throw new Error(`${fallback}: ${error.message}`);
}

async function snapshot(admin: SupabaseClient) {
  const [clientResult, projectResult, auditResult, memberResult, activityResult] = await Promise.all([
    admin.from("clients").select("*").order("updated_at", { ascending: false }),
    admin.from("projects").select("*").order("updated_at", { ascending: false }),
    admin.from("audit_events").select("*").order("created_at", { ascending: false }).limit(60),
    admin.from("studio_members").select("user_id,email,display_name,slot,color,created_at").order("slot"),
    admin.from("activity_events").select("id,actor_id,action,entity_type,entity_id,entity_name,detail,created_at").order("created_at", { ascending: false }).limit(40),
  ]);
  databaseError(clientResult.error, "No se pudieron cargar los clientes");
  databaseError(projectResult.error, "No se pudieron cargar los proyectos");
  databaseError(auditResult.error, "No se pudieron cargar las auditorías");
  databaseError(memberResult.error, "No se pudo cargar el equipo");
  databaseError(activityResult.error, "No se pudo cargar la actividad");

  return {
    clients: (clientResult.data as ClientRow[]).map(mapClient),
    projects: (projectResult.data as ProjectRow[]).map(mapProject),
    audits: (auditResult.data ?? []).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      detail: row.detail,
      severity: row.severity,
      status: row.status,
      createdBy: row.created_by ?? "",
      createdAt: row.created_at,
    })),
    members: (memberResult.data ?? []).map((row) => ({
      id: row.user_id,
      email: row.email,
      name: row.display_name,
      slot: row.slot,
      color: row.color,
      createdAt: row.created_at,
    })),
    activities: (activityResult.data ?? []).map((row) => ({
      id: row.id,
      actorId: row.actor_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id ?? "",
      entityName: row.entity_name,
      detail: row.detail,
      createdAt: row.created_at,
    })),
    storageMode: "shared" as const,
  };
}

async function recordActivity(
  admin: SupabaseClient,
  founder: Founder,
  action: string,
  entityType: string,
  entityId: string,
  entityName: string,
  detail: string,
) {
  const { error } = await admin.from("activity_events").insert({
    actor_id: founder.id,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    entity_name: clean(entityName, "", 240),
    detail: clean(detail, "", 500),
  });
  databaseError(error, "No se pudo registrar la actividad");
}

async function replaceProjectAudits(
  admin: SupabaseClient,
  founder: Founder,
  projectId: string,
  assessment: ReturnType<typeof assessProject>,
  includeSuccess = false,
) {
  const { error: deleteError } = await admin
    .from("audit_events")
    .delete()
    .eq("project_id", projectId)
    .eq("status", "open");
  databaseError(deleteError, "No se pudieron actualizar las auditorías");

  const findings = [...assessment.blockers, ...assessment.warnings];
  const rows: Array<{
    project_id: string;
    title: string;
    detail: string;
    severity: string;
    status: string;
    created_by: string;
  }> = findings.map((finding) => ({
    project_id: projectId,
    title: finding.label,
    detail: finding.detail,
    severity: finding.severity,
    status: "open",
    created_by: founder.id,
  }));
  if (!rows.length && includeSuccess) {
    rows.push({
      project_id: projectId,
      title: "Auditoría de configuración superada",
      detail: `No quedan hallazgos en los datos configurados (${assessment.score}/100). Falta verificar el despliegue real.`,
      severity: "success",
      status: "resolved",
      created_by: founder.id,
    });
  }
  if (rows.length) {
    const { error } = await admin.from("audit_events").insert(rows);
    databaseError(error, "No se pudieron registrar los hallazgos");
  }
}

async function authenticatedContext() {
  const founder = await getFounder();
  if (!founder) throw new HttpError("Inicia sesión con una cuenta de fundador.", 401);
  return { founder, admin: createAdminSupabase() };
}

export async function GET() {
  try {
    const { admin } = await authenticatedContext();
    return Response.json(await snapshot(admin), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo cargar Archic Studio." }, { status });
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new HttpError("Solicitud rechazada.", 403);
    const { founder, admin } = await authenticatedContext();
    const body = await request.json() as { action?: string; client?: ClientInput; project?: ProjectInput; id?: string };
    let savedProjectId = "";

    if (body.action === "createClient") {
      const input = body.client ?? {};
      if (!clean(input.name)) throw new HttpError("El nombre comercial es obligatorio.", 400);
      const { data, error } = await admin.from("clients").insert({
        ...clientValues(input),
        created_by: founder.id,
        updated_by: founder.id,
      }).select("id,name").single();
      databaseError(error, "No se pudo crear el cliente");
      if (!data) throw new Error("La base no devolvió el cliente creado.");
      await recordActivity(admin, founder, "creó", "client", data.id, data.name, "Añadió un trabajo real al Studio");
    } else if (body.action === "updateClient") {
      const input = body.client ?? {};
      if (!input.id || !clean(input.name)) throw new HttpError("Cliente inválido.", 400);
      const revision = Number.isInteger(input.revision) ? Number(input.revision) : 1;
      const { data, error } = await admin.from("clients").update({
        ...clientValues(input),
        revision: revision + 1,
        updated_by: founder.id,
        updated_at: new Date().toISOString(),
      }).eq("id", input.id).eq("revision", revision).select("*").maybeSingle();
      databaseError(error, "No se pudo actualizar el cliente");
      if (!data) throw new HttpError("El otro fundador ha actualizado este cliente. Recargamos la versión más reciente para que no pierdas cambios.", 409);

      const updatedClient = mapClient(data as ClientRow);
      const { data: related, error: relatedError } = await admin.from("projects").select("*").eq("client_id", input.id);
      databaseError(relatedError, "No se pudieron revisar los proyectos del cliente");
      for (const row of (related ?? []) as ProjectRow[]) {
        const projectInput = projectInputFromRow(row);
        const assessment = assessProject(updatedClient, generatorProject(projectInput));
        const { error: projectError } = await admin.from("projects").update({
          compliance_score: assessment.score,
          status: assessment.status,
          revision: row.revision + 1,
          updated_by: founder.id,
          updated_at: new Date().toISOString(),
        }).eq("id", row.id).eq("revision", row.revision);
        databaseError(projectError, "No se pudo recalcular el proyecto");
        await replaceProjectAudits(admin, founder, row.id, assessment);
      }
      await recordActivity(admin, founder, "actualizó", "client", input.id, updatedClient.name, "Actualizó la ficha comercial o legal");
    } else if (body.action === "createProject") {
      const input = body.project ?? {};
      if (!input.clientId || !clean(input.name)) throw new HttpError("Cliente y nombre del proyecto son obligatorios.", 400);
      const { data: clientRow, error: clientError } = await admin.from("clients").select("*").eq("id", input.clientId).maybeSingle();
      databaseError(clientError, "No se pudo comprobar el cliente");
      if (!clientRow) throw new HttpError("Cliente no encontrado.", 404);
      const { normalized, values } = projectValues(input);
      const assessment = assessProject(mapClient(clientRow as ClientRow), normalized);
      const { data, error } = await admin.from("projects").insert({
        ...values,
        status: assessment.status,
        compliance_score: assessment.score,
        created_by: founder.id,
        updated_by: founder.id,
      }).select("id,name").single();
      databaseError(error, "No se pudo crear el proyecto");
      if (!data) throw new Error("La base no devolvió el proyecto creado.");
      savedProjectId = data.id;
      await replaceProjectAudits(admin, founder, data.id, assessment);
      await recordActivity(admin, founder, "creó", "project", data.id, data.name, "Inició un nuevo proyecto real");
    } else if (body.action === "updateProject") {
      const input = body.project ?? {};
      if (!input.id || !input.clientId) throw new HttpError("Proyecto inválido.", 400);
      const { data: clientRow, error: clientError } = await admin.from("clients").select("*").eq("id", input.clientId).maybeSingle();
      databaseError(clientError, "No se pudo comprobar el cliente");
      if (!clientRow) throw new HttpError("Cliente no encontrado.", 404);
      const revision = Number.isInteger(input.revision) ? Number(input.revision) : 1;
      const { normalized, values } = projectValues(input);
      const assessment = assessProject(mapClient(clientRow as ClientRow), normalized);
      const { data, error } = await admin.from("projects").update({
        ...values,
        status: assessment.status,
        compliance_score: assessment.score,
        revision: revision + 1,
        updated_by: founder.id,
        updated_at: new Date().toISOString(),
      }).eq("id", input.id).eq("revision", revision).select("id,name").maybeSingle();
      databaseError(error, "No se pudo guardar el proyecto");
      if (!data) throw new HttpError("El otro fundador ha guardado una versión más reciente. Recargamos sus cambios antes de continuar.", 409);
      savedProjectId = data.id;
      await replaceProjectAudits(admin, founder, data.id, assessment);
      await recordActivity(admin, founder, "editó", "project", data.id, data.name, "Guardó una nueva revisión del proyecto");
    } else if (body.action === "runAudit") {
      if (!body.id) throw new HttpError("Proyecto inválido.", 400);
      const { data: row, error } = await admin.from("projects").select("*").eq("id", body.id).maybeSingle();
      databaseError(error, "No se pudo cargar el proyecto");
      if (!row) throw new HttpError("Proyecto no encontrado.", 404);
      const projectRow = row as ProjectRow;
      const { data: clientRow, error: clientError } = await admin.from("clients").select("*").eq("id", projectRow.client_id).maybeSingle();
      databaseError(clientError, "No se pudo cargar el cliente");
      if (!clientRow) throw new HttpError("Cliente no encontrado.", 404);
      const assessment = assessProject(mapClient(clientRow as ClientRow), generatorProject(projectInputFromRow(projectRow)));
      const { error: updateError } = await admin.from("projects").update({
        compliance_score: assessment.score,
        status: assessment.status,
        revision: projectRow.revision + 1,
        updated_by: founder.id,
        updated_at: new Date().toISOString(),
      }).eq("id", body.id).eq("revision", projectRow.revision);
      databaseError(updateError, "No se pudo guardar la auditoría");
      await replaceProjectAudits(admin, founder, body.id, assessment, true);
      await recordActivity(admin, founder, "auditó", "project", body.id, projectRow.name, `Resultado ${assessment.score}/100`);
    } else if (body.action === "deleteProject") {
      if (!body.id) throw new HttpError("Proyecto inválido.", 400);
      const { data: project, error: readError } = await admin.from("projects").select("id,name").eq("id", body.id).maybeSingle();
      databaseError(readError, "No se pudo comprobar el proyecto");
      if (!project) throw new HttpError("Proyecto no encontrado.", 404);
      const { error } = await admin.from("projects").delete().eq("id", body.id);
      databaseError(error, "No se pudo eliminar el proyecto");
      await recordActivity(admin, founder, "eliminó", "project", project.id, project.name, "Retiró el proyecto del espacio compartido");
    } else {
      throw new HttpError("Acción no reconocida.", 400);
    }

    return Response.json({ ...(await snapshot(admin)), ...(savedProjectId ? { savedProjectId } : {}) }, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo guardar el cambio." }, { status });
  }
}
