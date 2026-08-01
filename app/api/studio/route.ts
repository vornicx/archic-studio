import { and, desc, eq } from "drizzle-orm";
import { ensureSchema, getDb } from "../../../db";
import { auditEvents, clients, projects } from "../../../db/schema";
import {
  assessProject,
  type BusinessBrief,
  type GeneratorProject,
  type LegalProfile,
} from "../../../lib/site-generator";

type ClientInput = {
  id?: string;
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

function owner(request: Request) {
  return request.headers.get("oai-authenticated-user-email") ?? "vadim@archic.es";
}

function clean(value: unknown, fallback = "", maxLength = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function jsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function jsonObject(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
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

function auditInput(input: ProjectInput, client?: typeof clients.$inferSelect) {
  return assessProject(client, generatorProject(input));
}

async function seed(email: string) {
  const db = await getDb();
  const existing = await db.select({ id: clients.id }).from(clients).where(eq(clients.ownerEmail, email)).limit(1);
  if (existing.length) return;

  const clientRows = [
    {
      id: crypto.randomUUID(), ownerEmail: email, name: "Sillas Juan y Lola",
      legalName: "Sillas Juan y Lola, S.L.", taxId: "B12345678", email: "info@sillasjuanylola.com",
      phone: "+34 600 123 456", address: "Calle del Comercio, 12", city: "Écija", country: "España", sector: "Eventos y alquiler",
      registryData: "Datos de demostración: completar desde la escritura o nota registral", professionalData: "",
    },
    {
      id: crypto.randomUUID(), ownerEmail: email, name: "Montajes Noguera",
      legalName: "Montajes Noguera", taxId: "45871236R", email: "contacto@montajesnoguera.es",
      phone: "+34 611 842 900", address: "Polígono Industrial La Campiña", city: "Écija", country: "España", sector: "Industria y montajes",
      registryData: "", professionalData: "",
    },
    {
      id: crypto.randomUUID(), ownerEmail: email, name: "Ignacio Ostos Peluquería",
      legalName: "Ignacio Ostos", taxId: "28844119T", email: "hola@ignacioostos.es",
      phone: "+34 622 305 118", address: "Calle Cintería, 8", city: "Écija", country: "España", sector: "Belleza y bienestar",
      registryData: "", professionalData: "",
    },
  ];
  await db.insert(clients).values(clientRows);

  const projectRows = [
    {
      id: crypto.randomUUID(), ownerEmail: email, clientId: clientRows[0].id, name: "Catálogo y alquiler", slug: "sillas-juan-y-lola",
      siteType: "corporate", template: "costa", primaryColor: "#8E1F2F", accentColor: "#C7A35A",
      headline: "Celebraciones con un lugar para cada historia.", subheadline: "Alquiler de mobiliario con una colección versátil y una atención pensada para que organizar sea más sencillo.",
      sectionsJson: JSON.stringify(["hero", "services", "catalog", "about", "contact"]),
      integrationsJson: JSON.stringify(["maps", "whatsapp"]),
      legalJson: JSON.stringify({ privacy: true, legalNotice: true, cookieBanner: true, scriptBlocking: true, formNotices: true, accessibility: true, security: true }),
      briefJson: JSON.stringify({ objective: "Generar solicitudes de presupuesto para eventos", audience: "Parejas, espacios y profesionales que organizan celebraciones en Andalucía", valueProposition: "Mobiliario con carácter, asesoramiento cercano y una logística que simplifica cada montaje", services: ["Alquiler de mobiliario | Mesas, sillas y piezas auxiliares elegidas para cada celebración", "Asesoramiento de colección | Combinaciones coherentes con el espacio, el estilo y el aforo", "Entrega y recogida | Coordinación logística para llegar a tiempo y sin improvisaciones"], differentiators: ["Una colección propia que evita celebraciones intercambiables", "Acompañamiento directo desde la selección hasta la recogida"], tone: "cercano", primaryCta: "Pedir propuesta", aboutStory: "Juan y Lola unen selección, logística y atención personal para que el mobiliario acompañe la celebración sin convertirse en otra preocupación.", proofPoints: ["Colección versátil para interior y exterior", "Montajes coordinados con espacios y proveedores", "Atención local desde Écija"], seoKeywords: ["alquiler mobiliario eventos", "sillas bodas Écija"] }),
      legalProfileJson: JSON.stringify({ dataCategories: "Datos identificativos y de contacto facilitados en el formulario", privacyPurposes: "Responder consultas y preparar presupuestos solicitados", legalBasis: "Medidas precontractuales solicitadas por la persona interesada", retention: "Durante la gestión de la solicitud y, después, durante los plazos necesarios para atender responsabilidades legales", recipients: "Proveedores tecnológicos contratados como encargados; no se prevén cesiones salvo obligación legal", internationalTransfers: "Revisar las garantías de Google Maps antes de publicar", marketing: false, minors: false, specialCategories: false, profiling: false, professionalReview: false, lastReviewedAt: "2026-08-01" }),
      status: "ready", complianceScore: 100,
    },
    {
      id: crypto.randomUUID(), ownerEmail: email, clientId: clientRows[1].id, name: "Web corporativa", slug: "montajes-noguera",
      siteType: "corporate", template: "atlas", primaryColor: "#17232D", accentColor: "#DB8A3C",
      headline: "Estructuras que sostienen grandes ideas.", subheadline: "Montaje industrial, precisión en obra y un equipo que responde cuando el proyecto lo exige.",
      sectionsJson: JSON.stringify(["hero", "services", "projects", "about", "contact"]),
      integrationsJson: JSON.stringify(["maps", "analytics"]),
      legalJson: JSON.stringify({ privacy: true, legalNotice: true, cookieBanner: true, scriptBlocking: true, formNotices: true, accessibility: true, security: true }),
      briefJson: JSON.stringify({ objective: "Captar proyectos industriales cualificados", audience: "Constructoras, ingenierías y responsables de obra que necesitan un equipo de montaje fiable", valueProposition: "Montaje industrial preciso, coordinación en obra y capacidad de respuesta cuando el calendario aprieta", services: ["Montaje industrial | Ejecución coordinada con los equipos y exigencias de cada obra", "Estructuras y cerramientos | Soluciones montadas con control de detalle y seguridad", "Intervenciones programadas | Planificación clara para reducir incidencias y paradas"], differentiators: ["Respuesta técnica y comunicación directa en obra", "Experiencia práctica para anticipar problemas antes del montaje"], tone: "experto", primaryCta: "Estudiar mi proyecto", aboutStory: "Montajes Noguera trabaja desde la experiencia de obra: planificación realista, comunicación con todos los oficios y responsabilidad hasta el último remate.", proofPoints: ["Coordinación con dirección facultativa", "Planificación de hitos y accesos", "Seguimiento hasta la entrega"], seoKeywords: ["montaje industrial Écija", "estructuras Andalucía"] }),
      legalProfileJson: JSON.stringify({ dataCategories: "Datos identificativos, profesionales y de contacto", privacyPurposes: "Atender consultas técnicas y preparar ofertas solicitadas", legalBasis: "Aplicación de medidas precontractuales", retention: "Durante la relación y los plazos legales de responsabilidad posteriores", recipients: "Asesoría y proveedores tecnológicos bajo contrato; administraciones cuando exista obligación legal", internationalTransfers: "Google puede tratar datos fuera del EEE bajo las garantías que deben verificarse en la implantación", marketing: false, minors: false, specialCategories: false, profiling: false, professionalReview: false, lastReviewedAt: "2026-08-01" }),
      status: "ready", complianceScore: 100,
    },
    {
      id: crypto.randomUUID(), ownerEmail: email, clientId: clientRows[2].id, name: "Web y reservas", slug: "ignacio-ostos",
      siteType: "booking", template: "norte", primaryColor: "#111111", accentColor: "#D4A373",
      headline: "Tu estilo empieza con una buena conversación.", subheadline: "Corte, color y cuidado personal desde un espacio pensado para ti.",
      sectionsJson: JSON.stringify(["hero", "services", "gallery", "booking", "contact"]),
      integrationsJson: JSON.stringify(["maps", "instagram", "booking"]),
      legalJson: JSON.stringify({ privacy: true, legalNotice: true, cookieBanner: true, scriptBlocking: false, formNotices: true, accessibility: true, security: true }),
      briefJson: JSON.stringify({ objective: "Convertir visitas en reservas", audience: "Personas de Écija y alrededores que buscan un servicio de peluquería cuidado y personal", valueProposition: "Corte, color y cuidado personal desde una conversación honesta sobre lo que te favorece", services: ["Corte y estilo | Una propuesta adaptada a tu cabello, rutina e identidad", "Color | Técnica y mantenimiento explicados antes de empezar", "Cuidado capilar | Tratamientos seleccionados según el estado real del cabello"], differentiators: ["Escucha antes de proponer", "Criterio técnico sin resultados impersonales"], tone: "cercano", primaryCta: "Reservar una cita", aboutStory: "El salón nace para convertir cada cita en un espacio de confianza, con tiempo para entender lo que buscas y explicar cada decisión.", proofPoints: ["Diagnóstico previo", "Plan de mantenimiento claro", "Atención con cita"], seoKeywords: ["peluquería Écija", "coloración Écija"] }),
      legalProfileJson: JSON.stringify({ dataCategories: "Datos identificativos, de contacto y datos necesarios para gestionar la cita", privacyPurposes: "Responder consultas y gestionar solicitudes de cita", legalBasis: "Medidas precontractuales y ejecución del servicio solicitado", retention: "Mientras se gestiona la cita y durante los plazos legales aplicables", recipients: "Proveedor de reservas y proveedores tecnológicos bajo contrato", internationalTransfers: "Pendiente de verificar con el proveedor definitivo de reservas y Meta", marketing: false, minors: false, specialCategories: false, profiling: false, professionalReview: false, lastReviewedAt: "2026-08-01" }),
      status: "attention", complianceScore: 90,
    },
  ];
  await db.insert(projects).values(projectRows);
  await db.insert(auditEvents).values([
    { id: crypto.randomUUID(), ownerEmail: email, projectId: projectRows[2].id, title: "Integración sin bloqueo previo", detail: "El módulo de reservas debe esperar al consentimiento antes de cargar recursos externos.", severity: "critical", status: "open" },
    { id: crypto.randomUUID(), ownerEmail: email, projectId: projectRows[0].id, title: "Revisar inventario de cookies", detail: "La última auditoría detectó un cambio en Google Maps.", severity: "warning", status: "open" },
    { id: crypto.randomUUID(), ownerEmail: email, projectId: projectRows[1].id, title: "Auditoría superada", detail: "Aviso legal, privacidad, cookies, formularios y accesibilidad verificados.", severity: "success", status: "resolved" },
  ]);
}

async function snapshot(email: string) {
  const db = await getDb();
  const [clientRows, projectRows, auditRows] = await Promise.all([
    db.select().from(clients).where(eq(clients.ownerEmail, email)).orderBy(desc(clients.updatedAt)),
    db.select().from(projects).where(eq(projects.ownerEmail, email)).orderBy(desc(projects.updatedAt)),
    db.select().from(auditEvents).where(eq(auditEvents.ownerEmail, email)).orderBy(desc(auditEvents.createdAt)).limit(50),
  ]);
  return {
    clients: clientRows,
    projects: projectRows.map((row) => ({
      ...row,
      sections: jsonArray(row.sectionsJson),
      integrations: jsonArray(row.integrationsJson),
      legal: jsonObject(row.legalJson),
      brief: jsonObject(row.briefJson),
      legalProfile: jsonObject(row.legalProfileJson),
    })),
    audits: auditRows,
  };
}

export async function GET(request: Request) {
  try {
    const email = owner(request);
    await ensureSchema();
    await seed(email);
    return Response.json(await snapshot(email));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo cargar Archic Studio." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const email = owner(request);
    await ensureSchema();
    const body = await request.json() as { action?: string; client?: ClientInput; project?: ProjectInput; id?: string };
    const db = await getDb();

    let savedProjectId = "";
    if (body.action === "createClient") {
      const input = body.client ?? {};
      if (!clean(input.name)) return Response.json({ error: "El nombre comercial es obligatorio." }, { status: 400 });
      await db.insert(clients).values({
        id: crypto.randomUUID(), ownerEmail: email, name: clean(input.name), legalName: clean(input.legalName),
        taxId: clean(input.taxId), email: clean(input.email), phone: clean(input.phone), address: clean(input.address),
        city: clean(input.city), country: clean(input.country, "España"), sector: clean(input.sector, "Servicios"),
        registryData: clean(input.registryData), professionalData: clean(input.professionalData),
      });
    } else if (body.action === "updateClient") {
      const input = body.client ?? {};
      if (!input.id || !clean(input.name)) return Response.json({ error: "Cliente inválido." }, { status: 400 });
      await db.update(clients).set({
        name: clean(input.name), legalName: clean(input.legalName), taxId: clean(input.taxId),
        email: clean(input.email), phone: clean(input.phone), address: clean(input.address),
        city: clean(input.city), country: clean(input.country, "España"), sector: clean(input.sector, "Servicios"),
        registryData: clean(input.registryData), professionalData: clean(input.professionalData), updatedAt: new Date().toISOString(),
      }).where(and(eq(clients.id, input.id), eq(clients.ownerEmail, email)));
      const [updatedClient] = await db.select().from(clients).where(and(eq(clients.id, input.id), eq(clients.ownerEmail, email))).limit(1);
      const relatedProjects = await db.select().from(projects).where(and(eq(projects.clientId, input.id), eq(projects.ownerEmail, email)));
      for (const row of relatedProjects) {
        const relatedInput: ProjectInput = { ...row, sections: jsonArray(row.sectionsJson), integrations: jsonArray(row.integrationsJson), legal: jsonObject(row.legalJson) as Record<string, boolean>, brief: jsonObject(row.briefJson) as BusinessBrief, legalProfile: jsonObject(row.legalProfileJson) as LegalProfile };
        const audit = auditInput(relatedInput, updatedClient);
        await db.update(projects).set({ complianceScore: audit.score, status: audit.status, updatedAt: new Date().toISOString() }).where(and(eq(projects.id, row.id), eq(projects.ownerEmail, email)));
      }
    } else if (body.action === "createProject") {
      const input = body.project ?? {};
      if (!input.clientId || !clean(input.name)) return Response.json({ error: "Cliente y nombre del proyecto son obligatorios." }, { status: 400 });
      const [client] = await db.select().from(clients).where(and(eq(clients.id, input.clientId), eq(clients.ownerEmail, email))).limit(1);
      if (!client) return Response.json({ error: "Cliente no encontrado." }, { status: 404 });
      const projectId = crypto.randomUUID();
      savedProjectId = projectId;
      const normalized = generatorProject(input);
      const audit = assessProject(client, normalized);
      await db.insert(projects).values({
        id: projectId, ownerEmail: email, clientId: input.clientId, name: clean(input.name), slug: clean(input.slug, "nuevo-proyecto"),
        siteType: normalized.siteType, template: normalized.template,
        primaryColor: normalized.primaryColor, accentColor: normalized.accentColor,
        headline: normalized.headline, subheadline: normalized.subheadline, heroImageUrl: normalized.heroImageUrl,
        sectionsJson: JSON.stringify(normalized.sections), integrationsJson: JSON.stringify(normalized.integrations),
        legalJson: JSON.stringify(normalized.legal), briefJson: JSON.stringify(normalized.brief),
        legalProfileJson: JSON.stringify(normalized.legalProfile), status: audit.status, complianceScore: audit.score,
      });
      const findings = [...audit.blockers, ...audit.warnings];
      if (findings.length) {
        await db.insert(auditEvents).values(findings.map((finding) => ({ id: crypto.randomUUID(), ownerEmail: email, projectId, title: finding.label, detail: finding.detail, severity: finding.severity, status: "open" })));
      }
    } else if (body.action === "updateProject") {
      const input = body.project ?? {};
      if (!input.id || !input.clientId) return Response.json({ error: "Proyecto inválido." }, { status: 400 });
      const [client] = await db.select().from(clients).where(and(eq(clients.id, input.clientId), eq(clients.ownerEmail, email))).limit(1);
      if (!client) return Response.json({ error: "Cliente no encontrado." }, { status: 404 });
      const normalized = generatorProject(input);
      const audit = assessProject(client, normalized);
      savedProjectId = input.id;
      await db.update(projects).set({
        clientId: input.clientId, name: clean(input.name), slug: clean(input.slug), siteType: normalized.siteType,
        template: normalized.template, primaryColor: normalized.primaryColor, accentColor: normalized.accentColor,
        headline: normalized.headline, subheadline: normalized.subheadline, heroImageUrl: normalized.heroImageUrl,
        sectionsJson: JSON.stringify(normalized.sections), integrationsJson: JSON.stringify(normalized.integrations),
        legalJson: JSON.stringify(normalized.legal), briefJson: JSON.stringify(normalized.brief),
        legalProfileJson: JSON.stringify(normalized.legalProfile), status: audit.status,
        complianceScore: audit.score, updatedAt: new Date().toISOString(),
      }).where(and(eq(projects.id, input.id), eq(projects.ownerEmail, email)));
      await db.delete(auditEvents).where(and(eq(auditEvents.projectId, input.id), eq(auditEvents.ownerEmail, email), eq(auditEvents.status, "open")));
      const findings = [...audit.blockers, ...audit.warnings];
      if (findings.length) {
        await db.insert(auditEvents).values(findings.map((finding) => ({ id: crypto.randomUUID(), ownerEmail: email, projectId: input.id!, title: finding.label, detail: finding.detail, severity: finding.severity, status: "open" })));
      }
    } else if (body.action === "runAudit") {
      if (!body.id) return Response.json({ error: "Proyecto inválido." }, { status: 400 });
      const [row] = await db.select().from(projects).where(and(eq(projects.id, body.id), eq(projects.ownerEmail, email))).limit(1);
      if (!row) return Response.json({ error: "Proyecto no encontrado." }, { status: 404 });
      const [client] = await db.select().from(clients).where(and(eq(clients.id, row.clientId), eq(clients.ownerEmail, email))).limit(1);
      const input: ProjectInput = { ...row, sections: jsonArray(row.sectionsJson), integrations: jsonArray(row.integrationsJson), legal: jsonObject(row.legalJson) as Record<string, boolean>, brief: jsonObject(row.briefJson) as BusinessBrief, legalProfile: jsonObject(row.legalProfileJson) as LegalProfile };
      const audit = auditInput(input, client);
      await db.update(projects).set({ complianceScore: audit.score, status: audit.status, updatedAt: new Date().toISOString() }).where(eq(projects.id, row.id));
      await db.delete(auditEvents).where(and(eq(auditEvents.projectId, row.id), eq(auditEvents.ownerEmail, email), eq(auditEvents.status, "open")));
      const findings = [...audit.blockers, ...audit.warnings];
      await db.insert(auditEvents).values(findings.length ? findings.map((finding) => ({
        id: crypto.randomUUID(), ownerEmail: email, projectId: row.id,
        title: finding.label, detail: finding.detail,
        severity: finding.severity, status: "open",
      })) : [{
        id: crypto.randomUUID(), ownerEmail: email, projectId: row.id,
        title: "Auditoría de configuración superada", detail: `No quedan hallazgos en los datos configurados (${audit.score}/100). Falta verificar el despliegue real.`,
        severity: "success", status: "resolved",
      }]);
    } else if (body.action === "deleteProject") {
      if (body.id) await db.delete(projects).where(and(eq(projects.id, body.id), eq(projects.ownerEmail, email)));
    } else {
      return Response.json({ error: "Acción no reconocida." }, { status: 400 });
    }

    return Response.json({ ...(await snapshot(email)), ...(savedProjectId ? { savedProjectId } : {}) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo guardar el cambio." }, { status: 500 });
  }
}
