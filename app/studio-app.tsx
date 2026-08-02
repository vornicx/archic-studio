"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
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
  LogOut,
  LockKeyhole,
  Monitor,
  PanelsTopLeft,
  Plus,
  RefreshCw,
  Radio,
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
  Wifi,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  assessProject,
  buildWebsiteHtml,
  INTEGRATION_CATALOG,
  legalDocument,
  SITE_TEMPLATES,
  type BusinessBrief,
  type LegalProfile,
} from "../lib/site-generator";
import {
  type StudioActionBody,
  type StudioActivity,
  type StudioClient as Client,
  type StudioData,
  type StudioMember,
  type StudioProject as Project,
} from "../lib/studio-local";
import { getBrowserSupabase } from "../lib/supabase/client";
import {
  applyProjectTypePreset,
  getProjectFlowSteps,
  getProjectTypePreset,
  parseProjectDraftRecovery,
  PROJECT_TYPE_PRESETS,
} from "../lib/project-flow";

type Tab = "dashboard" | "projects" | "clients" | "compliance" | "templates" | "settings";

type ProjectDraft = Omit<Project, "id" | "complianceScore" | "createdAt" | "updatedAt"> & { id?: string };
type PublicationMetadata = Pick<Project, "githubRepoFullName" | "githubRepoUrl" | "githubDefaultBranch" | "githubLastPushAt"> & { revision?: number };
type StudioPayload = StudioData & {
  savedProjectId?: string;
  storageMode?: "shared";
  members: StudioMember[];
  activities: StudioActivity[];
};
type GithubStatus = { connected: boolean; owner?: string; user?: { login: string; name?: string; avatar_url?: string; html_url: string }; reason?: string; error?: string; requiresPublishKey?: boolean };
type PresenceMember = { id: string; name: string; email: string; color: string; view: string; onlineAt: string };

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

function createProjectDraft(seed?: Partial<ProjectDraft>, fallbackClientId = ""): ProjectDraft {
  return {
    ...DEFAULT_DRAFT,
    ...seed,
    clientId: seed?.clientId || fallbackClientId,
    brief: {
      ...DEFAULT_DRAFT.brief,
      ...seed?.brief,
      services: [...(seed?.brief?.services ?? [])],
      differentiators: [...(seed?.brief?.differentiators ?? [])],
      proofPoints: [...(seed?.brief?.proofPoints ?? [])],
      seoKeywords: [...(seed?.brief?.seoKeywords ?? [])],
    },
    legalProfile: { ...DEFAULT_DRAFT.legalProfile, ...seed?.legalProfile },
    legal: { ...DEFAULT_DRAFT.legal, ...seed?.legal },
    sections: [...(seed?.sections ?? DEFAULT_DRAFT.sections)],
    integrations: [...(seed?.integrations ?? DEFAULT_DRAFT.integrations)],
  };
}

function createRecommendedProjectDraft(seed?: Partial<ProjectDraft>, fallbackClientId = "") {
  const draft = createProjectDraft(seed, fallbackClientId);
  return seed?.id || draft.brief.objective?.trim()
    ? draft
    : applyProjectTypePreset(draft, draft.siteType);
}

function hasMeaningfulDraft(draft: ProjectDraft, step: number) {
  return step > 1
    || Boolean(draft.name.trim())
    || Boolean(draft.brief.audience?.trim())
    || Boolean(draft.brief.valueProposition?.trim())
    || Boolean(draft.headline.trim());
}

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

function formatRelativeTime(value: string) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "ahora";
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 45) return "ahora";
  if (seconds < 3600) return `hace ${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.round(seconds / 3600)} h`;
  return formatDate(value);
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

function TeamPresence({ members, onlineMembers }: { members: StudioMember[]; onlineMembers: PresenceMember[] }) {
  const onlineIds = new Set(onlineMembers.map((member) => member.id));
  return <div className="team-presence" title={onlineMembers.length ? `${onlineMembers.length} en línea` : "Conectando con el equipo"}><span className="presence-avatars">{members.slice(0, 2).map((member) => <i key={member.id} className={onlineIds.has(member.id) ? "online" : ""} style={{ "--member-color": member.color } as React.CSSProperties}>{member.name.slice(0, 2).toUpperCase()}</i>)}</span><span><strong>{onlineMembers.length || "—"} en línea</strong><small>Equipo en vivo</small></span><Wifi size={17} /></div>;
}

export default function StudioApp({ user }: { user: { id: string; email: string; name: string; slot: 1 | 2; color: string } }) {
  const [data, setData] = useState<StudioData>(EMPTY_DATA);
  const [members, setMembers] = useState<StudioMember[]>([]);
  const [activities, setActivities] = useState<StudioActivity[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<PresenceMember[]>([]);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [remoteNotice, setRemoteNotice] = useState("");
  const [query, setQuery] = useState("");
  const [projectModal, setProjectModal] = useState<{ open: boolean; project?: Project }>({ open: false });
  const [clientModal, setClientModal] = useState<{ open: boolean; client?: Client }>({ open: false });
  const [mobileNav, setMobileNav] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const realtimeRef = useRef<RealtimeChannel | null>(null);
  const storageKey = `archic-studio:draft:${user.id}`;

  const applyPayload = useCallback((payload: StudioPayload) => {
    setData({ clients: payload.clients, projects: payload.projects, audits: payload.audits });
    setMembers(payload.members ?? []);
    setActivities(payload.activities ?? []);
  }, []);

  const loadStudio = useCallback(async (quiet = false) => {
    const response = await fetch("/api/studio", { cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as StudioPayload & { error?: string };
    if (response.status === 401) {
      window.location.assign("/login");
      return null;
    }
    if (!response.ok) {
      if (!quiet) setError(payload.error || "No se pudo cargar el estudio.");
      return null;
    }
    applyPayload(payload);
    return payload;
  }, [applyPayload]);

  useEffect(() => {
    let active = true;
    void fetch("/api/studio", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json().catch(() => ({})) as StudioPayload & { error?: string };
      if (!active) return;
      if (response.status === 401) return window.location.assign("/login");
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar el estudio.");
      applyPayload(payload);
    }).catch((caught) => {
      if (active) setError(caught instanceof Error ? caught.message : "No se pudo cargar el estudio.");
    }).finally(() => { if (active) setLoading(false); });
    const poll = window.setInterval(() => { void loadStudio(true); }, 20_000);
    return () => { active = false; window.clearInterval(poll); };
  }, [applyPayload, loadStudio]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let noticeTimer = 0;
    const channel = supabase.channel("archic-studio-team", {
      config: { private: true, presence: { key: user.id }, broadcast: { self: false } },
    });
    realtimeRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, PresenceMember[]>;
        const unique = new Map<string, PresenceMember>();
        for (const presence of Object.values(state).flat()) {
          if (presence?.id) unique.set(presence.id, presence);
        }
        setOnlineMembers([...unique.values()]);
      })
      .on("broadcast", { event: "studio-change" }, ({ payload }: { payload: Record<string, unknown> }) => {
        const change = payload as { actorId?: string; actorName?: string; label?: string };
        if (change.actorId === user.id) return;
        setRemoteNotice(`${change.actorName || "El otro fundador"} ${change.label || "ha actualizado el Studio"}`);
        window.clearTimeout(noticeTimer);
        noticeTimer = window.setTimeout(() => setRemoteNotice(""), 4500);
        void loadStudio(true);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, (event: { new: Record<string, unknown> }) => {
        const record = event.new as { actor_id?: string };
        if (record.actor_id !== user.id) void loadStudio(true);
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          void channel.track({
            id: user.id,
            name: user.name,
            email: user.email,
            color: user.color,
            view: "Studio",
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      window.clearTimeout(noticeTimer);
      realtimeRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [loadStudio, user.color, user.email, user.id, user.name]);

  useEffect(() => {
    void realtimeRef.current?.track({
      id: user.id,
      name: user.name,
      email: user.email,
      color: user.color,
      view: projectModal.open ? "un proyecto" : clientModal.open ? "un cliente" : tab,
      onlineAt: new Date().toISOString(),
    });
  }, [clientModal.open, projectModal.open, tab, user.color, user.email, user.id, user.name]);

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

  const action = async (body: StudioActionBody) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/studio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({})) as StudioPayload & { error?: string };
      if (response.status === 401) {
        window.location.assign("/login");
        return null;
      }
      if (!response.ok) {
        if (response.status === 409) await loadStudio(true);
        throw new Error(payload.error || "No se pudo guardar el cambio.");
      }
      applyPayload(payload);
      const label = body.action === "createProject" ? "ha creado un proyecto"
        : body.action === "updateProject" ? "ha editado un proyecto"
        : body.action === "createClient" ? "ha añadido un cliente"
        : body.action === "updateClient" ? "ha actualizado un cliente"
        : body.action === "deleteProject" ? "ha eliminado un proyecto"
        : "ha actualizado el Studio";
      await realtimeRef.current?.send({
        type: "broadcast",
        event: "studio-change",
        payload: { actorId: user.id, actorName: user.name, label },
      });
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

  const signOut = async () => {
    setUserMenu(false);
    await getBrowserSupabase().auth.signOut();
    window.location.assign("/login");
  };

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
            <TeamPresence members={members} onlineMembers={onlineMembers} />
            <button className="icon-button notification" aria-label="Notificaciones"><Bell size={20} />{data.audits.filter((audit) => audit.status === "open").length ? <i /> : null}</button>
            <div className="user-control"><button className="user-chip" onClick={() => setUserMenu((current) => !current)} aria-expanded={userMenu}><span style={{ background: user.color }}>{user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><ChevronDown size={16} /></button>{userMenu ? <div className="user-menu"><span>Fundador {user.slot} de 2</span><button onClick={() => void signOut()}><LogOut />Cerrar sesión</button></div> : null}</div>
          </div>
        </header>

        <main className="main-content">
          {remoteNotice ? <div className="live-notice"><Radio /><span>{remoteNotice}</span></div> : null}
          {error ? <div className="error-banner"><AlertTriangle size={18} /><span>{error}</span><button onClick={() => setError("")}><X size={17} /></button></div> : null}
          {loading ? <div className="loading-screen"><Loader2 className="spin" /><p>Preparando Archic Studio...</p></div> : (
            <>
              {tab === "dashboard" ? <Dashboard name={user.name} currentUserId={user.id} data={data} members={members} activities={activities} onlineMembers={onlineMembers} activeProjects={activeProjects} readyProjects={readyProjects} attentionProjects={attentionProjects} averageScore={averageScore} onNew={() => openProject()} onOpen={openProject} onTab={setTab} /> : null}
              {tab === "projects" ? <ProjectsView projects={filteredProjects} clients={data.clients} saving={saving} onNew={() => openProject()} onOpen={openProject} onAudit={(id) => void action({ action: "runAudit", id })} onDelete={(id) => void action({ action: "deleteProject", id })} /> : null}
              {tab === "clients" ? <ClientsView clients={filteredClients} projects={data.projects} onNew={() => setClientModal({ open: true })} onEdit={(client) => setClientModal({ open: true, client })} /> : null}
              {tab === "compliance" ? <ComplianceView data={data} averageScore={averageScore} saving={saving} onAudit={(id) => void action({ action: "runAudit", id })} onOpen={openProject} /> : null}
              {tab === "templates" ? <TemplatesView onUse={(template) => { const project = { ...DEFAULT_DRAFT, template, primaryColor: TEMPLATES.find((item) => item.id === template)?.colors[0] || DEFAULT_DRAFT.primaryColor, accentColor: TEMPLATES.find((item) => item.id === template)?.colors[2] || DEFAULT_DRAFT.accentColor }; setProjectModal({ open: true, project: project as Project }); }} /> : null}
              {tab === "settings" ? <SettingsView /> : null}
            </>
          )}
        </main>
      </div>

      {projectModal.open ? <ProjectWizard clients={data.clients} project={projectModal.project} saving={saving} draftStorageKey={`${storageKey}:project-wizard`} onClose={() => setProjectModal({ open: false })} onSave={async (project) => { const payload = await action({ action: project.id ? "updateProject" : "createProject", project }); if (!payload) return undefined; return payload.projects.find((item) => item.id === project.id || item.id === payload.savedProjectId); }} /> : null}
      {clientModal.open ? <ClientModal client={clientModal.client} saving={saving} onClose={() => setClientModal({ open: false })} onSave={async (client) => { const ok = await action({ action: client.id ? "updateClient" : "createClient", client }); if (ok) setClientModal({ open: false }); }} /> : null}
    </div>
  );
}

function Dashboard({ name, currentUserId, data, members, activities, onlineMembers, activeProjects, readyProjects, attentionProjects, averageScore, onNew, onOpen, onTab }: {
  name: string; currentUserId: string; data: StudioData; members: StudioMember[]; activities: StudioActivity[]; onlineMembers: PresenceMember[]; activeProjects: number; readyProjects: number; attentionProjects: number; averageScore: number;
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
        {recent.length ? <div className="project-table"><div className="table-head"><span>Proyecto</span><span>Cliente</span><span>Actualización</span><span>Estado</span><span /></div>{recent.map((project) => <button className="table-row" key={project.id} onClick={() => onOpen(project)}><span className="project-cell"><i style={{ background: `linear-gradient(145deg, ${project.primaryColor}, ${project.accentColor})` }}>{project.name.slice(0, 1)}</i><b>{project.name}<small>{project.siteType === "ecommerce" ? "Tienda online" : project.siteType === "booking" ? "Web y reservas" : "Web corporativa"}</small></b></span><span>{getClient(project, data.clients)?.name || "Sin cliente"}</span><span>{formatDate(project.updatedAt)}</span><span><StatusBadge status={project.status} /></span><span><ChevronRight size={18} /></span></button>)}</div> : <EmptyState title="Añade el primer trabajo real" text="El Studio empieza vacío. Crea la ficha de una empresa con la que ya estéis trabajando y después su proyecto." action={<button className="primary-button small" onClick={onNew}><Plus size={17} />Añadir trabajo real</button>} />}
      </section>
      <div className="dashboard-side"><TeamPanel currentUserId={currentUserId} members={members} activities={activities} onlineMembers={onlineMembers} /><section className="panel compliance-panel"><div className="panel-heading"><div><p className="overline">Control</p><h2>Estado de cumplimiento</h2></div></div><ScoreRing score={averageScore} /><ul className="check-list"><li><Cookie size={18} /><span>Cookies y consentimiento</span><CheckCircle2 /></li><li><LockKeyhole size={18} /><span>Privacidad</span><CheckCircle2 /></li><li><FileCheck2 size={18} /><span>Formularios</span><CheckCircle2 /></li><li><Accessibility size={18} /><span>Accesibilidad</span><CheckCircle2 /></li></ul><button className="text-button centered" onClick={() => onTab("compliance")}>Ver detalles <ChevronRight size={17} /></button></section></div>
    </div>
  </div>;
}

function TeamPanel({ currentUserId, members, activities, onlineMembers }: { currentUserId: string; members: StudioMember[]; activities: StudioActivity[]; onlineMembers: PresenceMember[] }) {
  const onlineIds = new Set(onlineMembers.map((member) => member.id));
  const actor = (id: string) => members.find((member) => member.id === id);
  return <section className="panel team-panel"><div className="panel-heading"><div><p className="overline">Colaboración</p><h2>Equipo en vivo</h2></div><span className="live-pill"><i />En directo</span></div><div className="founder-list">{members.map((member) => <div key={member.id} className="founder-row"><span className="founder-avatar" style={{ background: member.color }}>{member.name.slice(0, 2).toUpperCase()}<i className={onlineIds.has(member.id) ? "online" : ""} /></span><div><strong>{member.id === currentUserId ? `${member.name} · tú` : member.name}</strong><small>{onlineIds.has(member.id) ? onlineMembers.find((online) => online.id === member.id)?.view === "un proyecto" ? "Editando un proyecto" : onlineMembers.find((online) => online.id === member.id)?.view === "un cliente" ? "Editando un cliente" : "En el Studio" : "Sin conexión"}</small></div><span className={onlineIds.has(member.id) ? "online-label" : "offline-label"}>{onlineIds.has(member.id) ? "En línea" : "Ausente"}</span></div>)}{members.length < 2 ? <div className="founder-row founder-pending"><span className="founder-avatar">02</span><div><strong>Segunda cuenta</strong><small>Invitación pendiente de activar</small></div></div> : null}</div><div className="activity-feed"><h3>Últimos cambios</h3>{activities.length ? activities.slice(0, 6).map((activity) => { const member = actor(activity.actorId); return <article key={activity.id}><span style={{ background: member?.color || "#8B8B84" }}>{member?.name.slice(0, 2).toUpperCase() || "A"}</span><p><strong>{member?.id === currentUserId ? "Tú" : member?.name || "Equipo"} {activity.action}</strong> {activity.entityName}<small>{activity.detail} · {formatRelativeTime(activity.createdAt)}</small></p></article>; }) : <div className="activity-empty"><Radio /><p>Los cambios reales de ambos fundadores aparecerán aquí.</p></div>}</div></section>;
}

function ProjectsView({ projects, clients, saving, onNew, onOpen, onAudit, onDelete }: { projects: Project[]; clients: Client[]; saving: boolean; onNew: () => void; onOpen: (project: Project) => void; onAudit: (id: string) => void; onDelete: (id: string) => void }) {
  return <div className="page"><div className="page-heading"><div><p className="overline">Producción</p><h1>Proyectos</h1><p>Construye, revisa y exporta cada web desde una misma base.</p></div><button className="primary-button" onClick={onNew}><Plus size={19} />Nuevo proyecto</button></div>
    {projects.length ? <div className="project-grid">{projects.map((project) => <article className="project-card" key={project.id}><button className="project-cover" onClick={() => onOpen(project)} style={{ "--project-primary": project.primaryColor, "--project-accent": project.accentColor } as React.CSSProperties}><div className="browser-dots"><i /><i /><i /></div><div className="cover-copy"><span>{getClient(project, clients)?.sector || "Servicios"}</span><strong>{getClient(project, clients)?.name || project.name}</strong><small>Vista base · {TEMPLATES.find((item) => item.id === project.template)?.name}</small></div></button><div className="project-card-body"><div><small>{getClient(project, clients)?.name}</small><h3>{project.name}</h3></div><StatusBadge status={project.status} /><div className="project-meta"><span><Globe2 size={15} />/{project.slug}</span><span><ShieldCheck size={15} />{project.complianceScore}%</span></div><div className="card-actions"><button onClick={() => onOpen(project)}><Eye size={16} />Abrir</button><button disabled={saving} onClick={() => onAudit(project.id)}><RefreshCw size={16} />Auditar</button><button className="danger-icon" aria-label="Eliminar proyecto" onClick={() => { if (window.confirm(`¿Eliminar ${project.name}?`)) onDelete(project.id); }}><Trash2 size={16} /></button></div></div></article>)}</div> : <EmptyState title="No hay resultados" text="Prueba otra búsqueda o crea un proyecto nuevo." action={<button className="primary-button small" onClick={onNew}><Plus size={17} />Nuevo proyecto</button>} />}
  </div>;
}

function ClientsView({ clients, projects, onNew, onEdit }: { clients: Client[]; projects: Project[]; onNew: () => void; onEdit: (client: Client) => void }) {
  return <div className="page"><div className="page-heading"><div><p className="overline">Trabajos reales</p><h1>Clientes</h1><p>Añade únicamente empresas con las que estéis trabajando. Sus datos comerciales y legales se reutilizan en todos sus proyectos.</p></div><button className="primary-button" onClick={onNew}><Plus size={19} />Añadir empresa real</button></div>
    {clients.length ? <div className="clients-grid">{clients.map((client) => { const clientProjects = projects.filter((project) => project.clientId === client.id); const score = clientProjects.length ? Math.round(clientProjects.reduce((sum, project) => sum + project.complianceScore, 0) / clientProjects.length) : 0; return <article className="client-card" key={client.id}><div className="client-card-top"><span>{client.name.slice(0, 2).toUpperCase()}</span><StatusBadge status="active" /></div><h3>{client.name}</h3><p>{client.sector} · {client.city || "Sin ciudad"}</p><dl><div><dt>Razón social</dt><dd>{client.legalName || "Pendiente"}</dd></div><div><dt>NIF/CIF</dt><dd>{client.taxId || "Pendiente"}</dd></div><div><dt>Contacto</dt><dd>{client.email || "Pendiente"}</dd></div></dl><div className="client-footer"><span>{clientProjects.length} {clientProjects.length === 1 ? "proyecto" : "proyectos"}</span><span className={score < 90 ? "warning-text" : "success-text"}><ShieldCheck size={15} />{score || "—"}{score ? "%" : ""}</span></div><button className="secondary-button client-edit" onClick={() => onEdit(client)}>Editar ficha legal</button></article>; })}</div> : <EmptyState title="El Studio está limpio" text="No hay ejemplos ni proyectos ficticios. Añade la primera empresa real para empezar a trabajar juntos." action={<button className="primary-button small" onClick={onNew}><Plus size={17} />Añadir empresa real</button>} />}
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
  return <section className="panel settings-section github-settings"><div className="settings-title"><Github /><div><h2>GitHub</h2><p>Repositorios privados y publicación directa desde cada proyecto.</p></div><span className={`connection-pill ${status?.connected ? "connected" : ""}`}><i />{loading ? "Comprobando" : status?.connected ? "Conectado" : "Pendiente"}</span></div>{status?.connected ? <div className="github-account"><span>{status.user?.login.slice(0, 2).toUpperCase()}</span><div><strong>{status.user?.name || status.user?.login}</strong><p>Los nuevos repositorios se crearán en <b>{status.owner}</b> y el token nunca se envía al navegador.</p></div><a href={status.user?.html_url} target="_blank" rel="noreferrer">Abrir perfil <ArrowUpRight /></a></div> : <div className="github-empty"><div><strong>Conecta una credencial de publicación segura</strong><p>Añade <code>GITHUB_TOKEN</code> y <code>GITHUB_OWNER</code> como secretos. En Vercel añade también <code>ARCHIC_PUBLISH_KEY</code> para impedir publicaciones anónimas.</p></div><button className="secondary-button" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} />Volver a comprobar</button></div>}</section>;
}

function SettingsView() {
  return <div className="page"><div className="page-heading"><div><p className="overline">Configuración</p><h1>Ajustes</h1><p>Guardas internas aplicadas a todos los nuevos proyectos.</p></div></div><div className="settings-layout"><GithubSettingsCard /><section className="panel settings-section"><div className="settings-title"><LockKeyhole /><div><h2>Datos del Studio</h2><p>Postgres compartido y protegido por cuentas personales.</p></div><span className="connection-pill connected"><i />En vivo</span></div><div className="github-empty"><div><strong>Una única fuente de verdad para los dos</strong><p>Clientes, proyectos, auditorías y actividad se guardan en Supabase. Los cambios se sincronizan entre navegadores y las revisiones simultáneas no se sobrescriben silenciosamente.</p></div></div></section><section className="panel settings-section"><div className="settings-title"><ShieldCheck /><div><h2>Reglas de publicación</h2><p>Bloqueos que evitan publicar una base incompleta.</p></div></div>{["Exigir datos legales del titular", "Bloquear scripts antes del consentimiento", "Incluir rechazo visible de cookies", "Exigir capa informativa en formularios", "Ejecutar revisión de accesibilidad"].map((item) => <label className="setting-row" key={item}><span>{item}</span><input type="checkbox" defaultChecked /><i /></label>)}</section><section className="panel settings-section"><div className="settings-title"><Code2 /><div><h2>Exportación</h2><p>Valores comunes en los proyectos generados.</p></div></div><label className="field"><span>Nombre de la organización</span><input defaultValue="Archic" /></label><label className="field"><span>Dominio de trabajo</span><input defaultValue="archic.es" /></label><label className="field"><span>Firma del generador</span><select defaultValue="hidden"><option value="hidden">No mostrar</option><option value="footer">Mostrar en el pie</option></select></label><button className="primary-button"><Save size={17} />Guardar ajustes</button></section></div>
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
    revision: existingClient.revision,
    createdBy: existingClient.createdBy,
    updatedBy: existingClient.updatedBy,
  } : { id: "", name: "", legalName: "", taxId: "", email: "", phone: "", address: "", city: "", country: "España", sector: "Servicios", registryData: "", professionalData: "", revision: 1, createdBy: "", updatedBy: "" });
  const update = (key: keyof typeof client, value: string) => setClient((current) => ({ ...current, [key]: value }));
  return <div className="modal-backdrop" role="presentation">
    <section className="modal-card client-modal" role="dialog" aria-modal="true" aria-labelledby="client-title">
      <div className="modal-header"><div><p className="overline">Ficha reutilizable</p><h2 id="client-title">{existingClient ? "Editar cliente" : "Añadir empresa real"}</h2></div><button onClick={onClose} aria-label="Cerrar"><X /></button></div>
      <div className="form-grid">
        <label className="field"><span>Nombre comercial *</span><input autoFocus value={client.name} onChange={(event) => update("name", event.target.value)} placeholder="Nombre real de la empresa" /></label>
        <label className="field"><span>Sector</span><input value={client.sector} onChange={(event) => update("sector", event.target.value)} /></label>
        <label className="field"><span>Razón social</span><input value={client.legalName} onChange={(event) => update("legalName", event.target.value)} /></label>
        <label className="field"><span>NIF / CIF</span><input value={client.taxId} onChange={(event) => update("taxId", event.target.value)} /></label>
        <label className="field"><span>Correo de contacto y privacidad</span><input type="email" value={client.email} onChange={(event) => update("email", event.target.value)} /></label>
        <label className="field"><span>Teléfono</span><input value={client.phone} onChange={(event) => update("phone", event.target.value)} /></label>
        <label className="field wide"><span>Dirección completa</span><input value={client.address} onChange={(event) => update("address", event.target.value)} /></label>
        <label className="field"><span>Ciudad</span><input value={client.city} onChange={(event) => update("city", event.target.value)} /></label>
        <label className="field"><span>País</span><input value={client.country} onChange={(event) => update("country", event.target.value)} /></label>
        <label className="field wide"><span>Datos registrales · si aplica</span><textarea rows={2} value={client.registryData} onChange={(event) => update("registryData", event.target.value)} placeholder="Registro, tomo, folio, hoja e inscripción" /></label>
        <label className="field wide"><span>Profesión regulada o autorización · si aplica</span><textarea rows={2} value={client.professionalData} onChange={(event) => update("professionalData", event.target.value)} placeholder="Colegio, número, título, autoridad o licencia" /></label>
      </div>
      <div className="modal-footer"><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={!client.name.trim() || saving} onClick={() => onSave(client)}>{saving ? <Loader2 className="spin" /> : <Save />}Guardar ficha</button></div>
    </section>
  </div>;
}

function ProjectWizard({ clients, project, saving, draftStorageKey, onClose, onSave }: { clients: Client[]; project?: Project; saving: boolean; draftStorageKey: string; onClose: () => void; onSave: (project: ProjectDraft) => Promise<Project | undefined> }) {
  const [initial] = useState(() => {
    const recovery = project ? null : parseProjectDraftRecovery(window.localStorage.getItem(draftStorageKey));
    const draft = recovery
      ? createProjectDraft(recovery.draft as unknown as Partial<ProjectDraft>, clients[0]?.id || "")
      : createRecommendedProjectDraft(project, clients[0]?.id || "");
    return { draft, recovery, step: recovery?.step ?? 1 };
  });
  const [step, setStep] = useState(initial.step);
  const [draft, setDraft] = useState<ProjectDraft>(initial.draft);
  const [visitedSteps, setVisitedSteps] = useState(() => new Set(Array.from({ length: initial.step }, (_, index) => index + 1)));
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [saved, setSaved] = useState(false);
  const [recoveredAt, setRecoveredAt] = useState(initial.recovery?.savedAt || "");
  const [autoSavedAt, setAutoSavedAt] = useState(initial.recovery?.savedAt || "");
  const contentRef = useRef<HTMLDivElement>(null);
  const client = getClient(draft, clients);
  const html = useMemo(() => buildWebsiteHtml(client, draft), [client, draft]);
  const assessment = useMemo(() => assessProject(client, draft), [client, draft]);
  const flowSteps = useMemo(() => getProjectFlowSteps(client, draft), [client, draft]);
  const currentFlowStep = flowSteps[step - 1];
  const completedSteps = flowSteps.slice(0, 5).filter((item, index) => item.complete && visitedSteps.has(index + 1)).length;
  const score = assessment.score;

  useEffect(() => {
    if (draft.id || saved || !hasMeaningfulDraft(draft, step)) return;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(draftStorageKey, JSON.stringify({ version: 1, savedAt, step, draft }));
      setAutoSavedAt(savedAt);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [draft, draftStorageKey, saved, step]);

  const markChanged = () => setSaved(false);
  const update = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => {
    markChanged();
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const updateBrief = <K extends keyof BusinessBrief>(key: K, value: BusinessBrief[K]) => {
    markChanged();
    setDraft((current) => ({ ...current, brief: { ...current.brief, [key]: value } }));
  };
  const updateLegalProfile = <K extends keyof LegalProfile>(key: K, value: LegalProfile[K]) => {
    markChanged();
    setDraft((current) => ({ ...current, legalProfile: { ...current.legalProfile, [key]: value } }));
  };
  const toggleArray = (key: "sections" | "integrations", value: string) => {
    markChanged();
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  };
  const toggleLegal = (key: string) => {
    markChanged();
    setDraft((current) => ({ ...current, legal: { ...current.legal, [key]: !current.legal[key] } }));
  };
  const selectProjectType = (siteType: string) => {
    markChanged();
    setDraft((current) => applyProjectTypePreset(current, siteType));
  };
  const goToStep = (nextStep: number) => {
    setVisitedSteps((current) => new Set(current).add(nextStep));
    setStep(nextStep);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };
  const persistBeforeClose = () => {
    if (!draft.id && hasMeaningfulDraft(draft, step)) {
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(draftStorageKey, JSON.stringify({ version: 1, savedAt, step, draft }));
    }
    onClose();
  };
  const discardRecovery = () => {
    window.localStorage.removeItem(draftStorageKey);
    setDraft(createRecommendedProjectDraft(project, clients[0]?.id || ""));
    setStep(1);
    setVisitedSteps(new Set([1]));
    setRecoveredAt("");
    setAutoSavedAt("");
    setSaved(false);
  };
  const saveProject = async (changes: Partial<ProjectDraft> = {}) => {
    const result = await onSave({ ...draft, ...changes, status: assessment.status });
    if (!result) return;
    setDraft(createProjectDraft(result));
    setSaved(true);
    setRecoveredAt("");
    setAutoSavedAt("");
    window.localStorage.removeItem(draftStorageKey);
  };

  const requiresCompletion = step <= 3;
  const nextDisabled = requiresCompletion && !currentFlowStep.complete;
  const canSaveDraft = flowSteps.slice(0, 3).every((item) => item.complete);
  const footerMessage = saved
    ? "Proyecto guardado"
    : nextDisabled
      ? `Falta: ${currentFlowStep.missing.join(", ")}`
      : step === 6 && !canSaveDraft
        ? "Completa Proyecto, Empresa y Diseño para guardar"
      : step === 4
        ? "Elige solo los servicios necesarios"
        : step === 5 && currentFlowStep.missing.length
          ? `${currentFlowStep.missing.length} bloqueos aparecerán en la revisión`
          : currentFlowStep.complete
            ? "Paso preparado"
            : "Puedes revisar el resultado";

  return <div className="wizard-shell" role="dialog" aria-modal="true" aria-label="Constructor de proyecto"><aside className="wizard-sidebar"><div className="wizard-brand"><span className="brand-emblem small"><i /><b>A</b></span><span>Archic Studio</span></div><div className="wizard-steps">{flowSteps.map((item, index) => { const number = index + 1; const isDone = item.complete && visitedSteps.has(number) && step !== number; const needsAttention = !item.complete && visitedSteps.has(number) && step !== number; return <button key={item.id} className={`${step === number ? "active" : ""} ${isDone ? "done" : ""} ${needsAttention ? "attention" : ""}`} onClick={() => goToStep(number)} aria-current={step === number ? "step" : undefined}><span>{isDone ? <Check size={15} /> : number}</span><div><strong>{item.label}</strong><small>{step === number ? item.description : isDone ? "Listo" : needsAttention ? `${item.missing.length} pendiente${item.missing.length === 1 ? "" : "s"}` : item.description}</small></div></button>; })}</div><div className="wizard-score"><div><Sparkles /><span>Progreso del proyecto</span></div><strong>{completedSteps}/5</strong><div className="audit-progress"><i style={{ width: `${completedSteps * 20}%` }} /></div><small>{assessment.blockers.length ? `${assessment.blockers.length} controles críticos por cerrar` : score >= 90 ? "Preparada para verificación final" : "Sin bloqueos; puedes mejorar el contenido"}</small></div></aside>
    <div className="wizard-main"><header className="wizard-header"><button className="back-button" onClick={persistBeforeClose}><ArrowLeft size={19} />Volver al estudio</button><div><span>Paso {step} de {flowSteps.length} · {project?.id ? "Editando" : "Nuevo proyecto"}</span><strong>{currentFlowStep.label}{draft.name ? ` · ${draft.name}` : ""}</strong></div><button className="icon-button" onClick={persistBeforeClose} aria-label="Cerrar y guardar borrador"><X /></button></header>
      <div className="wizard-mobile-progress" aria-label={`Paso ${step} de ${flowSteps.length}`}><span style={{ width: `${(step / flowSteps.length) * 100}%` }} /></div>
      <div className="wizard-content" ref={contentRef}>
        {recoveredAt ? <div className="recovery-banner"><Save /><div><strong>Hemos recuperado tu borrador</strong><p>Continúas desde el paso {initial.recovery?.step ?? step}. Guardado {formatDate(recoveredAt)} en este navegador.</p></div><button onClick={discardRecovery}>Empezar de cero</button></div> : null}
        {step === 1 ? <WizardProject draft={draft} clients={clients} update={update} onSelectType={selectProjectType} /> : null}
        {step === 2 ? <WizardBusiness draft={draft} client={client} update={updateBrief} /> : null}
        {step === 3 ? <WizardDesign draft={draft} update={update} toggleSection={(value) => toggleArray("sections", value)} /> : null}
        {step === 4 ? <WizardIntegrations draft={draft} toggle={(value) => toggleArray("integrations", value)} /> : null}
        {step === 5 ? <WizardLegal draft={draft} client={client} toggle={toggleLegal} update={updateLegalProfile} assessment={assessment} /> : null}
        {step === 6 ? <WizardPreview draft={draft} client={client} html={html} device={device} setDevice={setDevice} assessment={assessment} onPublished={(publication) => saveProject(publication)} /> : null}
      </div>
      <footer className="wizard-footer"><div>{step > 1 ? <button className="secondary-button" onClick={() => goToStep(step - 1)}>Anterior</button> : <span />}</div><div className="wizard-footer-actions"><div className={nextDisabled || (step === 6 && !canSaveDraft) ? "wizard-footer-status incomplete" : "wizard-footer-status"}><strong>{footerMessage}</strong><small>{autoSavedAt && !draft.id ? "Borrador protegido automáticamente" : `Paso ${step} de ${flowSteps.length}`}</small></div>{step < flowSteps.length ? <button className="primary-button" disabled={nextDisabled} onClick={() => goToStep(step + 1)}>{step === 5 ? "Revisar resultado" : "Continuar"} <ChevronRight size={18} /></button> : <><button className="secondary-button" onClick={() => { downloadText(`${draft.slug || "sitio"}.html`, html, "text/html"); }}><Download size={17} />Exportar HTML</button><button className="primary-button" disabled={saving || !canSaveDraft} onClick={() => void saveProject()}>{saving ? <Loader2 className="spin" /> : saved ? <Check /> : <Save />}{saved ? "Guardado" : "Guardar proyecto"}</button></>}</div></footer>
    </div>
  </div>;
}

function WizardProject({ draft, clients, update, onSelectType }: { draft: ProjectDraft; clients: Client[]; update: <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => void; onSelectType: (siteType: string) => void }) {
  const selectedClient = clients.find((client) => client.id === draft.clientId);
  const preset = getProjectTypePreset(draft.siteType);
  const legalFields = selectedClient ? [selectedClient.legalName, selectedClient.taxId, selectedClient.address, selectedClient.email].filter(Boolean).length : 0;
  const typeIcons = { corporate: Building2, booking: Globe2, ecommerce: FolderKanban };
  const sectionLabels = preset.sections.map((id) => SECTION_OPTIONS.find((section) => section.id === id)?.label).filter(Boolean);
  const integrationLabels = preset.integrations.map((id) => INTEGRATIONS.find((integration) => integration.id === id)?.label).filter(Boolean);

  return <div className="wizard-step"><div className="step-heading"><p className="overline">01 · Inicio rápido</p><h1>Empecemos por lo esencial.</h1><p>Elige la empresa y el resultado que necesitas. Archic prepara una estructura inicial que podrás ajustar en los siguientes pasos.</p></div><div className="step-card project-basics"><div className="step-card-heading"><span>1</span><div><strong>Identifica el proyecto</strong><small>Tres datos para poder guardarlo y encontrarlo después.</small></div>{selectedClient ? <em className={legalFields === 4 ? "complete" : ""}>{legalFields === 4 ? <Check /> : <AlertTriangle />}{legalFields}/4 datos legales</em> : null}</div><div className="form-grid"><label className="field wide"><span>Cliente *</span><select value={draft.clientId} onChange={(event) => update("clientId", event.target.value)}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.city || client.sector}</option>)}</select><small>La ficha del cliente se reutiliza en la web y en los documentos legales.</small></label><label className="field"><span>Nombre del proyecto *</span><input autoFocus value={draft.name} onChange={(event) => { update("name", event.target.value); if (!draft.id) update("slug", slugify(event.target.value)); }} placeholder={selectedClient ? `Nueva web de ${selectedClient.name}` : "Ej. Web corporativa 2026"} /></label><label className="field"><span>Ruta del proyecto *</span><div className="slug-field"><span>/</span><input value={draft.slug} onChange={(event) => update("slug", slugify(event.target.value))} placeholder="nombre-del-proyecto" /></div></label></div>{!draft.name && selectedClient ? <button className="inline-suggestion" onClick={() => { const suggestion = `Nueva web de ${selectedClient.name}`; update("name", suggestion); update("slug", slugify(suggestion)); }}><Sparkles />Usar nombre sugerido: «Nueva web de {selectedClient.name}»</button> : null}</div><div className="step-card-heading outside"><span>2</span><div><strong>¿Qué debe conseguir esta web?</strong><small>Al elegir, adaptamos secciones, integraciones, llamada a la acción y controles de venta.</small></div></div><div className="site-type-grid">{PROJECT_TYPE_PRESETS.map((type) => { const Icon = typeIcons[type.id]; return <button key={type.id} className={draft.siteType === type.id ? "selected" : ""} onClick={() => onSelectType(type.id)} aria-pressed={draft.siteType === type.id}><Icon /><span><strong>{type.label}</strong><small>{type.description}</small><em>{type.outcome}</em></span>{draft.siteType === type.id ? <CheckCircle2 /> : null}</button>; })}</div><div className="preset-summary"><Sparkles /><div><span>Base recomendada para {preset.label}</span><strong>{preset.objective}</strong><p>Incluye {sectionLabels.join(", ")}.</p><div>{integrationLabels.map((label) => <em key={label}>{label}</em>)}</div><small>Si cambias el tipo, actualizamos esta base sin sobrescribir tus textos propios.</small></div></div></div>;
}

function WizardBusiness({ draft, client, update }: { draft: ProjectDraft; client?: Client; update: <K extends keyof BusinessBrief>(key: K, value: BusinessBrief[K]) => void }) {
  const essentials = [
    { label: "Objetivo", complete: Boolean(draft.brief.objective?.trim()) },
    { label: "Público", complete: Boolean(draft.brief.audience?.trim()) },
    { label: "Propuesta", complete: Boolean(draft.brief.valueProposition?.trim()) },
  ];

  return <div className="wizard-step"><div className="step-heading"><p className="overline">02 · Briefing empresarial</p><h1>Cuéntanos qué hace única a la empresa.</h1><p>Empieza por tres respuestas esenciales. Después añade las pruebas y matices que harán que la web no se parezca a ninguna otra.</p></div><div className="brief-context"><Building2 /><div><strong>{client?.name || "Cliente pendiente"}</strong><p>{client?.sector || "Sector pendiente"} · {client?.city || "Área pendiente"}</p></div><span>Fuente común de verdad</span></div><div className="essential-progress" aria-label="Campos esenciales">{essentials.map((item, index) => <span key={item.label} className={item.complete ? "complete" : ""}>{item.complete ? <Check /> : index + 1}<b>{item.label}</b></span>)}</div><section className="brief-section"><div className="step-card-heading outside"><span>1</span><div><strong>Define la dirección</strong><small>Estas tres respuestas son obligatorias y guían todo el contenido.</small></div></div><div className="brief-grid"><label className="field"><span>Objetivo principal *</span><select value={draft.brief.objective || ""} onChange={(event) => update("objective", event.target.value)}><option value="">Seleccionar objetivo</option><option value="Generar solicitudes cualificadas">Generar solicitudes</option><option value="Conseguir reservas">Conseguir reservas</option><option value="Vender productos online">Vender online</option><option value="Presentar la empresa y generar confianza">Presentar la empresa</option><option value="Mostrar proyectos y capacidades">Mostrar proyectos</option></select></label><label className="field"><span>Voz de marca</span><select value={draft.brief.tone || "cercano"} onChange={(event) => update("tone", event.target.value)}><option value="cercano">Cercana y clara</option><option value="experto">Experta y precisa</option><option value="audaz">Directa y audaz</option><option value="sereno">Serena y premium</option><option value="artesano">Artesana y humana</option></select></label><label className="field wide"><span>Público prioritario *</span><textarea rows={3} value={draft.brief.audience || ""} onChange={(event) => update("audience", event.target.value)} placeholder="Quién decide, qué necesita y en qué zona o contexto" /><small>No escribas “todo el mundo”: concreta quién debe sentirse reconocido.</small></label><label className="field wide"><span>Propuesta de valor *</span><textarea rows={3} value={draft.brief.valueProposition || ""} onChange={(event) => update("valueProposition", event.target.value)} placeholder="Qué resuelve la empresa, para quién y por qué resulta preferible" /><small>Una fórmula útil: ayudamos a [público] a conseguir [resultado] mediante [diferencia real].</small></label></div></section><section className="brief-section"><div className="step-card-heading outside"><span>2</span><div><strong>Hazla reconocible</strong><small>Añade información real: el generador no inventará servicios, cifras ni argumentos.</small></div><em>{(draft.brief.services?.length || 0) + (draft.brief.differentiators?.length || 0) + (draft.brief.proofPoints?.length || 0)} datos añadidos</em></div><div className="brief-grid"><label className="field wide"><span>Servicios reales · uno por línea</span><textarea rows={6} value={joinLines(draft.brief.services)} onChange={(event) => update("services", splitLines(event.target.value))} placeholder={"Servicio | beneficio concreto para el cliente\nServicio | qué incluye o qué problema resuelve"} /><small>Usa «Nombre | explicación» para crear tarjetas específicas, no bloques genéricos.</small></label><label className="field"><span>Diferenciales · uno por línea</span><textarea rows={5} value={joinLines(draft.brief.differentiators)} onChange={(event) => update("differentiators", splitLines(event.target.value))} placeholder={"Método o ventaja demostrable\nOtra razón real para elegir la empresa"} /></label><label className="field"><span>Pruebas y señales de confianza</span><textarea rows={5} value={joinLines(draft.brief.proofPoints)} onChange={(event) => update("proofPoints", splitLines(event.target.value))} placeholder={"Caso, cifra, certificación o resultado\nÁrea de especialización demostrable"} /></label><label className="field wide"><span>Historia y forma de trabajar</span><textarea rows={5} value={draft.brief.aboutStory || ""} onChange={(event) => update("aboutStory", event.target.value)} placeholder="Origen, método, criterio y forma concreta de acompañar al cliente" /></label><label className="field"><span>Acción principal</span><input value={draft.brief.primaryCta || ""} onChange={(event) => update("primaryCta", event.target.value)} placeholder="Ej. Pedir propuesta" /></label><label className="field"><span>Palabras clave · una por línea</span><textarea rows={3} value={joinLines(draft.brief.seoKeywords)} onChange={(event) => update("seoKeywords", splitLines(event.target.value))} placeholder={"servicio + ciudad\nespecialidad + zona"} /></label></div></section></div>;
}

function WizardDesign({ draft, update, toggleSection }: { draft: ProjectDraft; update: <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => void; toggleSection: (value: string) => void }) {
  const selectedTemplate = TEMPLATES.find((template) => template.id === draft.template);
  return <div className="wizard-step"><div className="step-heading"><p className="overline">03 · Dirección creativa</p><h1>Dale una voz y una forma propias.</h1><p>Elige una dirección visual, prepara el mensaje de portada y confirma la estructura. Todo parte del briefing anterior.</p></div><div className="step-card-heading outside"><span>1</span><div><strong>Elige una dirección</strong><small>No es una plantilla cerrada: cambia tipografía, ritmo y composición.</small></div><em>{selectedTemplate?.name}</em></div><div className="template-picker">{TEMPLATES.map((template) => <button key={template.id} className={draft.template === template.id ? "selected" : ""} onClick={() => { update("template", template.id); update("primaryColor", template.colors[0]); update("accentColor", template.colors[2]); }}><div className={`template-mini template-${template.id}`}><span /><strong>{template.name}</strong><i /></div><span><strong>{template.name}</strong><small>{template.style}</small><em>{template.description}</em></span>{draft.template === template.id ? <CheckCircle2 /> : null}</button>)}</div><div className="step-card-heading outside design-heading"><span>2</span><div><strong>Escribe la portada</strong><small>Una idea principal y una explicación concreta son suficientes para empezar.</small></div></div>{!draft.headline && draft.brief.valueProposition ? <div className="copy-suggestion"><Sparkles /><div><strong>Ya tienes una buena base en el briefing</strong><p>{draft.brief.valueProposition}</p></div><button onClick={() => update("headline", draft.brief.valueProposition || "")}>Usarla como titular</button></div> : null}<div className="design-copy-grid"><label className="field wide"><span>Titular principal *</span><textarea rows={2} value={draft.headline} onChange={(event) => update("headline", event.target.value)} placeholder="La frase que debe dominar la portada" /></label><label className="field wide"><span>Texto de apoyo *</span><textarea rows={2} value={draft.subheadline} onChange={(event) => update("subheadline", event.target.value)} placeholder="Qué ofrece la empresa, para quién y con qué diferencia" /></label><label className="field wide image-url-field"><span><ImageIcon /> Imagen de portada · URL HTTPS opcional</span><input type="url" value={draft.heroImageUrl} onChange={(event) => update("heroImageUrl", event.target.value)} placeholder="https://..." /><small>Si no añades imagen, el sistema crea una composición gráfica propia de la dirección elegida.</small></label></div><div className="design-controls"><label className="color-field"><span>Color principal</span><div><input type="color" value={draft.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} /><code>{draft.primaryColor}</code></div></label><label className="color-field"><span>Color de acento</span><div><input type="color" value={draft.accentColor} onChange={(event) => update("accentColor", event.target.value)} /><code>{draft.accentColor}</code></div></label></div><div className="step-card-heading outside"><span>3</span><div><strong>Confirma la estructura</strong><small>Partimos de la recomendación del tipo de web; añade o quita lo que necesites.</small></div><em>{draft.sections.length} secciones</em></div><div className="section-picker">{SECTION_OPTIONS.map((section) => <button key={section.id} className={draft.sections.includes(section.id) ? "selected" : ""} onClick={() => toggleSection(section.id)}><span>{draft.sections.includes(section.id) ? <Check /> : <Plus />}</span><div><strong>{section.label}</strong><small>{section.description}</small></div></button>)}</div></div>;
}

function WizardIntegrations({ draft, toggle }: { draft: ProjectDraft; toggle: (value: string) => void }) {
  const preset = getProjectTypePreset(draft.siteType);
  const recommended = new Set(preset.integrations);
  const recommendedSelected = preset.integrations.filter((id) => draft.integrations.includes(id)).length;
  const integrations = [...INTEGRATIONS].sort((a, b) => Number(recommended.has(b.id)) - Number(recommended.has(a.id)));
  const applyRecommended = () => preset.integrations.filter((id) => !draft.integrations.includes(id)).forEach(toggle);

  return <div className="wizard-step"><div className="step-heading"><p className="overline">04 · Servicios externos</p><h1>Conecta solo lo que aporta valor.</h1><p>Te sugerimos una base para {preset.label.toLowerCase()}. Puedes continuar sin servicios externos o activar únicamente los que vayas a configurar de verdad.</p></div><div className="integration-recommendation"><Sparkles /><div><span>Recomendación inteligente</span><strong>{recommendedSelected} de {preset.integrations.length} sugerencias activas</strong><p>{preset.outcome}</p></div>{recommendedSelected < preset.integrations.length ? <button onClick={applyRecommended}>Aplicar recomendadas</button> : <em><Check />Base aplicada</em>}</div><div className="integration-note"><ShieldCheck /><div><strong>Privacidad desde el diseño</strong><p>Las integraciones no esenciales se exportan con puntos de carga bloqueados y no pueden ejecutarse hasta que el visitante elija.</p></div></div><div className="integration-list">{integrations.map((integration) => <button key={integration.id} className={draft.integrations.includes(integration.id) ? "selected" : ""} onClick={() => toggle(integration.id)} aria-pressed={draft.integrations.includes(integration.id)}><span className="integration-logo">{integration.label.slice(0, 2).toUpperCase()}</span><div><strong>{integration.label}{recommended.has(integration.id) ? <b>Recomendada</b> : null}</strong><small>{integration.categoryLabel} · {integration.provider}</small></div>{integration.needsConsent ? <em><Cookie size={14} />Consentimiento previo</em> : <em className="neutral">Solo tras interacción</em>}<span className="toggle"><i /></span></button>)}</div><p className="optional-note"><CheckCircle2 />Este paso no tiene campos obligatorios. La auditoría solo exigirá consentimiento para lo que actives.</p></div>;
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
  const identityReady = Boolean(client?.legalName && client.taxId && client.address && client.email);
  const privacyFacts = [draft.legalProfile.dataCategories, draft.legalProfile.privacyPurposes, draft.legalProfile.legalBasis, draft.legalProfile.retention, draft.legalProfile.recipients, draft.legalProfile.internationalTransfers];
  const privacyFactsReady = privacyFacts.filter((value) => value?.trim()).length;
  const needsConsentControls = INTEGRATIONS.some((integration) => integration.needsConsent && draft.integrations.includes(integration.id));
  const essentialControls = [
    draft.legal.legalNotice,
    draft.legal.privacy,
    draft.legal.formNotices,
    draft.legal.accessibility,
    draft.legal.security,
    ...(needsConsentControls ? [draft.legal.cookieBanner, draft.legal.scriptBlocking] : []),
    ...(draft.siteType === "ecommerce" ? [draft.legal.terms, draft.legal.returns] : []),
  ];
  const essentialControlsReady = essentialControls.filter(Boolean).length;

  return <div className="wizard-step"><div className="step-heading"><p className="overline">05 · Cumplimiento</p><h1>Primero los hechos; después, los textos.</h1><p>Completa tres bloques en orden. La documentación se compone con los datos reales y marca cualquier hueco que impida publicar.</p></div><div className="legal-roadmap"><article className={identityReady ? "complete" : ""}><span>{identityReady ? <Check /> : 1}</span><div><strong>Titular</strong><small>{identityReady ? "Identidad completa" : "Completar ficha del cliente"}</small></div></article><article className={privacyFactsReady === privacyFacts.length ? "complete" : ""}><span>{privacyFactsReady === privacyFacts.length ? <Check /> : 2}</span><div><strong>Uso de datos</strong><small>{privacyFactsReady}/{privacyFacts.length} hechos documentados</small></div></article><article className={essentialControlsReady === essentialControls.length ? "complete" : ""}><span>{essentialControlsReady === essentialControls.length ? <Check /> : 3}</span><div><strong>Controles</strong><small>{essentialControlsReady}/{essentialControls.length} esenciales activos</small></div></article></div>{!identityReady ? <div className="integration-note warning"><AlertTriangle /><div><strong>Ficha del titular incompleta</strong><p>Vuelve a Clientes para completar razón social, NIF/CIF, domicilio y correo. No se pueden sustituir por fórmulas genéricas.</p></div></div> : null}<section className="legal-facts"><div className="section-heading compact"><div><p className="overline">2 · Registro de privacidad</p><h2>Qué ocurre realmente con los datos</h2></div><span>{privacyFactsReady}/{privacyFacts.length} completos</span></div><div className="legal-profile-grid"><label className="field"><span>Categorías de datos *</span><textarea rows={3} value={draft.legalProfile.dataCategories || ""} onChange={(event) => update("dataCategories", event.target.value)} placeholder="Identificativos, contacto, datos del pedido…" /></label><label className="field"><span>Finalidades concretas *</span><textarea rows={3} value={draft.legalProfile.privacyPurposes || ""} onChange={(event) => update("privacyPurposes", event.target.value)} placeholder="Responder consultas, gestionar reservas…" /></label><label className="field"><span>Base jurídica por finalidad *</span><textarea rows={3} value={draft.legalProfile.legalBasis || ""} onChange={(event) => update("legalBasis", event.target.value)} placeholder="Medidas precontractuales, contrato, consentimiento…" /></label><label className="field"><span>Conservación *</span><textarea rows={3} value={draft.legalProfile.retention || ""} onChange={(event) => update("retention", event.target.value)} placeholder="Plazo o criterio verificable" /></label><label className="field"><span>Destinatarios y encargados *</span><textarea rows={3} value={draft.legalProfile.recipients || ""} onChange={(event) => update("recipients", event.target.value)} placeholder="Proveedor de formularios, reservas, asesoría…" /></label><label className="field"><span>Transferencias internacionales *</span><textarea rows={3} value={draft.legalProfile.internationalTransfers || ""} onChange={(event) => update("internationalTransfers", event.target.value)} placeholder="No previstas, o proveedor, país y garantía" /></label><label className="field"><span>Correo del DPD · si aplica</span><input type="email" value={draft.legalProfile.dpoEmail || ""} onChange={(event) => update("dpoEmail", event.target.value)} placeholder="dpd@empresa.es" /></label><label className="field"><span>Última revisión documentada</span><input type="date" value={draft.legalProfile.lastReviewedAt || ""} onChange={(event) => update("lastReviewedAt", event.target.value)} /></label></div><div className="risk-grid"><label className={draft.legalProfile.marketing ? "active" : ""}><input type="checkbox" checked={Boolean(draft.legalProfile.marketing)} onChange={(event) => update("marketing", event.target.checked)} /><span><strong>Comunicaciones comerciales</strong><small>Añade consentimiento separado y voluntario.</small></span></label><label className={draft.legalProfile.minors ? "active risk" : ""}><input type="checkbox" checked={Boolean(draft.legalProfile.minors)} onChange={(event) => update("minors", event.target.checked)} /><span><strong>Datos de menores</strong><small>Activa revisión específica de edad y autorización.</small></span></label><label className={draft.legalProfile.specialCategories ? "active risk" : ""}><input type="checkbox" checked={Boolean(draft.legalProfile.specialCategories)} onChange={(event) => update("specialCategories", event.target.checked)} /><span><strong>Datos especialmente protegidos</strong><small>Salud, biometría, creencias u otras categorías especiales.</small></span></label><label className={draft.legalProfile.profiling ? "active risk" : ""}><input type="checkbox" checked={Boolean(draft.legalProfile.profiling)} onChange={(event) => update("profiling", event.target.checked)} /><span><strong>Perfilado o decisiones automáticas</strong><small>Exige explicar lógica, relevancia y consecuencias.</small></span></label></div>{riskDeclared ? <label className="professional-review"><input type="checkbox" checked={Boolean(draft.legalProfile.professionalReview)} onChange={(event) => update("professionalReview", event.target.checked)} /><ShieldCheck /><span><strong>Revisión profesional documentada</strong><small>Marca únicamente después de revisar el tratamiento de riesgo y guardar la evidencia fuera del texto web.</small></span></label> : null}{draft.siteType === "ecommerce" ? <div className="commerce-fields"><div className="section-heading compact"><div><p className="overline">Venta a distancia</p><h2>Condiciones comerciales reales</h2></div></div><div className="legal-profile-grid"><label className="field"><span>Medios de pago *</span><textarea rows={3} value={draft.legalProfile.paymentMethods || ""} onChange={(event) => update("paymentMethods", event.target.value)} /></label><label className="field"><span>Entrega o ejecución *</span><textarea rows={3} value={draft.legalProfile.deliveryTerms || ""} onChange={(event) => update("deliveryTerms", event.target.value)} placeholder="Zona, plazo, transportista y restricciones" /></label><label className="field"><span>Costes de devolución *</span><textarea rows={3} value={draft.legalProfile.returnCosts || ""} onChange={(event) => update("returnCosts", event.target.value)} /></label><label className="field"><span>Desistimiento y excepciones *</span><textarea rows={3} value={draft.legalProfile.withdrawalInfo || ""} onChange={(event) => update("withdrawalInfo", event.target.value)} placeholder="Plazo, canal, modelo y excepción si existe" /></label></div></div> : null}</section><div className="audit-inline"><div><ShieldCheck /><span><strong>Evaluación de configuración</strong><small>{assessment.blockers.length} bloqueos · {assessment.warnings.length} advertencias</small></span></div>{findings.length ? <ul>{findings.map((finding) => <li key={finding.id} className={finding.severity}><span>{finding.severity === "critical" ? "Bloqueo" : "Revisar"}</span><div><strong>{finding.label}</strong><small>{finding.detail}</small></div></li>)}</ul> : <p><CheckCircle2 />La configuración no presenta hallazgos. Aún debe verificarse el sitio desplegado.</p>}</div><div className="step-card-heading outside"><span>3</span><div><strong>Activa los controles y revisa los textos</strong><small>Los documentos reflejan automáticamente los hechos e integraciones anteriores.</small></div><em>{essentialControlsReady}/{essentialControls.length} esenciales</em></div><div className="legal-workspace"><div className="legal-controls">{controls.map((control) => { const Icon = control.icon; return <button key={control.id} className={draft.legal[control.id] ? "active" : ""} onClick={() => toggle(control.id)}><Icon /><span><strong>{control.label}</strong><small>{draft.legal[control.id] ? "Incluido en el paquete" : "Desactivado"}</small></span><span className="toggle"><i /></span></button>; })}</div><div className="document-preview"><div className="doc-tabs"><button className={doc === "privacy" ? "active" : ""} onClick={() => setDoc("privacy")}>Privacidad</button><button className={doc === "legal" ? "active" : ""} onClick={() => setDoc("legal")}>Aviso legal</button><button className={doc === "cookies" ? "active" : ""} onClick={() => setDoc("cookies")}>Cookies</button>{draft.siteType === "ecommerce" ? <button className={doc === "terms" ? "active" : ""} onClick={() => setDoc("terms")}>Contratación</button> : null}</div><pre>{legalDocument(client, draft, doc)}</pre><div className="doc-actions"><button className="secondary-button small" onClick={() => void navigator.clipboard.writeText(legalDocument(client, draft, doc))}><Code2 />Copiar</button><button className="secondary-button small" onClick={() => downloadText((draft.slug || "proyecto") + "-" + doc + ".txt", legalDocument(client, draft, doc))}><Download />Descargar</button></div></div></div></div>;
}

function GithubPublish({ project, onPublished }: { project: ProjectDraft & { id: string }; onPublished: (metadata: PublicationMetadata) => Promise<void> | void }) {
  const { status, loading } = useGithubStatus();
  const [name, setName] = useState(project.githubRepoFullName?.split("/").at(-1) || project.slug);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [publishKey, setPublishKey] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.sessionStorage.getItem("archic-studio:publish-key") ?? "",
  );
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; fullName: string; pushedAt: string } | null>(project.githubRepoUrl ? { url: project.githubRepoUrl, fullName: project.githubRepoFullName, pushedAt: project.githubLastPushAt } : null);

  const publish = async () => {
    setPublishing(true);
    setError("");
    try {
      if (status?.requiresPublishKey) {
        window.sessionStorage.setItem("archic-studio:publish-key", publishKey);
      }
      const response = await fetch("/api/github", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(status?.requiresPublishKey ? { "x-archic-publish-key": publishKey } : {}),
        },
        body: JSON.stringify({
          projectId: project.id,
          repoName: name,
          visibility,
        }),
      });
      const payload = await response.json() as { error?: string; repository?: { url: string; fullName: string; branch: string }; pushedAt?: string; revision?: number };
      if (!response.ok || !payload.repository) throw new Error(payload.error || "No se pudo publicar.");
      const pushedAt = payload.pushedAt || new Date().toISOString();
      setResult({ url: payload.repository.url, fullName: payload.repository.fullName, pushedAt });
      await onPublished({
        githubRepoFullName: payload.repository.fullName,
        githubRepoUrl: payload.repository.url,
        githubDefaultBranch: payload.repository.branch,
        githubLastPushAt: pushedAt,
        revision: payload.revision,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo publicar.");
    } finally {
      setPublishing(false);
    }
  };

  return <div className="github-publish"><div className="publish-title"><Github /><div><strong>Publicar en GitHub</strong><small>{loading ? "Comprobando conexión…" : status?.connected ? `Cuenta ${status.owner}` : "Conexión pendiente"}</small></div></div>{result ? <a className="published-repo" href={result.url} target="_blank" rel="noreferrer"><span><CheckCircle2 /><b>{result.fullName}</b><small>Último envío {formatDate(result.pushedAt)}</small></span><ArrowUpRight /></a> : null}<label className="field"><span>Repositorio</span><input value={name} onChange={(event) => setName(slugify(event.target.value))} /></label>{status?.requiresPublishKey ? <label className="field"><span>Clave de publicación</span><input type="password" autoComplete="off" value={publishKey} onChange={(event) => setPublishKey(event.target.value)} placeholder="Clave privada de Archic" /></label> : null}<div className="visibility-choice"><button className={visibility === "private" ? "active" : ""} onClick={() => setVisibility("private")}><LockKeyhole />Privado</button><button className={visibility === "public" ? "active" : ""} onClick={() => setVisibility("public")}><Globe2 />Público</button></div>{error ? <p className="publish-error">{error}</p> : null}<button className="github-button" onClick={() => void publish()} disabled={!status?.connected || publishing || !name || (status.requiresPublishKey && !publishKey)}>{publishing ? <Loader2 className="spin" /> : <Rocket />}{result ? "Enviar nueva versión" : "Crear repositorio y enviar"}</button></div>;
}

function WizardPreview({ draft, client, html, device, setDevice, assessment, onPublished }: {
  draft: ProjectDraft;
  client?: Client;
  html: string;
  device: "desktop" | "tablet" | "mobile";
  setDevice: (device: "desktop" | "tablet" | "mobile") => void;
  assessment: ReturnType<typeof assessProject>;
  onPublished: (metadata: PublicationMetadata) => Promise<void> | void;
}) {
  const findings = [...assessment.blockers, ...assessment.warnings];
  return <div className="wizard-step preview-step"><div className="step-heading preview-heading"><div><p className="overline">06 · Revisión final</p><h1>{assessment.blockers.length ? "La web se puede revisar; aún no publicar." : "La base está lista para verificar."}</h1><p>{assessment.blockers.length ? "Cierra los bloqueos señalados. Puedes guardar y exportar un borrador, pero GitHub permanecerá bloqueado." : "Revisa el resultado en cada tamaño, guarda el proyecto y comprueba el despliegue real antes de hacerlo público."}</p></div><div className="device-switch"><button className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")} aria-label="Escritorio"><Monitor /></button><button className={device === "tablet" ? "active" : ""} onClick={() => setDevice("tablet")} aria-label="Tablet"><Tablet /></button><button className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")} aria-label="Móvil"><Smartphone /></button></div></div><div className="preview-layout"><div className={"site-preview site-preview-" + device}><div className="preview-browser"><span><i /><i /><i /></span><div><LockKeyhole size={13} />{draft.slug || "nuevo-proyecto"}.archic.es</div><ArrowUpRight size={16} /></div><iframe title={"Vista previa de " + draft.name} srcDoc={html} sandbox="allow-scripts allow-forms allow-modals" /></div><aside className="preview-summary"><p className="overline">Preparación</p><div className={"readiness-score " + (assessment.blockers.length ? "blocked" : "ready")}><strong>{assessment.score}</strong><span>/100</span><small>{assessment.blockers.length ? "Publicación bloqueada" : "Sin bloqueos de configuración"}</small></div><h2>{draft.name}</h2><dl><div><dt>Cliente</dt><dd>{client?.name || "Sin cliente"}</dd></div><div><dt>Objetivo</dt><dd>{draft.brief.objective || "Pendiente"}</dd></div><div><dt>Público</dt><dd>{draft.brief.audience || "Pendiente"}</dd></div><div><dt>Dirección</dt><dd>{TEMPLATES.find((item) => item.id === draft.template)?.name}</dd></div><div><dt>Servicios</dt><dd>{draft.brief.services?.length || 0}</dd></div><div><dt>Integraciones</dt><dd>{draft.integrations.length}</dd></div></dl>{findings.length ? <div className="preview-findings">{findings.slice(0, 5).map((finding) => <div key={finding.id} className={finding.severity}><AlertTriangle /><span><strong>{finding.label}</strong><small>{finding.detail}</small></span></div>)}</div> : null}<button className="secondary-button" onClick={() => downloadText((draft.slug || "proyecto") + "-config.json", JSON.stringify({ client, project: draft, audit: assessment }, null, 2), "application/json")}><Download />Descargar configuración</button><p className="preview-help"><Code2 />El paquete contiene web, documentos legales separados, inventario de consentimiento, configuración y un informe honesto de hallazgos.</p>{draft.id && client && !assessment.blockers.length ? <GithubPublish project={draft as ProjectDraft & { id: string }} onPublished={onPublished} /> : draft.id ? <div className="save-first publish-blocked"><AlertTriangle /><p><strong>Publicación bloqueada</strong><span>Resuelve los controles críticos del paso Legal. El servidor volverá a comprobarlos antes de crear o actualizar el repositorio.</span></p></div> : <div className="save-first"><Github /><p><strong>Guarda primero el proyecto</strong><span>Después podrás crear el repositorio si no quedan bloqueos críticos.</span></p></div>}</aside></div></div>;
}
