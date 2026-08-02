import {
  assessProject,
  type BusinessBrief,
  type GeneratorProject,
  type LegalProfile,
} from "./site-generator.ts";

export type StudioClient = {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  sector: string;
  registryData: string;
  professionalData: string;
  status: string;
  revision?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudioProject = {
  id: string;
  clientId: string;
  name: string;
  slug: string;
  siteType: string;
  template: string;
  primaryColor: string;
  accentColor: string;
  headline: string;
  subheadline: string;
  heroImageUrl: string;
  sections: string[];
  integrations: string[];
  legal: Record<string, boolean>;
  brief: BusinessBrief;
  legalProfile: LegalProfile;
  status: string;
  complianceScore: number;
  githubRepoFullName: string;
  githubRepoUrl: string;
  githubDefaultBranch: string;
  githubLastPushAt: string;
  revision?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudioAudit = {
  id: string;
  projectId: string;
  title: string;
  detail: string;
  severity: string;
  status: string;
  createdBy?: string;
  createdAt: string;
};

export type StudioMember = {
  id: string;
  email: string;
  name: string;
  slot: 1 | 2;
  color: string;
  createdAt: string;
};

export type StudioActivity = {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  detail: string;
  createdAt: string;
};

export type StudioData = {
  clients: StudioClient[];
  projects: StudioProject[];
  audits: StudioAudit[];
};

export type StudioActionBody = {
  action?: string;
  client?: Partial<StudioClient>;
  project?: Partial<StudioProject>;
  id?: string;
};

export type StudioActionResult = StudioData & { savedProjectId?: string };

export class StudioActionError extends Error {}

function clean(value: unknown, fallback = "", maxLength = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function stringList(value: unknown, limit = 12) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => clean(item, "", 600))
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function booleanRecord(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, enabled]) => typeof enabled === "boolean"),
  );
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

export function normalizeGeneratorProject(input: Partial<StudioProject>): GeneratorProject {
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

function projectRecord(
  input: Partial<StudioProject>,
  client: StudioClient,
  previous?: StudioProject,
): StudioProject {
  const now = new Date().toISOString();
  const normalized = normalizeGeneratorProject(input);
  const assessment = assessProject(client, normalized);
  return {
    id: previous?.id ?? crypto.randomUUID(),
    clientId: clean(input.clientId, previous?.clientId ?? ""),
    name: clean(input.name, previous?.name ?? ""),
    slug: clean(input.slug, previous?.slug || "nuevo-proyecto"),
    siteType: normalized.siteType,
    template: normalized.template,
    primaryColor: normalized.primaryColor,
    accentColor: normalized.accentColor,
    headline: normalized.headline ?? "",
    subheadline: normalized.subheadline ?? "",
    heroImageUrl: normalized.heroImageUrl ?? "",
    sections: normalized.sections,
    integrations: normalized.integrations,
    legal: normalized.legal,
    brief: normalized.brief ?? {},
    legalProfile: normalized.legalProfile ?? {},
    status: assessment.status,
    complianceScore: assessment.score,
    githubRepoFullName: clean(input.githubRepoFullName, previous?.githubRepoFullName ?? ""),
    githubRepoUrl: clean(input.githubRepoUrl, previous?.githubRepoUrl ?? ""),
    githubDefaultBranch: clean(input.githubDefaultBranch, previous?.githubDefaultBranch || "main"),
    githubLastPushAt: clean(input.githubLastPushAt, previous?.githubLastPushAt ?? ""),
    revision: (previous?.revision ?? 0) + 1,
    createdBy: previous?.createdBy ?? "",
    updatedBy: previous?.updatedBy ?? "",
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}

function clientRecord(
  input: Partial<StudioClient>,
  previous?: StudioClient,
): StudioClient {
  const now = new Date().toISOString();
  return {
    id: previous?.id ?? crypto.randomUUID(),
    name: clean(input.name, previous?.name ?? ""),
    legalName: clean(input.legalName, previous?.legalName ?? ""),
    taxId: clean(input.taxId, previous?.taxId ?? ""),
    email: clean(input.email, previous?.email ?? ""),
    phone: clean(input.phone, previous?.phone ?? ""),
    address: clean(input.address, previous?.address ?? ""),
    city: clean(input.city, previous?.city ?? ""),
    country: clean(input.country, previous?.country || "España"),
    sector: clean(input.sector, previous?.sector || "Servicios"),
    registryData: clean(input.registryData, previous?.registryData ?? ""),
    professionalData: clean(input.professionalData, previous?.professionalData ?? ""),
    status: previous?.status ?? "active",
    revision: (previous?.revision ?? 0) + 1,
    createdBy: previous?.createdBy ?? "",
    updatedBy: previous?.updatedBy ?? "",
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}

function findingAudits(
  project: StudioProject,
  client: StudioClient | undefined,
  includeSuccess = false,
) {
  const assessment = assessProject(client, project);
  const findings = [...assessment.blockers, ...assessment.warnings];
  if (!findings.length && includeSuccess) {
    return [{
      id: crypto.randomUUID(),
      projectId: project.id,
      title: "Auditoría de configuración superada",
      detail: `No quedan hallazgos en los datos configurados (${assessment.score}/100). Falta verificar el despliegue real.`,
      severity: "success",
      status: "resolved",
      createdAt: new Date().toISOString(),
    }];
  }
  return findings.map((finding) => ({
    id: crypto.randomUUID(),
    projectId: project.id,
    title: finding.label,
    detail: finding.detail,
    severity: finding.severity,
    status: "open",
    createdAt: new Date().toISOString(),
  }));
}

function withoutOpenAudits(audits: StudioAudit[], projectIds: Set<string>) {
  return audits.filter(
    (audit) => audit.status !== "open" || !projectIds.has(audit.projectId),
  );
}

export function applyLocalStudioAction(
  source: StudioData,
  body: StudioActionBody,
): StudioActionResult {
  let clients = [...source.clients];
  let projects = [...source.projects];
  let audits = [...source.audits];
  let savedProjectId = "";

  if (body.action === "createClient") {
    if (!clean(body.client?.name)) {
      throw new StudioActionError("El nombre comercial es obligatorio.");
    }
    clients = [clientRecord(body.client ?? {}), ...clients];
  } else if (body.action === "updateClient") {
    const existing = clients.find((client) => client.id === body.client?.id);
    if (!existing || !clean(body.client?.name)) {
      throw new StudioActionError("Cliente inválido.");
    }
    const updated = clientRecord(body.client ?? {}, existing);
    clients = clients.map((client) => client.id === updated.id ? updated : client);
    const relatedIds = new Set(
      projects.filter((project) => project.clientId === updated.id).map((project) => project.id),
    );
    projects = projects.map((project) =>
      relatedIds.has(project.id) ? projectRecord(project, updated, project) : project,
    );
    audits = withoutOpenAudits(audits, relatedIds);
    const refreshed = projects
      .filter((project) => relatedIds.has(project.id))
      .flatMap((project) => findingAudits(project, updated));
    audits = [...refreshed, ...audits];
  } else if (body.action === "createProject") {
    const input = body.project ?? {};
    const client = clients.find((item) => item.id === input.clientId);
    if (!client || !clean(input.name)) {
      throw new StudioActionError("Cliente y nombre del proyecto son obligatorios.");
    }
    const project = projectRecord(input, client);
    savedProjectId = project.id;
    projects = [project, ...projects];
    audits = [...findingAudits(project, client), ...audits];
  } else if (body.action === "updateProject") {
    const existing = projects.find((project) => project.id === body.project?.id);
    const client = clients.find((item) => item.id === body.project?.clientId);
    if (!existing || !client) throw new StudioActionError("Proyecto inválido.");
    const updated = projectRecord(body.project ?? {}, client, existing);
    savedProjectId = updated.id;
    projects = projects.map((project) => project.id === updated.id ? updated : project);
    const projectIds = new Set([updated.id]);
    audits = [...findingAudits(updated, client), ...withoutOpenAudits(audits, projectIds)];
  } else if (body.action === "runAudit") {
    const existing = projects.find((project) => project.id === body.id);
    const client = clients.find((item) => item.id === existing?.clientId);
    if (!existing || !client) throw new StudioActionError("Proyecto no encontrado.");
    const updated = projectRecord(existing, client, existing);
    projects = projects.map((project) => project.id === updated.id ? updated : project);
    const projectIds = new Set([updated.id]);
    audits = [
      ...findingAudits(updated, client, true),
      ...withoutOpenAudits(audits, projectIds),
    ];
  } else if (body.action === "deleteProject") {
    if (body.id) {
      projects = projects.filter((project) => project.id !== body.id);
      audits = audits.filter((audit) => audit.projectId !== body.id);
    }
  } else {
    throw new StudioActionError("Acción no reconocida.");
  }

  return {
    clients,
    projects,
    audits: audits.slice(0, 50),
    ...(savedProjectId ? { savedProjectId } : {}),
  };
}

export function parseLocalStudioData(value: string | null): StudioData | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StudioData>;
    if (!Array.isArray(parsed.clients) || !Array.isArray(parsed.projects) || !Array.isArray(parsed.audits)) {
      return null;
    }
    return {
      clients: parsed.clients.slice(0, 200) as StudioClient[],
      projects: parsed.projects.slice(0, 500) as StudioProject[],
      audits: parsed.audits.slice(0, 50) as StudioAudit[],
    };
  } catch {
    return null;
  }
}

export function createEmptyStudioData(): StudioData {
  return { clients: [], projects: [], audits: [] };
}
