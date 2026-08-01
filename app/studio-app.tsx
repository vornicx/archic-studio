"use client";

import {
  Accessibility,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Cookie,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FolderKanban,
  Globe2,
  GitBranch as Github,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  Monitor,
  PanelsTopLeft,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  assessProject,
  buildWebsiteHtml,
  INTEGRATION_CATALOG,
  legalDocument,
  SITE_TEMPLATES,
  type BusinessBrief,
  type LegalProfile,
} from "../lib/site-generator";

type Client = {
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

type Project = {
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

type Audit = {
  id: string;
  projectId: string;
  title: string;
  detail: string;
  severity: string;
  status: string;
  createdAt: string;
};

type StudioData = { clients: Client[]; projects: Project[]; audits: Audit[] };
type Tab = "dashboard" | "projects" | "clients" | "compliance" | "templates" | "settings";

type ProjectDraft = Omit<Project, "id" | "complianceScore" | "createdAt" | "updatedAt"> & { id?: string };
type StudioPayload = StudioData & { savedProjectId?: string };
type GithubStatus = { connected: boolean; owner?: string; user?: { login: string; name?: string; avatar_url?: string; html_url: string }; reason?: string; error?: string };

const EMPTY_DATA: StudioData = { clients: [], projects: [], audits: [] };

const NAV_ITEMS = [
  { id: "dashboard" as Tab, label: "Inicio", icon: LayoutDashboard },
  { id: "projects" as Tab, label: "Proyectos", icon: FolderKanban },
  { id: "clients" as Tab, label: "Clientes", icon: Users },
  { id: "compliance" as Tab, label: "Cumplimiento", icon: ShieldCheck },
  { id: "templates" as Tab, label: "Plantillas", icon: PanelsTopLeft },
  { id: "settings" as Tab, label: "Ajustes", icon: Settings2 },
];

const SECTION_OPTIONS = [
  { id: "hero", label: "Portada", description: "Propuesta de valor y acción principal" },
  { id: "services", label: "Servicios", description: "Oferta organizada por áreas" },
  { id: "catalog", label: "Catálogo", description: "Productos o servicios visuales" },
  { id: "projects", label: "Proyectos", description: "Casos de trabajo anteriores" },
  { id: "gallery", label: "Galería", description: "Imágenes y trabajos destacados" },
  { id: "about", label: "Sobre nosotros", description: "Historia, equipo y confianza" },
  { id: "booking", label: "Reservas", description: "Solicitud de cita o disponibilidad" },
  { id: "contact", label: "Contacto", description: "Formulario con capa informativa" },
];

const INTEGRATIONS = INTEGRATION_CATALOG;

const LEGAL_CONTROLS = [
  { id: "legalNotice", label: "Aviso legal", icon: FileText },
  { id: "privacy", label: "Política de privacidad", icon: LockKeyhole },
  { id: "cookieBanner", label: "Gestor de consentimiento", icon: Cookie },
  { id: "scriptBlocking", label: "Bloqueo previo de scripts", icon: Code2 },
  { id: "formNotices", label: "Capas informativas en formularios", icon: FileCheck2 },
  { id: "accessibility", label: "Base de accesibilidad", icon: Accessibility },
  { id: "security", label: "Seguridad y minimización", icon: ShieldCheck },
  { id: "terms", label: "Condiciones de contratación", icon: FileText, ecommerce: true },
  { id: "returns", label: "Desistimiento y devoluciones", icon: FileText, ecommerce: true },
];

const TEMPLATES = SITE_TEMPLATES;

const DEFAULT_DRAFT: ProjectDraft = {
  clientId: "",
  name: "",
  slug: "",
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
    legalNotice: true,
    privacy: true,
    cookieBanner: true,
    scriptBlocking: true,
    formNotices: true,
    accessibility: true,
    security: true,
    terms: false,
    returns: false,
  },
  brief: {
    objective: "",
    audience: "",
    valueProposition: "",
    services: [],
    differentiators: [],
    tone: "cercano",
    primaryCta: "",
    aboutStory: "",
    proofPoints: [],
    seoKeywords: [],
  },
  legalProfile: {
    dataCategories: "",
    privacyPurposes: "",
    legalBasis: "",
    retention: "",
    recipients: "",
    internationalTransfers: "",
    dpoEmail: "",
    marketing: false,
    minors: false,
    specialCategories: false,
    profiling: false,
    professionalReview: false,
    paymentMethods: "",
    deliveryTerms: "",
    returnCosts: "",
    withdrawalInfo: "",
    lastReviewedAt: "",
  },
  status: "draft",
  githubRepoFullName: "",
  githubRepoUrl: "",
  githubDefaultBranch: "main",
  githubLastPushAt: "",
};

const STATUS_LABELS: Record<string, string> = {
  ready: "Listo para publicar",
  review: "En revisión",
  attention: "Requiere atención",
  draft: "Borrador",
  active: "Activo",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Hoy";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function splitLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function joinLines(value?: string[]) {
  return (value ?? []).join("\n");
}

function getClient(project: Project | ProjectDraft, clients: Client[]) {
  return clients.find((client) => client.id === project.clientId);
}

function downloadText(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status status-${status}`}><i />{STATUS_LABELS[status] || status}</span>;
}

function ScoreRing({ score, small = false }: { score: number; small?: boolean }) {
  return (
    <div className={`score-ring ${small ? "score-ring-small" : ""}`} style={{ "--score": score } as React.CSSProperties} aria-label={`Cumplimiento ${score}%`}>
      <div><strong>{score}</strong><span>%</span></div>
    </div>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-mark"><FolderKanban size={27} /></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

export default function StudioApp({ user }: { user: { email: string; name: string } }) {
  const [data, setData] = useState<StudioData>(EMPTY_DATA);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [projectModal, setProjectModal] = useState<{ open: boolean; project?: Project }>({ open: false });
  const [clientModal, setClientModal] = useState<{ open: boolean; client?: Client }>({ open: false });
  const [mobileNav, setMobileNav] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/studio", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "No se pudo cargar el estudio.");
        if (active) setData(payload);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "No se pudo cargar el estudio.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setProjectModal({ open: false });
        setClientModal({ open: false });
        setMobileNav(false);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const action = async (body: unknown) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/studio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as StudioPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar el cambio.");
      setData(payload);
      return payload;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el cambio.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return data.projects;
    return data.projects.filter((project) => {
      const client = getClient(project, data.clients);
      return `${project.name} ${project.slug} ${client?.name || ""}`.toLowerCase().includes(normalized);
    });
  }, [data.projects, data.clients, query]);

  const filteredClients = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return data.clients;
    return data.clients.filter((client) => `${client.name} ${client.legalName} ${client.sector} ${client.city}`.toLowerCase().includes(normalized));
  }, [data.clients, query]);

  const activeProjects = data.projects.filter((project) => project.status !== "draft").length;
  const readyProjects = data.projects.filter((project) => project.status === "ready").length;
  const attentionProjects = data.projects.filter((project) => project.status === "attention" || project.complianceScore < 90).length;
  const averageScore = data.projects.length ? Math.round(data.projects.reduce((sum, project) => sum + project.complianceScore, 0) / data.projects.length) : 0;

  const openProject = (project?: Project) => {
    if (!data.clients.length) {
      setClientModal({ open: true });
      return;
    }
    setProjectModal({ open: true, project });
  };

  return (
    <div className="studio-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Cerrar navegación"><X /></button>
        <button className="brand-lockup" onClick={() => setTab("dashboard")} aria-label="Ir al inicio">
          <span className="brand-emblem"><i /><b>A</b></span>
          <span>Archic<br />Studio</span>
        </button>
        <nav aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => { setTab(item.id); setMobileNav(false); }}><Icon size={21} /><span>{item.label}</span>{item.id === "compliance" && attentionProjects > 0 ? <em>{attentionProjects}</em> : null}</button>;
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="line-art" aria-hidden="true"><span /><i /><b /></div>
          <p>Fábrica interna<br />de sitios Archic</p>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Abrir navegación"><PanelsTopLeft /></button>
          <label className="global-search"><Search size={20} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proyectos, clientes..." /><kbd>⌘ K</kbd></label>
          <div className="top-actions">
            <button className="icon-button notification" aria-label="Notificaciones"><Bell size={20} />{data.audits.filter((audit) => audit.status === "open").length ? <i /> : null}</button>
            <div className="user-chip"><span>{user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><ChevronDown size={16} /></div>
          </div>
        </header>

        <main className="main-content">
          {error ? <div className="error-banner"><AlertTriangle size={18} /><span>{error}</span><button onClick={() => setError("")}><X size={17} /></button></div> : null}
          {loading ? <div className="loading-screen"><Loader2 className="spin" /><p>Preparando Archic Studio...</p></div> : (
            <>
              {tab === "dashboard" ? <Dashboard name={user.name} data={data} activeProjects={activeProjects} readyProjects={readyProjects} attentionProjects={attentionProjects} averageScore={averageScore} onNew={() => openProject()} onOpen={openProject} onTab={setTab} /> : null}
              {tab === "projects" ? <ProjectsView projects={filteredProjects} clients={data.clients} saving={saving} onNew={() => openProject()} onOpen={openProject} onAudit={(id) => void action({ action: "runAudit", id })} onDelete={(id) => void action({ action: "deleteProject", id })} /> : null}
              {tab === "clients" ? <ClientsView clients={filteredClients} projects={data.projects} onNew={() => setClientModal({ open: true })} onEdit={(client) => setClientModal({ open: true, client })} /> : null}
              {tab === "compliance" ? <ComplianceView data={data} averageScore={averageScore} saving={saving} onAudit={(id) => void action({ action: "runAudit", id })} onOpen={openProject} /> : null}
              {tab === "templates" ? <TemplatesView onUse={(template) => { const project = { ...DEFAULT_DRAFT, template, primaryColor: TEMPLATES.find((item) => item.id === template)?.colors[0] || DEFAULT_DRAFT.primaryColor, accentColor: TEMPLATES.find((item) => item.id === template)?.colors[2] || DEFAULT_DRAFT.accentColor }; setProjectModal({ open: true, project: project as Project }); }} /> : null}
              {tab === "settings" ? <SettingsView /> : null}
            </>
          )}
        </main>
      </div>

      {projectModal.open ? <ProjectWizard clients={data.clients} project={projectModal.project} saving={saving} onClose={() => setProjectModal({ open: false })} onSave={async (project) => { const payload = await action({ action: project.id ? "updateProject" : "createProject", project }); if (!payload) return undefined; return payload.projects.find((item) => item.id === project.id || item.id === payload.savedProjectId); }} /> : null}
      {clientModal.open ? <ClientModal client={clientModal.client} saving={saving} onClose={() => setClientModal({ open: false })} onSave={async (client) => { const ok = await action({ action: client.id ? "updateClient" : "createClient", client }); if (ok) setClientModal({ open: false }); }} /> : null}
    </div>
  );
}

function Dashboard({ name, data, activeProjects, readyProjects, attentionProjects, averageScore, onNew, onOpen, onTab }: {
  name: string; data: StudioData; activeProjects: number; readyProjects: number; attentionProjects: number; averageScore: number;
  onNew: () => void; onOpen: (project: Project) => void; onTab: (tab: Tab) => void;
}) {
  const recent = data.projects.slice(0, 5);
  return <div className="page dashboard-page">
    <div className="page-heading hero-heading"><div><p className="overline">Panel de producción</p><h1>Buenos días, {name}.</h1><p>Aquí tienes el estado real de los proyectos y lo que necesita tu atención.</p></div><button className="primary-button" onClick={onNew}><Plus size={19} />Nuevo proyecto</button></div>
    <section className="metrics-grid" aria-label="Resumen">
      <article className="metric-card metric-gold"><div className="metric-icon"><FolderKanban /></div><div><span>Proyectos activos</span><strong>{activeProjects}</strong><small>{data.clients.length} clientes en el estudio</small></div></article>
      <article className="metric-card metric-green"><div className="metric-icon"><ArrowUpRight /></div><div><span>Listos para publicar</span><strong>{readyProjects}</strong><small>{readyProjects ? "Con la base legal verificada" : "Completa las comprobaciones"}</small></div></article>
      <article className="metric-card metric-rust"><div className="metric-icon"><AlertTriangle /></div><div><span>Requieren atención</span><strong>{attentionProjects}</strong><small>{attentionProjects ? "Hay controles pendientes" : "Todo está al día"}</small></div></article>
    </section>
    <div className="dashboard-grid">
      <section className="panel recent-panel"><div className="panel-heading"><div><p className="overline">Actividad</p><h2>Proyectos recientes</h2></div><button className="text-button" onClick={() => onTab("projects")}>Ver todos <ChevronRight size={17} /></button></div>
        {recent.length ? <div className="project-table"><div className="table-head"><span>Proyecto</span><span>Cliente</span><span>Actualización</span><span>Estado</span><span /></div>{recent.map((project) => <button className="table-row" key={project.id} onClick={() => onOpen(project)}><span className="project-cell"><i style={{ background: `linear-gradient(145deg, ${project.primaryColor}, ${project.accentColor})` }}>{project.name.slice(0, 1)}</i><b>{project.name}<small>{project.siteType === "ecommerce" ? "Tienda online" : project.siteType === "booking" ? "Web y reservas" : "Web corporativa"}</small></b></span><span>{getClient(project, data.clients)?.name || "Sin cliente"}</span><span>{formatDate(project.updatedAt)}</span><span><StatusBadge status={project.status} /></span><span><ChevronRight size={18} /></span></button>)}</div> : <EmptyState title="Todavía no hay proyectos" text="Crea el primero y Archic Studio preparará toda la base." action={<button className="primary-button small" onClick={onNew}><Plus size={17} />Nuevo proyecto</button>} />}
      </section>
      <section className="panel compliance-panel"><div className="panel-heading"><div><p className="overline">Control</p><h2>Estado de cumplimiento</h2></div></div><ScoreRing score={averageScore} /><ul className="check-list"><li><Cookie size={18} /><span>Cookies y consentimiento</span><CheckCircle2 /></li><li><LockKeyhole size={18} /><span>Privacidad</span><CheckCircle2 /></li><li><FileCheck2 size={18} /><span>Formularios</span><CheckCircle2 /></li><li><Accessibility size={18} /><span>Accesibilidad</span><CheckCircle2 /></li></ul><button className="text-button centered" onClick={() => onTab("compliance")}>Ver detalles <ChevronRight size={17} /></button></section>
    </div>
  </div>;
}

function ProjectsView({ projects, clients, saving, onNew, onOpen, onAudit, onDelete }: { projects: Project[]; clients: Client[]; saving: boolean; onNew: () => void; onOpen: (project: Project) => void; onAudit: (id: string) => void; onDelete: (id: string) => void }) {
  return <div className="page"><div className="page-heading"><div><p className="overline">Producción</p><h1>Proyectos</h1><p>Construye, revisa y exporta cada web desde una misma base.</p></div><button className="primary-button" onClick={onNew}><Plus size={19} />Nuevo proyecto</button></div>
    {projects.length ? <div className="project-grid">{projects.map((project) => <article className="project-card" key={project.id}><button className="project-cover" onClick={() => onOpen(project)} style={{ "--project-primary": project.primaryColor, "--project-accent": project.accentColor } as React.CSSProperties}><div className="browser-dots"><i /><i /><i /></div><div className="cover-copy"><span>{getClient(project, clients)?.sector || "Servicios"}</span><strong>{getClient(project, clients)?.name || project.name}</strong><small>Vista base · {TEMPLATES.find((item) => item.id === project.template)?.name}</small></div></button><div className="project-card-body"><div><small>{getClient(project, clients)?.name}</small><h3>{project.name}</h3></div><StatusBadge status={project.status} /><div className="project-meta"><span><Globe2 size={15} />/{project.slug}</span><span><ShieldCheck size={15} />{project.complianceScore}%</span></div><div className="card-actions"><button onClick={() => onOpen(project)}><Eye size={16} />Abrir</button><button disabled={saving} onClick={() => onAudit(project.id)}><RefreshCw size={16} />Auditar</button><button className="danger-icon" aria-label="Eliminar proyecto" onClick={() => { if (window.confirm(`¿Eliminar ${project.name}?`)) onDelete(project.id); }}><Trash2 size={16} /></button></div></div></article>)}</div> : <EmptyState title="No hay resultados" text="Prueba otra búsqueda o crea un proyecto nuevo." action={<button className="primary-button small" onClick={onNew}><Plus size={17} />Nuevo proyecto</button>} />}
  </div>;
}

function ClientsView({ clients, projects, onNew, onEdit }: { clients: Client[]; projects: Project[]; onNew: () => void; onEdit: (client: Client) => void }) {
  return <div className="page"><div className="page-heading"><div><p className="overline">Cartera</p><h1>Clientes</h1><p>Datos comerciales y legales reutilizados en todos sus proyectos.</p></div><button className="primary-button" onClick={onNew}><Plus size={19} />Nuevo cliente</button></div>
    {clients.length ? <div className="clients-grid">{clients.map((client) => { const clientProjects = projects.filter((project) => project.clientId === client.id); const score = clientProjects.length ? Math.round(clientProjects.reduce((sum, project) => sum + project.complianceScore, 0) / clientProjects.length) : 0; return <article className="client-card" key={client.id}><div className="client-card-top"><span>{client.name.slice(0, 2).toUpperCase()}</span><StatusBadge status="active" /></div><h3>{client.name}</h3><p>{client.sector} · {client.city || "Sin ciudad"}</p><dl><div><dt>Razón social</dt><dd>{client.legalName || "Pendiente"}</dd></div><div><dt>NIF/CIF</dt><dd>{client.taxId || "Pendiente"}</dd></div><div><dt>Contacto</dt><dd>{client.email || "Pendiente"}</dd></div></dl><div className="client-footer"><span>{clientProjects.length} {clientProjects.length === 1 ? "proyecto" : "proyectos"}</span><span className={score < 90 ? "warning-text" : "success-text"}><ShieldCheck size={15} />{score || "—"}{score ? "%" : ""}</span></div><button className="secondary-button client-edit" onClick={() => onEdit(client)}>Editar ficha legal</button></article>; })}</div> : <EmptyState title="No hay clientes" text="Añade la ficha legal del primer cliente." action={<button className="primary-button small" onClick={onNew}><Plus size={17} />Nuevo cliente</button>} />}
  </div>;
}

function ComplianceView({ data, averageScore, saving, onAudit, onOpen }: { data: StudioData; averageScore: number; saving: boolean; onAudit: (id: string) => void; onOpen: (project: Project) => void }) {
  const openAudits = data.audits.filter((audit) => audit.status === "open");
  return <div className="page"><div className="page-heading"><div><p className="overline">Motor de control</p><h1>Cumplimiento</h1><p>Una fotografía verificable de cada web antes de publicarla.</p></div></div>
    <div className="compliance-hero panel"><div><p className="overline">Salud global</p><h2>{averageScore >= 90 ? "Una base sólida y controlada." : "Hay puntos que debemos cerrar."}</h2><p>El resultado combina identidad legal, privacidad, cookies, formularios, accesibilidad, seguridad y contratación.</p></div><ScoreRing score={averageScore} /></div>
    <div className="compliance-layout"><section className="panel"><div className="panel-heading"><div><p className="overline">Por proyecto</p><h2>Auditorías</h2></div></div><div className="audit-project-list">{data.projects.map((project) => <div key={project.id} className="audit-project"><button onClick={() => onOpen(project)}><span className="score-number">{project.complianceScore}</span><span><strong>{project.name}</strong><small>{getClient(project, data.clients)?.name}</small></span></button><div className="audit-progress"><i style={{ width: `${project.complianceScore}%` }} /></div><button className="secondary-button small" disabled={saving} onClick={() => onAudit(project.id)}>{saving ? <Loader2 className="spin" /> : <RefreshCw />}Auditar</button></div>)}</div></section>
      <section className="panel"><div className="panel-heading"><div><p className="overline">Hallazgos</p><h2>Actividad reciente</h2></div><span className="count-badge">{openAudits.length} abiertos</span></div><div className="findings">{data.audits.map((audit) => <article key={audit.id} className={`finding finding-${audit.severity}`}><span>{audit.severity === "success" ? <CheckCircle2 /> : <AlertTriangle />}</span><div><strong>{audit.title}</strong><p>{audit.detail}</p><small>{formatDate(audit.createdAt)}</small></div></article>)}</div></section>
    </div>
    <section className="legal-library"><div className="section-heading"><div><p className="overline">Base versionada</p><h2>Controles incluidos</h2></div></div><div className="control-grid">{LEGAL_CONTROLS.slice(0, 7).map((control) => { const Icon = control.icon; return <article key={control.id}><Icon /><div><strong>{control.label}</strong><p>Regla activa en el generador y en la auditoría.</p></div><Check size={18} /></article>; })}</div></section>
  </div>;
}

function TemplatesView({ onUse }: { onUse: (template: string) => void }) {
  return <div className="page"><div className="page-heading"><div><p className="overline">Sistema visual</p><h1>Plantillas</h1><p>Tres direcciones consistentes, personalizables y libres de apariencia genérica.</p></div></div><div className="template-grid">{TEMPLATES.map((template) => <article key={template.id}><div className={`template-preview template-${template.id}`}><div className="template-nav"><i /><span /></div><div className="template-type"><small>{template.style}</small><strong>{template.name}</strong><span /></div></div><div className="template-info"><div><h3>{template.name}</h3><p>{template.style}</p></div><div className="swatches">{template.colors.map((color) => <i key={color} style={{ background: color }} />)}</div><button className="secondary-button" onClick={() => onUse(template.id)}>Usar plantilla <ChevronRight size={17} /></button></div></article>)}</div>
    <div className="system-note"><Sparkles /><div><strong>Un sistema, muchas webs</strong><p>Las plantillas comparten estructura accesible, tokens, componentes, consentimiento y documentos legales; la identidad visual cambia sin romper la base.</p></div></div>
  </div>;
}

function useGithubStatus() {
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/github", { cache: "no-store" });
      setStatus(await response.json() as GithubStatus);
    } catch {
      setStatus({ connected: false, error: "No se pudo comprobar la conexión." });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    void fetch("/api/github", { cache: "no-store" })
      .then((response) => response.json() as Promise<GithubStatus>)
      .then((payload) => { if (active) setStatus(payload); })
      .catch(() => { if (active) setStatus({ connected: false, error: "No se pudo comprobar la conexión." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { status, loading, refresh };
}

function GithubSettingsCard() {
  const { status, loading, refresh } = useGithubStatus();
  return <section className="panel settings-section github-settings"><div className="settings-title"><Github /><div><h2>GitHub</h2><p>Repositorios privados y publicación directa desde cada proyecto.</p></div><span className={`connection-pill ${status?.connected ? "connected" : ""}`}><i />{loading ? "Comprobando" : status?.connected ? "Conectado" : "Pendiente"}</span></div>{status?.connected ? <div className="github-account"><span>{status.user?.login.slice(0, 2).toUpperCase()}</span><div><strong>{status.user?.name || status.user?.login}</strong><p>Los nuevos repositorios se crearán en <b>{status.owner}</b> y el token nunca se envía al navegador.</p></div><a href={status.user?.html_url} target="_blank" rel="noreferrer">Abrir perfil <ArrowUpRight /></a></div> : <div className="github-empty"><div><strong>Conecta una credencial de publicación segura</strong><p>Añade <code>GITHUB_TOKEN</code> y <code>GITHUB_OWNER</code> como secretos del entorno. El token debe poder crear repositorios y escribir su contenido.</p></div><button className="secondary-button" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} />Volver a comprobar</button></div>}</section>;
}

function SettingsView() {
  return <div className="page"><div className="page-heading"><div><p className="overline">Configuración</p><h1>Ajustes</h1><p>Guardas internas aplicadas a todos los nuevos proyectos.</p></div></div><div className="settings-layout"><GithubSettingsCard /><section className="panel settings-section"><div className="settings-title"><ShieldCheck /><div><h2>Reglas de publicación</h2><p>Bloqueos que evitan publicar una base incompleta.</p></div></div>{["Exigir datos legales del titular", "Bloquear scripts antes del consentimiento", "Incluir rechazo visible de cookies", "Exigir capa informativa en formularios", "Ejecutar revisión de accesibilidad"].map((item) => <label className="setting-row" key={item}><span>{item}</span><input type="checkbox" defaultChecked /><i /></label>)}</section><section className="panel settings-section"><div className="settings-title"><Code2 /><div><h2>Exportación</h2><p>Valores comunes en los proyectos generados.</p></div></div><label className="field"><span>Nombre de la organización</span><input defaultValue="Archic" /></label><label className="field"><span>Dominio de trabajo</span><input defaultValue="archic.es" /></label><label className="field"><span>Firma del generador</span><select defaultValue="hidden"><option value="hidden">No mostrar</option><option value="footer">Mostrar en el pie</option></select></label><button className="primary-button"><Save size={17} />Guardar ajustes</button></section></div>
    <div className="legal-disclaimer"><AlertTriangle /><div><strong>Revisión profesional para casos de riesgo</strong><p>Archic Studio marca como revisión obligatoria los proyectos de salud, menores, datos sensibles, perfilado o decisiones automatizadas. La herramienta acelera y documenta el trabajo; no sustituye el análisis jurídico específico cuando el tratamiento lo exige.</p></div></div>
  </div>;
}

function ClientModal({ client: existingClient, saving, onClose, onSave }: { client?: Client; saving: boolean; onClose: () => void; onSave: (client: Omit<Client, "status" | "createdAt" | "updatedAt">) => void }) {
  const [client, setClient] = useState<Omit<Client, "status" | "createdAt" | "updatedAt">>(() => existingClient ? {
    id: existingClient.id,
    name: existingClient.name,
    legalName: existingClient.legalName,
    taxId: existingClient.taxId,
    email: existingClient.email,
    phone: existingClient.phone,
    address: existingClient.address,
    city: existingClient.city,
    country: existingClient.country,
    sector: existingClient.sector,
    registryData: existingClient.registryData,
    professionalData: existingClient.professionalData,
  } : { id: "", name: "", legalName: "", taxId: "", email: "", phone: "", address: "", city: "", country: "España", sector: "Servicios", registryData: "", professionalData: "" });
  const update = (key: keyof typeof client, value: string) => setClient((current) => ({ ...current, [key]: value }));
  return <div className="modal-backdrop" role="presentation"><section className="modal-card client-modal" role="dialog" aria-modal="true" aria-labelledby="client-title"><div className="modal-header"><div><p className="overline">Ficha reutilizable</p><h2 id="client-title">{existingClient ? "Editar cliente" : "Añadir cliente"}</h2></div><button onClick={onClose} aria-label="Cerrar"><X /></button></div><div className="form-grid"><label className="field"><span>Nombre comercial *</span><input autoFocus value={client.name} onChange={(event) => update("name", event.target.value)} placeholder="Ej. Sillas Juan y Lola" /></label><label className="field"><span>Sector</span><input value={client.sector} onChange={(event) => update("sector", event.target.value)} /></label><label className="field"><span>Razón social</span><input value={client.legalName} onChange={(event) => update("legalName", event.target.value)} /></label><label className="field"><span>NIF / CIF</span><input value={client.taxId} onChange={(event) => update("taxId", event.target.value)} /></label><label className="field"><span>Correo de contacto y privacidad</span><input type="email" value={client.email} onChange={(event) => update("email", event.target.value)} /></label><label className="field"><span>Teléfono</span><input value={client.phone} onChange={(event) => update("phone", event.target.value)} /></label><label className="field wide"><span>Dirección completa</span><input value={client.address} onChange={(event) => update("address", event.target.value)} /></label><label className="field"><span>Ciudad</span><input value={client.city} onChange={(event) => update("city", event.target.value)} /></label><label className="field"><span>País</span><input value={client.country} onChange={(event) => update("country", event.target.value)} /></label><label className="field wide"><span>Datos registrales · si aplica</span><textarea rows={2} value={client.registryData} onChange={(event) => update("registryData", event.target.value)} placeholder="Registro, tomo, folio, hoja e inscripción" /></label><label className="field wide"><span>Profesión regulada o autorización · si aplica</span><textarea rows={2} value={client.professionalData} onChange={(event) => update("professionalData", event.target.value)} placeholder="Colegio, número, título, autoridad o licencia" /></label></div><div className="modal-footer"><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={!client.name.trim() || saving} onClick={() => onSave(client)}>{saving ? <Loader2 className="spin" /> : <Save />}Guardar ficha</button></div></section></div>;
}

function ProjectWizard({ clients, project, saving, onClose, onSave }: { clients: Client[]; project?: Project; saving: boolean; onClose: () => void; onSave: (project: ProjectDraft) => Promise<Project | undefined> }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ProjectDraft>(() => {
    if (project?.id) return { ...project, brief: { ...project.brief, services: [...(project.brief?.services ?? [])], differentiators: [...(project.brief?.differentiators ?? [])], proofPoints: [...(project.brief?.proofPoints ?? [])], seoKeywords: [...(project.brief?.seoKeywords ?? [])] }, legalProfile: { ...project.legalProfile }, legal: { ...project.legal }, sections: [...project.sections], integrations: [...project.integrations] };
    const base = { ...DEFAULT_DRAFT, brief: { ...DEFAULT_DRAFT.brief, services: [], differentiators: [], proofPoints: [], seoKeywords: [] }, legalProfile: { ...DEFAULT_DRAFT.legalProfile }, legal: { ...DEFAULT_DRAFT.legal }, sections: [...DEFAULT_DRAFT.sections], integrations: [...DEFAULT_DRAFT.integrations] };
    if (project?.template) return { ...base, template: project.template, primaryColor: project.primaryColor, accentColor: project.accentColor };
    return { ...base, clientId: clients[0]?.id || "" };
  });
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [saved, setSaved] = useState(false);
  const client = getClient(draft, clients);
  const html = useMemo(() => buildWebsiteHtml(client, draft), [client, draft]);
  const steps = ["Proyecto", "Empresa", "Diseño", "Integraciones", "Legal", "Vista previa"];

  const update = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateBrief = <K extends keyof BusinessBrief>(key: K, value: BusinessBrief[K]) => setDraft((current) => ({ ...current, brief: { ...current.brief, [key]: value } }));
  const updateLegalProfile = <K extends keyof LegalProfile>(key: K, value: LegalProfile[K]) => setDraft((current) => ({ ...current, legalProfile: { ...current.legalProfile, [key]: value } }));
  const toggleArray = (key: "sections" | "integrations", value: string) => update(key, draft[key].includes(value) ? draft[key].filter((item) => item !== value) : [...draft[key], value]);
  const toggleLegal = (key: string) => update("legal", { ...draft.legal, [key]: !draft.legal[key] });
  const assessment = useMemo(() => assessProject(client, draft), [client, draft]);
  const score = assessment.score;

  const nextDisabled = (step === 1 && (!draft.clientId || !draft.name.trim() || !draft.slug.trim()))
    || (step === 2 && (!draft.brief.objective?.trim() || !draft.brief.audience?.trim() || !draft.brief.valueProposition?.trim()))
    || (step === 3 && (!draft.headline.trim() || !draft.subheadline.trim()));
  return <div className="wizard-shell" role="dialog" aria-modal="true" aria-label="Constructor de proyecto"><aside className="wizard-sidebar"><div className="wizard-brand"><span className="brand-emblem small"><i /><b>A</b></span><span>Archic Studio</span></div><div className="wizard-steps">{steps.map((label, index) => <button key={label} className={`${step === index + 1 ? "active" : ""} ${step > index + 1 ? "done" : ""}`} onClick={() => setStep(index + 1)}><span>{step > index + 1 ? <Check size={15} /> : index + 1}</span><div><strong>{label}</strong><small>{index === 0 ? "Base del encargo" : index === 1 ? "Briefing empresarial" : index === 2 ? "Sistema visual" : index === 3 ? "Servicios externos" : index === 4 ? "Controles y textos" : "Revisión y exportación"}</small></div></button>)}</div><div className="wizard-score"><div><ShieldCheck /><span>Estado de la base</span></div><strong>{score}%</strong><div className="audit-progress"><i style={{ width: `${score}%` }} /></div><small>{assessment.blockers.length ? "Hay bloqueos de publicación" : score >= 90 ? "Preparada para verificación final" : "Quedan mejoras de contenido"}</small></div></aside>
    <div className="wizard-main"><header className="wizard-header"><button className="back-button" onClick={onClose}><ArrowLeft size={19} />Volver al estudio</button><div><span>{project?.id ? "Editando" : "Nuevo proyecto"}</span><strong>{draft.name || "Sin nombre"}</strong></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X /></button></header>
      <div className="wizard-content">
        {step === 1 ? <WizardProject draft={draft} clients={clients} update={update} /> : null}
        {step === 2 ? <WizardBusiness draft={draft} client={client} update={updateBrief} /> : null}
        {step === 3 ? <WizardDesign draft={draft} update={update} toggleSection={(value) => toggleArray("sections", value)} /> : null}
        {step === 4 ? <WizardIntegrations draft={draft} toggle={(value) => toggleArray("integrations", value)} /> : null}
        {step === 5 ? <WizardLegal draft={draft} client={client} toggle={toggleLegal} update={updateLegalProfile} assessment={assessment} /> : null}
        {step === 6 ? <WizardPreview draft={draft} client={client} html={html} device={device} setDevice={setDevice} assessment={assessment} /> : null}
      </div>
      <footer className="wizard-footer"><div>{step > 1 ? <button className="secondary-button" onClick={() => setStep((current) => current - 1)}>Anterior</button> : <span />}</div><div><span>{saved ? "Proyecto guardado" : `Paso ${step} de ${steps.length}`}</span>{step < steps.length ? <button className="primary-button" disabled={nextDisabled} onClick={() => setStep((current) => current + 1)}>Continuar <ChevronRight size={18} /></button> : <><button className="secondary-button" onClick={() => { downloadText(`${draft.slug || "sitio"}.html`, html, "text/html"); }}><Download size={17} />Exportar HTML</button><button className="primary-button" disabled={saving} onClick={async () => { const result = await onSave({ ...draft, status: assessment.status }); if (result) { setDraft({ ...result }); setSaved(true); } }}>{saving ? <Loader2 className="spin" /> : saved ? <Check /> : <Save />}{saved ? "Guardado" : "Guardar proyecto"}</button></>}</div></footer>
    </div>
  </div>;
}

function WizardProject({ draft, clients, update }: { draft: ProjectDraft; clients: Client[]; update: <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => void }) {
  return <div className="wizard-step"><div className="step-heading"><p className="overline">01 · Base del encargo</p><h1>¿Qué vamos a construir?</h1><p>Estos datos organizan el proyecto y activan las reglas específicas del tipo de web.</p></div><div className="step-card form-grid"><label className="field wide"><span>Cliente *</span><select value={draft.clientId} onChange={(event) => update("clientId", event.target.value)}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.city}</option>)}</select></label><label className="field"><span>Nombre del proyecto *</span><input autoFocus value={draft.name} onChange={(event) => { update("name", event.target.value); if (!draft.id) update("slug", slugify(event.target.value)); }} placeholder="Ej. Web corporativa 2026" /></label><label className="field"><span>Ruta del proyecto *</span><div className="slug-field"><span>/</span><input value={draft.slug} onChange={(event) => update("slug", slugify(event.target.value))} placeholder="nombre-del-proyecto" /></div></label></div><div className="site-type-grid">{[{ id: "corporate", icon: Building2, title: "Corporativa", text: "Presentación, servicios y contacto." }, { id: "booking", icon: Globe2, title: "Reservas", text: "Citas, disponibilidad o solicitudes." }, { id: "ecommerce", icon: FolderKanban, title: "Ecommerce", text: "Venta, contratación y desistimiento." }].map((type) => { const Icon = type.icon; return <button key={type.id} className={draft.siteType === type.id ? "selected" : ""} onClick={() => { update("siteType", type.id); if (type.id === "ecommerce") update("legal", { ...draft.legal, terms: true, returns: true }); }}><Icon /><span><strong>{type.title}</strong><small>{type.text}</small></span>{draft.siteType === type.id ? <CheckCircle2 /> : null}</button>; })}</div></div>;
}

function WizardBusiness({ draft, client, update }: { draft: ProjectDraft; client?: Client; update: <K extends keyof BusinessBrief>(key: K, value: BusinessBrief[K]) => void }) {
  return <div className="wizard-step"><div className="step-heading"><p className="overline">02 · Briefing empresarial</p><h1>Primero entendemos la empresa.</h1><p>Esta información alimenta la portada, los servicios, el relato, las pruebas, el SEO y las llamadas a la acción. Nada se publica como texto de relleno.</p></div><div className="brief-context"><Building2 /><div><strong>{client?.name || "Cliente pendiente"}</strong><p>{client?.sector || "Sector pendiente"} · {client?.city || "Área pendiente"}</p></div><span>Fuente común de verdad</span></div><div className="brief-grid"><label className="field"><span>Objetivo principal *</span><select value={draft.brief.objective || ""} onChange={(event) => update("objective", event.target.value)}><option value="">Seleccionar objetivo</option><option value="Generar solicitudes cualificadas">Generar solicitudes</option><option value="Conseguir reservas">Conseguir reservas</option><option value="Vender productos online">Vender online</option><option value="Presentar la empresa y generar confianza">Presentar la empresa</option><option value="Mostrar proyectos y capacidades">Mostrar proyectos</option></select></label><label className="field"><span>Voz de marca</span><select value={draft.brief.tone || "cercano"} onChange={(event) => update("tone", event.target.value)}><option value="cercano">Cercana y clara</option><option value="experto">Experta y precisa</option><option value="audaz">Directa y audaz</option><option value="sereno">Serena y premium</option><option value="artesano">Artesana y humana</option></select></label><label className="field wide"><span>Público prioritario *</span><textarea rows={3} value={draft.brief.audience || ""} onChange={(event) => update("audience", event.target.value)} placeholder="Quién decide, qué necesita y en qué zona o contexto" /><small>No escribas “todo el mundo”: concreta quién debe sentirse reconocido.</small></label><label className="field wide"><span>Propuesta de valor *</span><textarea rows={3} value={draft.brief.valueProposition || ""} onChange={(event) => update("valueProposition", event.target.value)} placeholder="Qué resuelve la empresa, para quién y por qué resulta preferible" /></label><label className="field wide"><span>Servicios reales · uno por línea</span><textarea rows={6} value={joinLines(draft.brief.services)} onChange={(event) => update("services", splitLines(event.target.value))} placeholder={"Servicio | beneficio concreto para el cliente\nServicio | qué incluye o qué problema resuelve"} /><small>Usa «Nombre | explicación» para crear tarjetas específicas, no bloques genéricos.</small></label><label className="field"><span>Diferenciales · uno por línea</span><textarea rows={5} value={joinLines(draft.brief.differentiators)} onChange={(event) => update("differentiators", splitLines(event.target.value))} placeholder={"Método o ventaja demostrable\nOtra razón real para elegir la empresa"} /></label><label className="field"><span>Pruebas y señales de confianza</span><textarea rows={5} value={joinLines(draft.brief.proofPoints)} onChange={(event) => update("proofPoints", splitLines(event.target.value))} placeholder={"Caso, cifra, certificación o resultado\nÁrea de especialización demostrable"} /></label><label className="field wide"><span>Historia y forma de trabajar</span><textarea rows={5} value={draft.brief.aboutStory || ""} onChange={(event) => update("aboutStory", event.target.value)} placeholder="Origen, método, criterio y forma concreta de acompañar al cliente" /></label><label className="field"><span>Acción principal</span><input value={draft.brief.primaryCta || ""} onChange={(event) => update("primaryCta", event.target.value)} placeholder="Ej. Pedir propuesta" /></label><label className="field"><span>Palabras clave · una por línea</span><textarea rows={3} value={joinLines(draft.brief.seoKeywords)} onChange={(event) => update("seoKeywords", splitLines(event.target.value))} placeholder={"servicio + ciudad\nespecialidad + zona"} /></label></div></div>;
}

function WizardDesign({ draft, update, toggleSection }: { draft: ProjectDraft; update: <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => void; toggleSection: (value: string) => void }) {
  return <div className="wizard-step"><div className="step-heading"><p className="overline">03 · Dirección creativa</p><h1>Una identidad al servicio del mensaje.</h1><p>La dirección visual cambia composición, tipografía y ritmo; el texto nace del briefing y debe sonar a esta empresa.</p></div><div className="template-picker">{TEMPLATES.map((template) => <button key={template.id} className={draft.template === template.id ? "selected" : ""} onClick={() => { update("template", template.id); update("primaryColor", template.colors[0]); update("accentColor", template.colors[2]); }}><div className={`template-mini template-${template.id}`}><span /><strong>{template.name}</strong><i /></div><span><strong>{template.name}</strong><small>{template.style}</small><em>{template.description}</em></span>{draft.template === template.id ? <CheckCircle2 /> : null}</button>)}</div><div className="design-copy-grid"><label className="field wide"><span>Titular principal</span><textarea rows={2} value={draft.headline} onChange={(event) => update("headline", event.target.value)} placeholder="La frase que debe dominar la portada" /></label><label className="field wide"><span>Texto de apoyo</span><textarea rows={2} value={draft.subheadline} onChange={(event) => update("subheadline", event.target.value)} placeholder="Una explicación breve y concreta" /></label><label className="field wide image-url-field"><span><ImageIcon /> Imagen de portada · URL HTTPS opcional</span><input type="url" value={draft.heroImageUrl} onChange={(event) => update("heroImageUrl", event.target.value)} placeholder="https://..." /><small>Si no añades imagen, el sistema crea una composición gráfica propia de la plantilla.</small></label></div><div className="design-controls"><label className="color-field"><span>Color principal</span><div><input type="color" value={draft.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} /><code>{draft.primaryColor}</code></div></label><label className="color-field"><span>Color de acento</span><div><input type="color" value={draft.accentColor} onChange={(event) => update("accentColor", event.target.value)} /><code>{draft.accentColor}</code></div></label></div><div className="section-heading compact"><div><p className="overline">Estructura</p><h2>Secciones incluidas</h2></div><span>{draft.sections.length} seleccionadas</span></div><div className="section-picker">{SECTION_OPTIONS.map((section) => <button key={section.id} className={draft.sections.includes(section.id) ? "selected" : ""} onClick={() => toggleSection(section.id)}><span>{draft.sections.includes(section.id) ? <Check /> : <Plus />}</span><div><strong>{section.label}</strong><small>{section.description}</small></div></button>)}</div></div>;
}

function WizardIntegrations({ draft, toggle }: { draft: ProjectDraft; toggle: (value: string) => void }) {
  return <div className="wizard-step"><div className="step-heading"><p className="overline">04 · Servicios externos</p><h1>Conecta solo lo que el proyecto necesita.</h1><p>Cada selección entra en el inventario y activa su categoría de consentimiento. El proveedor definitivo debe verificarse en producción.</p></div><div className="integration-note"><ShieldCheck /><div><strong>Privacidad desde el diseño</strong><p>Las integraciones no esenciales se exportan con puntos de carga bloqueados y no pueden ejecutarse hasta que el visitante elija.</p></div></div><div className="integration-list">{INTEGRATIONS.map((integration) => <button key={integration.id} className={draft.integrations.includes(integration.id) ? "selected" : ""} onClick={() => toggle(integration.id)}><span className="integration-logo">{integration.label.slice(0, 2).toUpperCase()}</span><div><strong>{integration.label}</strong><small>{integration.categoryLabel} · {integration.provider}</small></div>{integration.needsConsent ? <em><Cookie size={14} />Consentimiento previo</em> : <em className="neutral">Solo tras interacción</em>}<span className="toggle"><i /></span></button>)}</div></div>;
}

function WizardLegal({ draft, client, toggle, update, assessment }: {
  draft: ProjectDraft;
  client?: Client;
  toggle: (value: string) => void;
  update: <K extends keyof LegalProfile>(key: K, value: LegalProfile[K]) => void;
  assessment: ReturnType<typeof assessProject>;
}) {
  const [doc, setDoc] = useState<"legal" | "privacy" | "cookies" | "terms">("privacy");
  const controls = LEGAL_CONTROLS.filter((control) => !control.ecommerce || draft.siteType === "ecommerce");
  const riskDeclared = Boolean(draft.legalProfile.minors || draft.legalProfile.specialCategories || draft.legalProfile.profiling);
  const findings = [...assessment.blockers, ...assessment.warnings];

  return <div className="wizard-step"><div className="step-heading"><p className="overline">05 · Cumplimiento</p><h1>Primero los hechos; después, los textos.</h1><p>La documentación se compone con los tratamientos, proveedores y condiciones reales. Los campos vacíos quedan marcados y bloquean la publicación cuando son esenciales.</p></div>{(!client?.legalName || !client.taxId || !client.address || !client.email) ? <div className="integration-note warning"><AlertTriangle /><div><strong>Ficha del titular incompleta</strong><p>Edita el cliente para completar razón social, NIF/CIF, domicilio y correo. No se pueden sustituir por fórmulas genéricas.</p></div></div> : null}<section className="legal-facts"><div className="section-heading compact"><div><p className="overline">Registro de privacidad</p><h2>Qué ocurre realmente con los datos</h2></div><span>{assessment.score}/100</span></div><div className="legal-profile-grid"><label className="field"><span>Categorías de datos *</span><textarea rows={3} value={draft.legalProfile.dataCategories || ""} onChange={(event) => update("dataCategories", event.target.value)} placeholder="Identificativos, contacto, datos del pedido…" /></label><label className="field"><span>Finalidades concretas *</span><textarea rows={3} value={draft.legalProfile.privacyPurposes || ""} onChange={(event) => update("privacyPurposes", event.target.value)} placeholder="Responder consultas, gestionar reservas…" /></label><label className="field"><span>Base jurídica por finalidad *</span><textarea rows={3} value={draft.legalProfile.legalBasis || ""} onChange={(event) => update("legalBasis", event.target.value)} placeholder="Medidas precontractuales, contrato, consentimiento…" /></label><label className="field"><span>Conservación *</span><textarea rows={3} value={draft.legalProfile.retention || ""} onChange={(event) => update("retention", event.target.value)} placeholder="Plazo o criterio verificable" /></label><label className="field"><span>Destinatarios y encargados *</span><textarea rows={3} value={draft.legalProfile.recipients || ""} onChange={(event) => update("recipients", event.target.value)} placeholder="Proveedor de formularios, reservas, asesoría…" /></label><label className="field"><span>Transferencias internacionales *</span><textarea rows={3} value={draft.legalProfile.internationalTransfers || ""} onChange={(event) => update("internationalTransfers", event.target.value)} placeholder="No previstas, o proveedor, país y garantía" /></label><label className="field"><span>Correo del DPD · si aplica</span><input type="email" value={draft.legalProfile.dpoEmail || ""} onChange={(event) => update("dpoEmail", event.target.value)} placeholder="dpd@empresa.es" /></label><label className="field"><span>Última revisión documentada</span><input type="date" value={draft.legalProfile.lastReviewedAt || ""} onChange={(event) => update("lastReviewedAt", event.target.value)} /></label></div><div className="risk-grid"><label className={draft.legalProfile.marketing ? "active" : ""}><input type="checkbox" checked={Boolean(draft.legalProfile.marketing)} onChange={(event) => update("marketing", event.target.checked)} /><span><strong>Comunicaciones comerciales</strong><small>Añade consentimiento separado y voluntario.</small></span></label><label className={draft.legalProfile.minors ? "active risk" : ""}><input type="checkbox" checked={Boolean(draft.legalProfile.minors)} onChange={(event) => update("minors", event.target.checked)} /><span><strong>Datos de menores</strong><small>Activa revisión específica de edad y autorización.</small></span></label><label className={draft.legalProfile.specialCategories ? "active risk" : ""}><input type="checkbox" checked={Boolean(draft.legalProfile.specialCategories)} onChange={(event) => update("specialCategories", event.target.checked)} /><span><strong>Datos especialmente protegidos</strong><small>Salud, biometría, creencias u otras categorías especiales.</small></span></label><label className={draft.legalProfile.profiling ? "active risk" : ""}><input type="checkbox" checked={Boolean(draft.legalProfile.profiling)} onChange={(event) => update("profiling", event.target.checked)} /><span><strong>Perfilado o decisiones automáticas</strong><small>Exige explicar lógica, relevancia y consecuencias.</small></span></label></div>{riskDeclared ? <label className="professional-review"><input type="checkbox" checked={Boolean(draft.legalProfile.professionalReview)} onChange={(event) => update("professionalReview", event.target.checked)} /><ShieldCheck /><span><strong>Revisión profesional documentada</strong><small>Marca únicamente después de revisar el tratamiento de riesgo y guardar la evidencia fuera del texto web.</small></span></label> : null}{draft.siteType === "ecommerce" ? <div className="commerce-fields"><div className="section-heading compact"><div><p className="overline">Venta a distancia</p><h2>Condiciones comerciales reales</h2></div></div><div className="legal-profile-grid"><label className="field"><span>Medios de pago *</span><textarea rows={3} value={draft.legalProfile.paymentMethods || ""} onChange={(event) => update("paymentMethods", event.target.value)} /></label><label className="field"><span>Entrega o ejecución *</span><textarea rows={3} value={draft.legalProfile.deliveryTerms || ""} onChange={(event) => update("deliveryTerms", event.target.value)} placeholder="Zona, plazo, transportista y restricciones" /></label><label className="field"><span>Costes de devolución *</span><textarea rows={3} value={draft.legalProfile.returnCosts || ""} onChange={(event) => update("returnCosts", event.target.value)} /></label><label className="field"><span>Desistimiento y excepciones *</span><textarea rows={3} value={draft.legalProfile.withdrawalInfo || ""} onChange={(event) => update("withdrawalInfo", event.target.value)} placeholder="Plazo, canal, modelo y excepción si existe" /></label></div></div> : null}</section><div className="audit-inline"><div><ShieldCheck /><span><strong>Evaluación de configuración</strong><small>{assessment.blockers.length} bloqueos · {assessment.warnings.length} advertencias</small></span></div>{findings.length ? <ul>{findings.map((finding) => <li key={finding.id} className={finding.severity}><span>{finding.severity === "critical" ? "Bloqueo" : "Revisar"}</span><div><strong>{finding.label}</strong><small>{finding.detail}</small></div></li>)}</ul> : <p><CheckCircle2 />La configuración no presenta hallazgos. Aún debe verificarse el sitio desplegado.</p>}</div><div className="legal-workspace"><div className="legal-controls">{controls.map((control) => { const Icon = control.icon; return <button key={control.id} className={draft.legal[control.id] ? "active" : ""} onClick={() => toggle(control.id)}><Icon /><span><strong>{control.label}</strong><small>{draft.legal[control.id] ? "Incluido en el paquete" : "Desactivado"}</small></span><span className="toggle"><i /></span></button>; })}</div><div className="document-preview"><div className="doc-tabs"><button className={doc === "privacy" ? "active" : ""} onClick={() => setDoc("privacy")}>Privacidad</button><button className={doc === "legal" ? "active" : ""} onClick={() => setDoc("legal")}>Aviso legal</button><button className={doc === "cookies" ? "active" : ""} onClick={() => setDoc("cookies")}>Cookies</button>{draft.siteType === "ecommerce" ? <button className={doc === "terms" ? "active" : ""} onClick={() => setDoc("terms")}>Contratación</button> : null}</div><pre>{legalDocument(client, draft, doc)}</pre><div className="doc-actions"><button className="secondary-button small" onClick={() => void navigator.clipboard.writeText(legalDocument(client, draft, doc))}><Code2 />Copiar</button><button className="secondary-button small" onClick={() => downloadText((draft.slug || "proyecto") + "-" + doc + ".txt", legalDocument(client, draft, doc))}><Download />Descargar</button></div></div></div></div>;
}

function GithubPublish({ project }: { project: ProjectDraft & { id: string } }) {
  const { status, loading } = useGithubStatus();
  const [name, setName] = useState(project.githubRepoFullName?.split("/").at(-1) || project.slug);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; fullName: string; pushedAt: string } | null>(project.githubRepoUrl ? { url: project.githubRepoUrl, fullName: project.githubRepoFullName, pushedAt: project.githubLastPushAt } : null);

  const publish = async () => {
    setPublishing(true);
    setError("");
    try {
      const response = await fetch("/api/github", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: project.id, repoName: name, visibility }) });
      const payload = await response.json() as { error?: string; repository?: { url: string; fullName: string }; pushedAt?: string };
      if (!response.ok || !payload.repository) throw new Error(payload.error || "No se pudo publicar.");
      setResult({ url: payload.repository.url, fullName: payload.repository.fullName, pushedAt: payload.pushedAt || new Date().toISOString() });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo publicar.");
    } finally {
      setPublishing(false);
    }
  };

  return <div className="github-publish"><div className="publish-title"><Github /><div><strong>Publicar en GitHub</strong><small>{loading ? "Comprobando conexión…" : status?.connected ? `Cuenta ${status.owner}` : "Conexión pendiente"}</small></div></div>{result ? <a className="published-repo" href={result.url} target="_blank" rel="noreferrer"><span><CheckCircle2 /><b>{result.fullName}</b><small>Último envío {formatDate(result.pushedAt)}</small></span><ArrowUpRight /></a> : null}<label className="field"><span>Repositorio</span><input value={name} onChange={(event) => setName(slugify(event.target.value))} /></label><div className="visibility-choice"><button className={visibility === "private" ? "active" : ""} onClick={() => setVisibility("private")}><LockKeyhole />Privado</button><button className={visibility === "public" ? "active" : ""} onClick={() => setVisibility("public")}><Globe2 />Público</button></div>{error ? <p className="publish-error">{error}</p> : null}<button className="github-button" onClick={() => void publish()} disabled={!status?.connected || publishing || !name}>{publishing ? <Loader2 className="spin" /> : <Rocket />}{result ? "Enviar nueva versión" : "Crear repositorio y enviar"}</button></div>;
}

function WizardPreview({ draft, client, html, device, setDevice, assessment }: {
  draft: ProjectDraft;
  client?: Client;
  html: string;
  device: "desktop" | "tablet" | "mobile";
  setDevice: (device: "desktop" | "tablet" | "mobile") => void;
  assessment: ReturnType<typeof assessProject>;
}) {
  const findings = [...assessment.blockers, ...assessment.warnings];
  return <div className="wizard-step preview-step"><div className="step-heading preview-heading"><div><p className="overline">06 · Revisión final</p><h1>{assessment.blockers.length ? "La web se puede revisar; aún no publicar." : "La base está lista para verificar."}</h1><p>{assessment.blockers.length ? "Cierra los bloqueos señalados. Puedes guardar y exportar un borrador, pero GitHub permanecerá bloqueado." : "Revisa el resultado en cada tamaño, guarda el proyecto y comprueba el despliegue real antes de hacerlo público."}</p></div><div className="device-switch"><button className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")} aria-label="Escritorio"><Monitor /></button><button className={device === "tablet" ? "active" : ""} onClick={() => setDevice("tablet")} aria-label="Tablet"><Tablet /></button><button className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")} aria-label="Móvil"><Smartphone /></button></div></div><div className="preview-layout"><div className={"site-preview site-preview-" + device}><div className="preview-browser"><span><i /><i /><i /></span><div><LockKeyhole size={13} />{draft.slug || "nuevo-proyecto"}.archic.es</div><ArrowUpRight size={16} /></div><iframe title={"Vista previa de " + draft.name} srcDoc={html} sandbox="allow-scripts allow-forms allow-modals" /></div><aside className="preview-summary"><p className="overline">Preparación</p><div className={"readiness-score " + (assessment.blockers.length ? "blocked" : "ready")}><strong>{assessment.score}</strong><span>/100</span><small>{assessment.blockers.length ? "Publicación bloqueada" : "Sin bloqueos de configuración"}</small></div><h2>{draft.name}</h2><dl><div><dt>Cliente</dt><dd>{client?.name || "Sin cliente"}</dd></div><div><dt>Objetivo</dt><dd>{draft.brief.objective || "Pendiente"}</dd></div><div><dt>Público</dt><dd>{draft.brief.audience || "Pendiente"}</dd></div><div><dt>Dirección</dt><dd>{TEMPLATES.find((item) => item.id === draft.template)?.name}</dd></div><div><dt>Servicios</dt><dd>{draft.brief.services?.length || 0}</dd></div><div><dt>Integraciones</dt><dd>{draft.integrations.length}</dd></div></dl>{findings.length ? <div className="preview-findings">{findings.slice(0, 5).map((finding) => <div key={finding.id} className={finding.severity}><AlertTriangle /><span><strong>{finding.label}</strong><small>{finding.detail}</small></span></div>)}</div> : null}<button className="secondary-button" onClick={() => downloadText((draft.slug || "proyecto") + "-config.json", JSON.stringify({ client, project: draft, audit: assessment }, null, 2), "application/json")}><Download />Descargar configuración</button><p className="preview-help"><Code2 />El paquete contiene web, documentos legales separados, inventario de consentimiento, configuración y un informe honesto de hallazgos.</p>{draft.id && !assessment.blockers.length ? <GithubPublish project={draft as ProjectDraft & { id: string }} /> : draft.id ? <div className="save-first publish-blocked"><AlertTriangle /><p><strong>Publicación bloqueada</strong><span>Resuelve los controles críticos del paso Legal. El servidor volverá a comprobarlos antes de crear o actualizar el repositorio.</span></p></div> : <div className="save-first"><Github /><p><strong>Guarda primero el proyecto</strong><span>Después podrás crear el repositorio si no quedan bloqueos críticos.</span></p></div>}</aside></div></div>;
}
