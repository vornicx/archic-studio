import {
  assessProject,
  type BusinessBrief,
  type GeneratorProject,
  type LegalProfile,
} from "./site-generator.ts";

export const LOCAL_STUDIO_STORAGE_VERSION = "archic-studio:v1";

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

function demoProject(
  values: Partial<StudioProject> & Pick<StudioProject, "id" | "clientId" | "name" | "slug">,
  createdAt: string,
): StudioProject {
  return {
    siteType: "corporate",
    template: "costa",
    primaryColor: "#0B1628",
    accentColor: "#B7924C",
    headline: "",
    subheadline: "",
    heroImageUrl: "",
    sections: ["hero", "services", "about", "contact"],
    integrations: ["maps", "whatsapp"],
    legal: {
      privacy: true,
      legalNotice: true,
      cookieBanner: true,
      scriptBlocking: true,
      formNotices: true,
      accessibility: true,
      security: true,
    },
    brief: {},
    legalProfile: {},
    status: "ready",
    complianceScore: 100,
    githubRepoFullName: "",
    githubRepoUrl: "",
    githubDefaultBranch: "main",
    githubLastPushAt: "",
    createdAt,
    updatedAt: createdAt,
    ...values,
  };
}

export function createDemoStudioData(): StudioData {
  const createdAt = new Date().toISOString();
  const clients: StudioClient[] = [
    {
      id: "demo-client-sillas",
      name: "Sillas Juan y Lola",
      legalName: "Sillas Juan y Lola, S.L.",
      taxId: "B12345678",
      email: "info@sillasjuanylola.com",
      phone: "+34 600 123 456",
      address: "Calle del Comercio, 12",
      city: "Écija",
      country: "España",
      sector: "Eventos y alquiler",
      registryData: "Datos de demostración: completar desde la escritura o nota registral",
      professionalData: "",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "demo-client-montajes",
      name: "Montajes Noguera",
      legalName: "Montajes Noguera",
      taxId: "45871236R",
      email: "contacto@montajesnoguera.es",
      phone: "+34 611 842 900",
      address: "Polígono Industrial La Campiña",
      city: "Écija",
      country: "España",
      sector: "Industria y montajes",
      registryData: "",
      professionalData: "",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "demo-client-peluqueria",
      name: "Ignacio Ostos Peluquería",
      legalName: "Ignacio Ostos",
      taxId: "28844119T",
      email: "hola@ignacioostos.es",
      phone: "+34 622 305 118",
      address: "Calle Cintería, 8",
      city: "Écija",
      country: "España",
      sector: "Belleza y bienestar",
      registryData: "",
      professionalData: "",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const projects: StudioProject[] = [
    demoProject({
      id: "demo-project-sillas",
      clientId: clients[0].id,
      name: "Catálogo y alquiler",
      slug: "sillas-juan-y-lola",
      primaryColor: "#8E1F2F",
      accentColor: "#C7A35A",
      headline: "Celebraciones con un lugar para cada historia.",
      subheadline: "Alquiler de mobiliario con una colección versátil y una atención pensada para que organizar sea más sencillo.",
      sections: ["hero", "services", "catalog", "about", "contact"],
      brief: {
        objective: "Generar solicitudes de presupuesto para eventos",
        audience: "Parejas, espacios y profesionales que organizan celebraciones en Andalucía",
        valueProposition: "Mobiliario con carácter, asesoramiento cercano y una logística que simplifica cada montaje",
        services: ["Alquiler de mobiliario | Mesas, sillas y piezas auxiliares elegidas para cada celebración", "Asesoramiento de colección | Combinaciones coherentes con el espacio, el estilo y el aforo", "Entrega y recogida | Coordinación logística para llegar a tiempo y sin improvisaciones"],
        differentiators: ["Una colección propia que evita celebraciones intercambiables", "Acompañamiento directo desde la selección hasta la recogida"],
        tone: "cercano",
        primaryCta: "Pedir propuesta",
        aboutStory: "Juan y Lola unen selección, logística y atención personal para que el mobiliario acompañe la celebración sin convertirse en otra preocupación.",
        proofPoints: ["Colección versátil para interior y exterior", "Montajes coordinados con espacios y proveedores", "Atención local desde Écija"],
        seoKeywords: ["alquiler mobiliario eventos", "sillas bodas Écija"],
      },
      legalProfile: {
        dataCategories: "Datos identificativos y de contacto facilitados en el formulario",
        privacyPurposes: "Responder consultas y preparar presupuestos solicitados",
        legalBasis: "Medidas precontractuales solicitadas por la persona interesada",
        retention: "Durante la gestión de la solicitud y los plazos legales posteriores",
        recipients: "Proveedores tecnológicos contratados como encargados; no se prevén cesiones salvo obligación legal",
        internationalTransfers: "Revisar las garantías de Google Maps antes de publicar",
        lastReviewedAt: "2026-08-01",
      },
    }, createdAt),
    demoProject({
      id: "demo-project-montajes",
      clientId: clients[1].id,
      name: "Web corporativa",
      slug: "montajes-noguera",
      template: "atlas",
      primaryColor: "#17232D",
      accentColor: "#DB8A3C",
      headline: "Estructuras que sostienen grandes ideas.",
      subheadline: "Montaje industrial, precisión en obra y un equipo que responde cuando el proyecto lo exige.",
      sections: ["hero", "services", "projects", "about", "contact"],
      integrations: ["maps", "analytics"],
      brief: {
        objective: "Captar proyectos industriales cualificados",
        audience: "Constructoras, ingenierías y responsables de obra que necesitan un equipo de montaje fiable",
        valueProposition: "Montaje industrial preciso, coordinación en obra y capacidad de respuesta cuando el calendario aprieta",
        services: ["Montaje industrial | Ejecución coordinada con los equipos y exigencias de cada obra", "Estructuras y cerramientos | Soluciones montadas con control de detalle y seguridad", "Intervenciones programadas | Planificación clara para reducir incidencias y paradas"],
        differentiators: ["Respuesta técnica y comunicación directa en obra", "Experiencia práctica para anticipar problemas antes del montaje"],
        tone: "experto",
        primaryCta: "Estudiar mi proyecto",
        aboutStory: "Montajes Noguera trabaja desde la experiencia de obra: planificación realista, comunicación con todos los oficios y responsabilidad hasta el último remate.",
        proofPoints: ["Coordinación con dirección facultativa", "Planificación de hitos y accesos", "Seguimiento hasta la entrega"],
        seoKeywords: ["montaje industrial Écija", "estructuras Andalucía"],
      },
      legalProfile: {
        dataCategories: "Datos identificativos, profesionales y de contacto",
        privacyPurposes: "Atender consultas técnicas y preparar ofertas solicitadas",
        legalBasis: "Aplicación de medidas precontractuales",
        retention: "Durante la relación y los plazos legales de responsabilidad posteriores",
        recipients: "Asesoría y proveedores tecnológicos bajo contrato; administraciones cuando exista obligación legal",
        internationalTransfers: "Google puede tratar datos fuera del EEE bajo garantías que deben verificarse en la implantación",
        lastReviewedAt: "2026-08-01",
      },
    }, createdAt),
    demoProject({
      id: "demo-project-peluqueria",
      clientId: clients[2].id,
      name: "Web y reservas",
      slug: "ignacio-ostos",
      siteType: "booking",
      template: "norte",
      primaryColor: "#111111",
      accentColor: "#D4A373",
      headline: "Tu estilo empieza con una buena conversación.",
      subheadline: "Corte, color y cuidado personal desde un espacio pensado para ti.",
      sections: ["hero", "services", "gallery", "booking", "contact"],
      integrations: ["maps", "instagram", "booking"],
      legal: {
        privacy: true,
        legalNotice: true,
        cookieBanner: true,
        scriptBlocking: false,
        formNotices: true,
        accessibility: true,
        security: true,
      },
      brief: {
        objective: "Convertir visitas en reservas",
        audience: "Personas de Écija y alrededores que buscan un servicio de peluquería cuidado y personal",
        valueProposition: "Corte, color y cuidado personal desde una conversación honesta sobre lo que te favorece",
        services: ["Corte y estilo | Una propuesta adaptada a tu cabello, rutina e identidad", "Color | Técnica y mantenimiento explicados antes de empezar", "Cuidado capilar | Tratamientos seleccionados según el estado real del cabello"],
        differentiators: ["Escucha antes de proponer", "Criterio técnico sin resultados impersonales"],
        tone: "cercano",
        primaryCta: "Reservar una cita",
        aboutStory: "El salón nace para convertir cada cita en un espacio de confianza, con tiempo para entender lo que buscas y explicar cada decisión.",
        proofPoints: ["Diagnóstico previo", "Plan de mantenimiento claro", "Atención con cita"],
        seoKeywords: ["peluquería Écija", "coloración Écija"],
      },
      legalProfile: {
        dataCategories: "Datos identificativos, de contacto y necesarios para gestionar la cita",
        privacyPurposes: "Responder consultas y gestionar solicitudes de cita",
        legalBasis: "Medidas precontractuales y ejecución del servicio solicitado",
        retention: "Mientras se gestiona la cita y durante los plazos legales aplicables",
        recipients: "Proveedor de reservas y proveedores tecnológicos bajo contrato",
        internationalTransfers: "Pendiente de verificar con el proveedor definitivo de reservas y Meta",
        lastReviewedAt: "2026-08-01",
      },
      status: "attention",
      complianceScore: 90,
    }, createdAt),
  ];

  return {
    clients,
    projects,
    audits: [
      { id: "demo-audit-booking", projectId: projects[2].id, title: "Integración sin bloqueo previo", detail: "El módulo de reservas debe esperar al consentimiento antes de cargar recursos externos.", severity: "critical", status: "open", createdAt },
      { id: "demo-audit-cookies", projectId: projects[0].id, title: "Revisar inventario de cookies", detail: "La última auditoría detectó un cambio en Google Maps.", severity: "warning", status: "open", createdAt },
      { id: "demo-audit-pass", projectId: projects[1].id, title: "Auditoría superada", detail: "Aviso legal, privacidad, cookies, formularios y accesibilidad verificados.", severity: "success", status: "resolved", createdAt },
    ],
  };
}
