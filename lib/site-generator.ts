export type GeneratorClient = {
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

export type BusinessBrief = {
  objective?: string;
  audience?: string;
  valueProposition?: string;
  services?: string[];
  differentiators?: string[];
  tone?: string;
  primaryCta?: string;
  aboutStory?: string;
  proofPoints?: string[];
  seoKeywords?: string[];
};

export type LegalProfile = {
  dataCategories?: string;
  privacyPurposes?: string;
  legalBasis?: string;
  retention?: string;
  recipients?: string;
  internationalTransfers?: string;
  dpoEmail?: string;
  marketing?: boolean;
  minors?: boolean;
  specialCategories?: boolean;
  profiling?: boolean;
  professionalReview?: boolean;
  paymentMethods?: string;
  deliveryTerms?: string;
  returnCosts?: string;
  withdrawalInfo?: string;
  lastReviewedAt?: string;
};

export type GeneratorProject = {
  name?: string;
  slug?: string;
  siteType: string;
  template: string;
  primaryColor: string;
  accentColor: string;
  headline?: string;
  subheadline?: string;
  heroImageUrl?: string;
  sections: string[];
  integrations: string[];
  legal: Record<string, boolean>;
  brief?: BusinessBrief;
  legalProfile?: LegalProfile;
};

export type ProjectCheck = {
  id: string;
  label: string;
  detail: string;
  weight: number;
  passed: boolean;
  severity: "critical" | "warning";
};

export const SITE_TEMPLATES = [
  {
    id: "costa",
    name: "Origen",
    style: "Editorial mediterránea",
    description: "Ritmo arquitectónico, serif expresiva y calidez mineral.",
    colors: ["#102239", "#F3EBDD", "#B8894A"],
  },
  {
    id: "atlas",
    name: "Forja",
    style: "Industrial de autor",
    description: "Contraste, retícula técnica y una presencia contundente.",
    colors: ["#151B1F", "#E8E6DF", "#D57932"],
  },
  {
    id: "norte",
    name: "Atelier",
    style: "Editorial contemporánea",
    description: "Composición silenciosa, tipografía protagonista y detalle premium.",
    colors: ["#161412", "#F1ECE4", "#B99B72"],
  },
] as const;

export const INTEGRATION_CATALOG = [
  { id: "analytics", label: "Google Analytics", provider: "Google", category: "analytics", categoryLabel: "Analítica", purpose: "Medición agregada del uso y rendimiento del sitio", storage: "Identificadores y almacenamiento de medición, según configuración", duration: "Verificar en la propiedad de Analytics", needsConsent: true },
  { id: "maps", label: "Google Maps", provider: "Google", category: "external", categoryLabel: "Contenido externo", purpose: "Mostrar mapas, ubicaciones y rutas", storage: "Cookies y almacenamiento del servicio al cargar el mapa", duration: "Según la configuración vigente del proveedor", needsConsent: true },
  { id: "youtube", label: "YouTube / Vimeo", provider: "Google / Vimeo", category: "external", categoryLabel: "Contenido externo", purpose: "Reproducir contenido audiovisual incrustado", storage: "Cookies y almacenamiento del reproductor seleccionado", duration: "Según el reproductor y su configuración", needsConsent: true },
  { id: "meta", label: "Meta Pixel", provider: "Meta", category: "marketing", categoryLabel: "Marketing", purpose: "Medir campañas y, si se configura, crear audiencias publicitarias", storage: "Identificadores de publicidad y medición", duration: "Verificar en la configuración de Meta", needsConsent: true },
  { id: "instagram", label: "Instagram", provider: "Meta", category: "external", categoryLabel: "Contenido externo", purpose: "Mostrar publicaciones o perfiles incrustados", storage: "Cookies y almacenamiento del contenido incrustado", duration: "Según la configuración vigente del proveedor", needsConsent: true },
  { id: "recaptcha", label: "reCAPTCHA", provider: "Google", category: "security", categoryLabel: "Seguridad", purpose: "Prevenir abuso automatizado en formularios", storage: "Señales técnicas y almacenamiento antifraude", duration: "Según la versión y configuración implantadas", needsConsent: true },
  { id: "whatsapp", label: "WhatsApp", provider: "Meta", category: "communication", categoryLabel: "Comunicación", purpose: "Abrir un canal de conversación solicitado por la persona usuaria", storage: "No se carga el servicio hasta pulsar el enlace externo", duration: "No aplica antes de abandonar el sitio", needsConsent: false },
  { id: "booking", label: "Motor de reservas", provider: "Proveedor por confirmar", category: "functional", categoryLabel: "Funcional", purpose: "Consultar disponibilidad y gestionar una solicitud de reserva", storage: "Depende del proveedor definitivo", duration: "Pendiente de inventario técnico", needsConsent: true },
] as const;

function esc(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeColor(value: string, fallback: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback;
}

function safeImageUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function list(value?: string[]) {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function pending(label: string) {
  return `[REVISIÓN NECESARIA: ${label}]`;
}

function plain(value: string | undefined, label: string) {
  return value?.trim() || pending(label);
}

function jsValue(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}

function card(value: string, fallbackTitle: string, fallbackText: string) {
  const [rawTitle, ...rawText] = value.split("|");
  return {
    title: rawTitle?.trim() || fallbackTitle,
    text: rawText.join("|").trim() || fallbackText,
  };
}

export function selectedIntegrations(project: GeneratorProject) {
  const selected = new Set(project.integrations);
  return INTEGRATION_CATALOG.filter((integration) => selected.has(integration.id));
}

export function assessProject(client: GeneratorClient | undefined, project: GeneratorProject) {
  const brief = project.brief ?? {};
  const profile = project.legalProfile ?? {};
  const services = list(brief.services);
  const differentiators = list(brief.differentiators);
  const nonEssential = selectedIntegrations(project).filter((integration) => integration.needsConsent);
  const collectsData = project.sections.includes("contact") || project.sections.includes("booking") || project.siteType === "ecommerce";
  const highRisk = Boolean(profile.minors || profile.specialCategories || profile.profiling);

  const checks: ProjectCheck[] = [
    {
      id: "identity",
      label: "Identidad legal del titular",
      detail: "Razón social, NIF/CIF, domicilio y correo de contacto.",
      weight: 15,
      passed: Boolean(client?.legalName && client.taxId && client.address && client.email),
      severity: "critical",
    },
    {
      id: "strategy",
      label: "Estrategia del encargo",
      detail: "Objetivo, público y propuesta de valor definidos para esta empresa.",
      weight: 10,
      passed: Boolean(brief.objective && brief.audience && brief.valueProposition),
      severity: "warning",
    },
    {
      id: "content",
      label: "Contenido empresarial propio",
      detail: "Servicios, diferenciales, historia y llamada a la acción no genéricos.",
      weight: 15,
      passed: services.length >= 2 && differentiators.length >= 2 && Boolean(brief.aboutStory && brief.primaryCta),
      severity: "warning",
    },
    {
      id: "documents",
      label: "Documentos legales visibles",
      detail: "Aviso legal y política de privacidad incluidos en el paquete.",
      weight: 15,
      passed: Boolean(project.legal.legalNotice && project.legal.privacy),
      severity: "critical",
    },
    {
      id: "privacy",
      label: "Registro de privacidad",
      detail: "Categorías, finalidades, base jurídica, conservación, destinatarios y transferencias documentados.",
      weight: 15,
      passed: Boolean(profile.dataCategories && profile.privacyPurposes && profile.legalBasis && profile.retention && profile.recipients && profile.internationalTransfers),
      severity: "critical",
    },
    {
      id: "consent",
      label: "Consentimiento y bloqueo previo",
      detail: nonEssential.length ? `${nonEssential.length} servicios no esenciales deben permanecer bloqueados hasta la elección.` : "No hay servicios no esenciales configurados.",
      weight: 10,
      passed: nonEssential.length === 0 || Boolean(project.legal.cookieBanner && project.legal.scriptBlocking),
      severity: "critical",
    },
    {
      id: "forms",
      label: "Información por capas en formularios",
      detail: "La recogida de datos muestra responsable, finalidad, base, derechos y acceso a la política completa.",
      weight: 5,
      passed: !collectsData || Boolean(project.legal.formNotices && profile.privacyPurposes && profile.legalBasis),
      severity: "critical",
    },
    {
      id: "quality",
      label: "Accesibilidad y minimización",
      detail: "La base accesible y las medidas de seguridad están activadas.",
      weight: 5,
      passed: Boolean(project.legal.accessibility && project.legal.security),
      severity: "warning",
    },
    {
      id: "commerce",
      label: project.siteType === "ecommerce" ? "Contratación a distancia" : "Reglas del tipo de web",
      detail: project.siteType === "ecommerce" ? "Condiciones, desistimiento, pagos, entrega y costes de devolución definidos." : "No se requieren condiciones de venta online para este tipo de proyecto.",
      weight: 5,
      passed: project.siteType !== "ecommerce" || Boolean(project.legal.terms && project.legal.returns && profile.paymentMethods && profile.deliveryTerms && profile.returnCosts && profile.withdrawalInfo),
      severity: "critical",
    },
    {
      id: "risk",
      label: "Revisión de tratamientos de riesgo",
      detail: highRisk ? "Hay menores, categorías especiales o perfilado: se exige revisión profesional documentada." : "No se han declarado tratamientos de riesgo elevado.",
      weight: 5,
      passed: !highRisk || Boolean(profile.professionalReview),
      severity: "critical",
    },
  ];

  const score = checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0);
  const blockers = checks.filter((check) => !check.passed && check.severity === "critical");
  const warnings = checks.filter((check) => !check.passed && check.severity === "warning");
  if (project.heroImageUrl) {
    warnings.push({
      id: "external-image",
      label: "Imagen externa pendiente de alojar",
      detail: "Copia la imagen al repositorio final para evitar depender de un tercero y revelar la IP del visitante.",
      weight: 0,
      passed: false,
      severity: "warning",
    });
  }
  const status = blockers.length ? "attention" : score >= 90 ? "ready" : "review";
  return { score, status, checks, blockers, warnings, highRisk };
}

export function legalDocument(
  client: GeneratorClient | undefined,
  project: GeneratorProject,
  type: "legal" | "privacy" | "cookies" | "terms",
) {
  const profile = project.legalProfile ?? {};
  const business = client?.legalName || client?.name || pending("titular de la web");
  const id = plain(client?.taxId, "NIF/CIF del titular");
  const address = [client?.address, client?.city, client?.country].filter(Boolean).join(", ") || pending("domicilio del titular");
  const email = plain(client?.email, "correo de contacto");
  const reviewed = profile.lastReviewedAt || pending("fecha de última revisión");
  const integrations = selectedIntegrations(project);

  if (type === "legal") {
    return `AVISO LEGAL

Última revisión: ${reviewed}

1. IDENTIFICACIÓN DEL PRESTADOR
Titular: ${business}
NIF/CIF: ${id}
Domicilio: ${address}
Correo electrónico: ${email}
Datos registrales: ${client?.registryData?.trim() || "No constan; confirmar si resultan aplicables."}
Datos profesionales o autorizaciones: ${client?.professionalData?.trim() || "No constan; confirmar si resultan aplicables."}

2. OBJETO Y CONDICIONES DE USO
Este sitio facilita información sobre la actividad, productos o servicios del titular. El acceso atribuye la condición de persona usuaria y exige un uso lícito, diligente y conforme a la buena fe. No se permite introducir código malicioso, intentar acceder a áreas restringidas ni utilizar los contenidos vulnerando derechos de terceros.

3. PROPIEDAD INTELECTUAL E INDUSTRIAL
Los textos, elementos gráficos, marcas, fotografías y código pertenecen a sus respectivos titulares o se utilizan con autorización. Su disponibilidad en esta web no concede derechos de explotación más allá de los permitidos por la ley.

4. RESPONSABILIDAD Y ENLACES
El titular procura mantener la información y disponibilidad del sitio, pero no garantiza la ausencia absoluta de errores o interrupciones. Los enlaces a servicios externos se identifican como tales; sus condiciones y políticas corresponden a sus responsables.

5. LEGISLACIÓN APLICABLE
Se aplica la legislación española, sin perjuicio de las normas imperativas de protección de consumidores y de la competencia territorial que corresponda en cada caso.

Nota de producción: revisar esta base si la actividad está colegiada, sometida a autorización administrativa, muestra precios regulados o utiliza contenidos de terceros.`;
  }

  if (type === "privacy") {
    const riskNotes = [
      profile.minors ? "Se prevé tratar datos de menores; deben documentarse la edad aplicable y el mecanismo de autorización." : "No se ha declarado un tratamiento dirigido a menores.",
      profile.specialCategories ? "Se prevén categorías especiales de datos; se requiere análisis de riesgos y una condición válida del artículo 9 RGPD." : "No se han declarado categorías especiales de datos.",
      profile.profiling ? "Se ha declarado perfilado o decisión automatizada; deben explicarse la lógica, relevancia y consecuencias." : "No se han declarado decisiones exclusivamente automatizadas ni perfilado.",
    ].join("\n");
    return `POLÍTICA DE PRIVACIDAD

Última revisión: ${reviewed}

1. RESPONSABLE
Responsable: ${business} (${id})
Dirección: ${address}
Contacto de privacidad: ${email}
Delegado/a de protección de datos: ${profile.dpoEmail?.trim() || "No designado o no aplicable; confirmar."}

2. QUÉ DATOS Y PARA QUÉ
Categorías de datos: ${plain(profile.dataCategories, "categorías de datos tratadas")}
Finalidades: ${plain(profile.privacyPurposes, "finalidades concretas de cada tratamiento")}
Base jurídica: ${plain(profile.legalBasis, "base jurídica asociada a cada finalidad")}

3. CONSERVACIÓN
${plain(profile.retention, "plazos o criterios de conservación")}

4. DESTINATARIOS Y TRANSFERENCIAS
Destinatarios o encargados: ${plain(profile.recipients, "destinatarios o categorías de destinatarios")}
Transferencias internacionales: ${plain(profile.internationalTransfers, "existencia o ausencia de transferencias y sus garantías")}

5. DERECHOS
Puede solicitar acceso, rectificación, supresión, oposición, limitación y portabilidad, y retirar el consentimiento cuando sea la base aplicable, escribiendo a ${email} e identificando su solicitud. También puede reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).

6. INFORMACIÓN ADICIONAL DE RIESGO
${riskNotes}

7. PROCEDENCIA Y ACTUALIZACIÓN
Salvo que se indique otra cosa en un formulario concreto, los datos se obtienen de la propia persona interesada. Esta política debe revisarse cuando cambien las finalidades, proveedores, formularios o integraciones del sitio.`;
  }

  if (type === "cookies") {
    const inventory = integrations.length
      ? integrations.map((item, index) => `${index + 1}. ${item.label}\n   Proveedor: ${item.provider}\n   Categoría: ${item.categoryLabel}\n   Finalidad: ${item.purpose}\n   Almacenamiento esperado: ${item.storage}\n   Duración: ${item.duration}\n   Consentimiento previo: ${item.needsConsent ? "Sí" : "No, mientras funcione únicamente como enlace solicitado"}`).join("\n\n")
      : "No se han configurado servicios externos. El sitio no debería instalar tecnologías no necesarias; comprobarlo en la auditoría técnica final.";
    return `POLÍTICA DE COOKIES Y SERVICIOS EXTERNOS

Última revisión: ${reviewed}

1. RESPONSABLE
${business} · ${email}

2. CÓMO FUNCIONA EL CONSENTIMIENTO
Las tecnologías estrictamente necesarias pueden utilizarse para prestar el servicio solicitado y recordar las preferencias. Las categorías no necesarias permanecen bloqueadas hasta que la persona usuaria las acepte. Aceptar y rechazar se ofrecen al mismo nivel, y la elección puede modificarse desde «Configurar privacidad».

3. INVENTARIO DE SERVICIOS CONFIGURADOS
${inventory}

4. RETIRAR O CAMBIAR EL CONSENTIMIENTO
La configuración puede abrirse de nuevo desde el pie de página. También es posible borrar el almacenamiento del sitio desde el navegador. Retirar el consentimiento no afecta a la licitud del uso anterior.

5. COMPROBACIÓN TÉCNICA OBLIGATORIA
Este inventario parte de la configuración de Archic Studio. Antes de publicar y después de cada cambio debe verificarse en el sitio real qué cookies, píxeles, solicitudes y almacenamientos crea cada proveedor, su titularidad, finalidad y duración.`;
  }

  return `CONDICIONES DE CONTRATACIÓN A DISTANCIA

Última revisión: ${reviewed}

1. VENDEDOR
${business} (${id})
${address}
${email}

2. PRODUCTOS O SERVICIOS
La ficha de cada producto o servicio debe indicar sus características esenciales, disponibilidad y cualquier limitación relevante antes de iniciar el pedido.

3. PRECIOS Y PAGO
Medios de pago: ${plain(profile.paymentMethods, "medios de pago admitidos")}
El precio total, impuestos y cualquier coste adicional deben mostrarse antes de confirmar. El botón final debe indicar de forma inequívoca que el pedido implica una obligación de pago.

4. ENTREGA O EJECUCIÓN
${plain(profile.deliveryTerms, "ámbito, plazo y condiciones de entrega o ejecución")}

5. DESISTIMIENTO
${plain(profile.withdrawalInfo, "plazo de desistimiento, forma de ejercerlo y excepciones aplicables")}
Costes de devolución: ${plain(profile.returnCosts, "quién asume los costes directos de devolución")}

6. CONFIRMACIÓN, GARANTÍAS Y RECLAMACIONES
La confirmación contractual y estas condiciones deben facilitarse en soporte duradero. Deben concretarse la garantía legal aplicable, el canal de atención posventa y el procedimiento de reclamación.

Nota de producción: estas condiciones no habilitan por sí solas un proceso de compra. Antes de publicar hay que contrastarlas con el catálogo, precios, impuestos, logística, garantía, excepciones al desistimiento y funcionamiento real del checkout.`;
}

function firstLayer(client: GeneratorClient | undefined, project: GeneratorProject) {
  const profile = project.legalProfile ?? {};
  const business = esc(client?.legalName || client?.name || pending("responsable"));
  const purpose = esc(profile.privacyPurposes || pending("finalidad del formulario"));
  const basis = esc(profile.legalBasis || pending("base jurídica"));
  const recipients = esc(profile.recipients || pending("destinatarios"));
  return `<aside class="privacy-layer" aria-label="Información básica de protección de datos"><strong>Información básica de privacidad</strong><dl><div><dt>Responsable</dt><dd>${business}</dd></div><div><dt>Finalidad</dt><dd>${purpose}</dd></div><div><dt>Legitimación</dt><dd>${basis}</dd></div><div><dt>Destinatarios</dt><dd>${recipients}</dd></div></dl><p>Puede ejercer sus derechos mediante el contacto indicado en la <a href="privacidad.html" data-legal="privacy">política de privacidad</a>.</p></aside>`;
}

function sectionMarkup(client: GeneratorClient | undefined, project: GeneratorProject) {
  const sections = new Set(project.sections);
  const brief = project.brief ?? {};
  const city = esc(client?.city || "España");
  const business = esc(client?.name || project.name || "La empresa");
  const serviceItems = list(brief.services).slice(0, 6);
  const services = (serviceItems.length ? serviceItems : [
    `${pending("servicio 1")} | ${pending("descripción y beneficio")}`,
    `${pending("servicio 2")} | ${pending("descripción y beneficio")}`,
    `${pending("servicio 3")} | ${pending("descripción y beneficio")}`,
  ]).map((item, index) => {
    const parsed = card(item, `Servicio ${index + 1}`, pending("descripción del servicio"));
    return `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>${esc(parsed.title)}</h3><p>${esc(parsed.text)}</p></article>`;
  }).join("");
  const proofItems = list(brief.proofPoints).slice(0, 3);
  const showcase = (proofItems.length ? proofItems : [pending("caso o prueba 1"), pending("caso o prueba 2"), pending("caso o prueba 3")])
    .map((item, index) => `<article><i>${String(index + 1).padStart(2, "0")}</i><span>${esc(item)}</span></article>`).join("");
  const differentiators = list(brief.differentiators);
  const story = esc(brief.aboutStory || pending("historia, método y razón de ser de la empresa"));
  const cta = esc(brief.primaryCta || "Solicitar información");
  const value = esc(brief.valueProposition || project.subheadline || pending("propuesta de valor"));

  return [
    sections.has("services")
      ? `<section class="section services" id="servicios"><div class="section-kicker">01 / Servicios</div><div class="section-title"><h2>Lo que hacemos<br><em>y por qué importa.</em></h2><p>${value}</p></div><div class="service-grid">${services}</div></section>`
      : "",
    sections.has("catalog") || sections.has("projects") || sections.has("gallery")
      ? `<section class="section showcase" id="trabajo"><div class="section-kicker">02 / Evidencias</div><div class="section-title"><h2>Hechos que ayudan<br><em>a decidir.</em></h2><p>${esc(brief.audience ? `Una selección pensada para ${brief.audience}.` : pending("contexto de los trabajos o productos"))}</p></div><div class="showcase-grid">${showcase}</div></section>`
      : "",
    sections.has("about")
      ? `<section class="section manifesto" id="empresa"><div class="section-kicker">03 / ${business}</div><blockquote>“${esc(differentiators[0] || brief.valueProposition || pending("diferencial principal"))}”</blockquote><div><h2>Una empresa con<br><em>criterio propio.</em></h2><p>${story}</p><dl><div><dt>Base</dt><dd>${city}</dd></div><div><dt>Forma de trabajar</dt><dd>${esc(differentiators[1] || brief.tone || pending("segundo diferencial"))}</dd></div></dl></div></section>`
      : "",
    sections.has("booking")
      ? `<section class="section booking" id="reservas"><div class="section-kicker">04 / Reservas</div><h2>${cta}<br><em>cuando te venga bien.</em></h2><a class="text-link" href="#contacto">Consultar disponibilidad <span>↗</span></a></section>`
      : "",
    sections.has("contact")
      ? `<section class="section contact" id="contacto"><div><div class="section-kicker">05 / Contacto</div><h2>${cta}<br><em>empieza aquí.</em></h2><p>${esc(client?.phone || client?.email || "Cuéntanos qué necesitas y cómo podemos ayudarte.")}</p></div><form data-demo-form><label>Nombre<input name="nombre" autocomplete="name" required></label><label>Correo electrónico<input type="email" name="email" autocomplete="email" required></label><label class="wide">Mensaje<textarea name="mensaje" rows="4" required></textarea></label><div class="wide">${firstLayer(client, project)}</div><label class="consent wide"><input type="checkbox" required><span>He leído la información básica y la política de privacidad.</span></label>${project.legalProfile?.marketing ? '<label class="consent wide"><input type="checkbox" name="marketing"><span>Acepto recibir comunicaciones comerciales. Esta opción es voluntaria.</span></label>' : ""}<button type="submit">${cta} <span>↗</span></button></form></section>`
      : "",
  ].join("");
}

function siteCss(project: GeneratorProject) {
  const primary = safeColor(project.primaryColor, "#102239");
  const accent = safeColor(project.accentColor, "#B8894A");
  const heroImage = safeImageUrl(project.heroImageUrl);
  return `:root{--primary:${primary};--accent:${accent};--paper:#f1ece3;--ink:#121719;--line:rgba(18,23,25,.18);--serif:Iowan Old Style,Baskerville,Georgia,serif;--sans:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);line-height:1.55}a{color:inherit}button,input,textarea{font:inherit}button,a{touch-action:manipulation}.site-header{position:absolute;z-index:10;top:0;left:0;width:100%;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:28px 4.5vw;color:#fff;border-bottom:1px solid #ffffff35}.brand{font-family:var(--serif);font-size:24px;text-decoration:none}.site-header nav{display:flex;gap:28px}.site-header nav a,.header-cta{font-size:12px;letter-spacing:.07em;text-decoration:none;text-transform:uppercase}.header-cta{justify-self:end;border-bottom:1px solid currentColor;padding-bottom:4px}.hero{position:relative;min-height:94vh;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(310px,.7fr);align-items:end;padding:150px 4.5vw 60px;overflow:hidden;background:var(--primary);color:#fff}.hero::before{content:"";position:absolute;inset:0;background:${heroImage ? `linear-gradient(90deg,rgba(4,10,16,.87),rgba(4,10,16,.28)),url("${esc(heroImage)}") center/cover` : "radial-gradient(circle at 82% 24%,color-mix(in srgb,var(--accent) 42%,transparent),transparent 28%),repeating-linear-gradient(90deg,transparent 0,transparent calc(14.285% - 1px),rgba(255,255,255,.07) calc(14.285% - 1px),rgba(255,255,255,.07) 14.285%)"};opacity:.92}.hero-copy,.hero-aside{position:relative;z-index:1}.kicker,.section-kicker{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.kicker{display:flex;align-items:center;gap:12px;color:#ffffffc2}.kicker::before{content:"";width:32px;height:1px;background:var(--accent)}h1,h2,h3,blockquote{font-family:var(--serif);font-weight:500;line-height:.98}.hero h1{max-width:1050px;margin:28px 0;font-size:clamp(62px,8.5vw,136px);letter-spacing:-.055em}.hero h1 em,.section h2 em{color:var(--accent);font-weight:500}.hero-lead{max-width:650px;margin:0;font-size:clamp(17px,1.55vw,23px);color:#ffffffc7}.hero-action{display:inline-flex;align-items:center;gap:28px;margin-top:38px;padding:14px 18px 14px 0;text-decoration:none;border-bottom:1px solid #ffffff8a}.hero-action span{font-size:22px}.hero-aside{justify-self:end;width:min(100%,360px);padding:26px 0;border-top:1px solid #ffffff62}.hero-aside span{color:var(--accent);font-size:10px;letter-spacing:.16em;text-transform:uppercase}.hero-aside strong{display:block;margin:10px 0;font-family:var(--serif);font-size:26px;font-weight:500}.hero-aside p{color:#ffffffbd}.hero-index{position:absolute;right:4.5vw;top:140px;z-index:1;font-family:var(--serif);font-size:22px;color:#ffffff86}.section{padding:120px 4.5vw;border-bottom:1px solid var(--line)}.section-kicker{margin-bottom:46px;color:var(--accent)}.section-title{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(260px,.7fr);align-items:end;gap:8vw}.section h2{margin:0;font-size:clamp(48px,6.5vw,96px);letter-spacing:-.045em}.section-title>p{max-width:470px;margin:0;color:#5f6363;font-size:16px}.service-grid{display:grid;grid-template-columns:repeat(3,1fr);margin-top:76px;border-top:1px solid var(--line);border-left:1px solid var(--line)}.service-grid article{min-height:330px;padding:28px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.service-grid article>span{color:var(--accent);font-size:11px}.service-grid h3{margin:105px 0 16px;font-size:34px}.service-grid p{max-width:340px;margin:0;color:#646869}.showcase{background:#dcd6cb}.showcase-grid{display:grid;grid-template-columns:1.2fr .8fr .8fr;gap:15px;margin-top:68px}.showcase-grid article{position:relative;min-height:460px;display:flex;align-items:flex-end;padding:25px;overflow:hidden;color:#fff;background:linear-gradient(145deg,var(--primary),color-mix(in srgb,var(--accent) 65%,var(--primary)))}.showcase-grid article::before{content:"";position:absolute;inset:-30%;background:repeating-linear-gradient(135deg,transparent 0 70px,rgba(255,255,255,.08) 71px 72px);transform:rotate(-8deg)}.showcase-grid article:nth-child(2){background:linear-gradient(160deg,#6d6a62,#282c2f)}.showcase-grid article:nth-child(3){background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 75%,#fff),var(--primary))}.showcase-grid i{position:absolute;top:25px;left:25px;font-style:normal;font-size:11px}.showcase-grid span{position:relative;font-family:var(--serif);font-size:28px}.manifesto{display:grid;grid-template-columns:.75fr 1.25fr;gap:9vw;background:var(--primary);color:#fff}.manifesto>.section-kicker{grid-column:1/-1}.manifesto blockquote{margin:0;color:#ffffff96;font-size:clamp(32px,4vw,62px)}.manifesto h2{font-size:clamp(48px,6vw,88px)}.manifesto p{max-width:620px;color:#ffffffb2;font-size:18px}.manifesto dl{display:flex;gap:60px;margin-top:55px;padding-top:22px;border-top:1px solid #ffffff3a}.manifesto dl div{display:grid;gap:6px}.manifesto dt{color:var(--accent);font-size:10px;text-transform:uppercase;letter-spacing:.12em}.manifesto dd{margin:0}.booking{text-align:center;background:var(--accent);color:#fff}.booking .section-kicker{color:#fff}.booking h2{margin:0 auto 45px}.text-link{display:inline-flex;gap:25px;text-decoration:none;border-bottom:1px solid;padding:10px 0}.contact{display:grid;grid-template-columns:.8fr 1.2fr;gap:7vw}.contact h2{font-size:clamp(52px,6.4vw,92px)}form{display:grid;grid-template-columns:1fr 1fr;gap:22px}label{display:grid;gap:8px;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.wide{grid-column:1/-1}input,textarea{width:100%;padding:14px 0;border:0;border-bottom:1px solid var(--line);outline:none;background:transparent;border-radius:0}input:focus,textarea:focus{border-color:var(--accent)}.consent{display:flex;gap:12px;letter-spacing:0;text-transform:none;font-size:12px}.consent input{width:auto;margin:4px 0 0}.contact button{width:max-content;display:flex;gap:25px;padding:14px 0;border:0;border-bottom:1px solid;background:none;cursor:pointer}.privacy-layer{padding:18px;border:1px solid var(--line);background:#ffffff55;font-size:12px}.privacy-layer>strong{font-family:var(--serif);font-size:18px}.privacy-layer dl{display:grid;gap:6px;margin:12px 0}.privacy-layer dl div{display:grid;grid-template-columns:92px 1fr;gap:10px}.privacy-layer dt{font-weight:700}.privacy-layer dd{margin:0}.privacy-layer p{margin:10px 0 0}.site-footer{display:grid;grid-template-columns:1fr auto;gap:30px;padding:48px 4.5vw;background:#0b1014;color:#fff}.site-footer strong{font-family:var(--serif);font-size:28px;font-weight:500}.footer-links{display:flex;align-items:center;justify-content:flex-end;gap:18px;flex-wrap:wrap}.footer-links a,.footer-links button{padding:0;border:0;background:none;color:#ffffffb8;text-decoration:underline;cursor:pointer;font-size:13px}.legal{white-space:pre-wrap;max-width:780px;max-height:62vh;overflow:auto;line-height:1.65}dialog{border:0;padding:36px;max-width:860px;width:calc(100% - 32px);box-shadow:0 20px 80px #0004}dialog::backdrop{background:#07101bd8}.close{float:right;border:0;background:transparent;font-size:27px;cursor:pointer}.cookie-banner{position:fixed;z-index:20;right:24px;bottom:24px;width:min(560px,calc(100% - 48px));padding:28px;background:#fff;color:#121212;border:1px solid #cfc7ba;box-shadow:0 20px 60px #0003}.cookie-banner strong{font-family:var(--serif);font-size:24px}.cookie-banner p{color:#5f6363}.cookie-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.cookie-actions button,.consent-save{min-height:44px;padding:11px 14px;border:1px solid var(--primary);background:var(--primary);color:#fff;cursor:pointer}.cookie-actions .configure{grid-column:1/-1;background:#fff;color:#111}.consent-panel{display:grid;gap:12px;clear:both;padding-top:18px}.consent-option{display:grid;grid-template-columns:1fr auto;gap:16px;padding:14px;border:1px solid #ddd}.consent-option input{width:auto}.consent-option span{display:grid;gap:3px}.consent-option small{color:#666}.legal-page{max-width:900px;margin:0 auto;padding:70px 24px}.legal-page>a{display:inline-block;margin-bottom:38px}.legal-page h1{font-size:clamp(42px,6vw,72px)}.legal-page pre{white-space:pre-wrap;font:15px/1.75 var(--sans)}
body.template-atlas{--paper:#e8e6df;--ink:#151b1f;--line:rgba(21,27,31,.26);--serif:Arial,sans-serif}body.template-atlas .hero{min-height:90vh;background:#11171b}body.template-atlas .hero h1,body.template-atlas .section h2{text-transform:uppercase;font-weight:700;line-height:.86;letter-spacing:-.065em}body.template-atlas .hero h1 em,body.template-atlas .section h2 em{font-style:normal}body.template-atlas .service-grid article{background:#efede8}body.template-atlas .service-grid h3{text-transform:uppercase;font-family:var(--sans);font-size:27px;font-weight:700}
body.template-norte{--paper:#eee9e2;--ink:#161412;--line:rgba(22,20,18,.17)}body.template-norte .site-header{border:0}body.template-norte .hero{grid-template-columns:1fr;align-items:center;text-align:center;background:#161412}body.template-norte .hero-copy{display:grid;justify-items:center}body.template-norte .hero h1{max-width:1120px;font-style:italic}body.template-norte .hero-aside{display:none}body.template-norte .section-title{text-align:center;grid-template-columns:1fr;justify-items:center}body.template-norte .service-grid{gap:18px;border:0}body.template-norte .service-grid article{border:1px solid var(--line);background:#f5f1eb}
@media(max-width:820px){.site-header{grid-template-columns:1fr auto;padding:22px 20px}.site-header nav{display:none}.hero{min-height:800px;grid-template-columns:1fr;padding:130px 20px 42px}.hero-index{right:20px}.hero-aside{justify-self:start}.section{padding:82px 20px}.section-title,.contact,.manifesto{grid-template-columns:1fr}.service-grid,.showcase-grid{grid-template-columns:1fr}.service-grid article{min-height:245px}.service-grid h3{margin-top:65px}.showcase-grid article{min-height:310px}.manifesto blockquote{margin-bottom:20px}.site-footer{grid-template-columns:1fr;padding:38px 20px}.footer-links{justify-content:flex-start}form{grid-template-columns:1fr}.wide{grid-column:auto}.cookie-banner{right:12px;bottom:12px;width:calc(100% - 24px);padding:20px}.privacy-layer dl div{grid-template-columns:1fr}.cookie-actions{grid-template-columns:1fr}.cookie-actions .configure{grid-column:auto}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}`;
}

function siteScript(docs: Record<string, string>, categories: string[]) {
  return `const docs=${jsValue(docs)};
const dialog=document.querySelector('#legal-dialog');
document.querySelectorAll('[data-legal]').forEach((link)=>link.addEventListener('click',(event)=>{if(!dialog)return;event.preventDefault();const target=dialog.querySelector('.legal');if(target)target.textContent=docs[link.dataset.legal]||'';dialog.showModal();}));
dialog?.querySelector('.close')?.addEventListener('click',()=>dialog.close());
const banner=document.querySelector('.cookie-banner');
const consentDialog=document.querySelector('#consent-dialog');
const consentKey='archic-consent-v1';
const categories=${jsValue(categories)};
function choice(enabled){return Object.fromEntries(categories.map((category)=>[category,enabled]));}
function activate(preferences){document.querySelectorAll('script[type="text/plain"][data-consent-category]').forEach((blocked)=>{if(!preferences[blocked.dataset.consentCategory])return;const script=document.createElement('script');for(const attribute of blocked.attributes){if(attribute.name!=='type'&&attribute.name!=='data-consent-category')script.setAttribute(attribute.name,attribute.value)}script.textContent=blocked.textContent;blocked.replaceWith(script)});banner?.setAttribute('hidden','');}
function save(preferences){try{localStorage.setItem(consentKey,JSON.stringify({version:1,updatedAt:new Date().toISOString(),categories:preferences}))}catch{}activate(preferences)}
document.querySelector('[data-consent="accept"]')?.addEventListener('click',()=>save(choice(true)));
document.querySelector('[data-consent="reject"]')?.addEventListener('click',()=>save(choice(false)));
document.querySelector('[data-consent="settings"]')?.addEventListener('click',()=>consentDialog?.showModal());
document.querySelector('#cookie-settings')?.addEventListener('click',()=>consentDialog?.showModal());
consentDialog?.querySelector('.close')?.addEventListener('click',()=>consentDialog.close());
consentDialog?.querySelector('[data-consent-save]')?.addEventListener('click',()=>{const preferences=choice(false);consentDialog.querySelectorAll('[data-category]').forEach((input)=>{preferences[input.dataset.category]=input.checked});save(preferences);consentDialog.close()});
try{const stored=JSON.parse(localStorage.getItem(consentKey)||'null');if(stored?.version===1)activate(stored.categories||{})}catch{}
document.querySelector('[data-demo-form]')?.addEventListener('submit',(event)=>{event.preventDefault();alert('Formulario de demostración: conecta el proveedor definitivo y vuelve a auditar antes de publicar.');});`;
}

function legalPage(title: string, content: string, style: string) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="robots" content="noindex,follow"><style>${style}</style></head><body><main class="legal-page"><a href="index.html">← Volver a la web</a><h1>${esc(title)}</h1><pre>${esc(content)}</pre></main></body></html>`;
}

export function buildSiteBundle(client: GeneratorClient | undefined, project: GeneratorProject) {
  const brief = project.brief ?? {};
  const name = esc(client?.name || project.name || "Nueva empresa");
  const sector = esc(client?.sector || "Servicios profesionales");
  const city = esc(client?.city || "España");
  const template = SITE_TEMPLATES.find((item) => item.id === project.template)?.name || "Origen";
  const headline = esc(project.headline || brief.valueProposition || pending("titular principal"));
  const subheadline = esc(project.subheadline || brief.valueProposition || pending("texto de apoyo"));
  const cta = esc(brief.primaryCta || "Solicitar información");
  const differentiators = list(brief.differentiators);
  const docs = {
    legal: legalDocument(client, project, "legal"),
    privacy: legalDocument(client, project, "privacy"),
    cookies: legalDocument(client, project, "cookies"),
    terms: legalDocument(client, project, "terms"),
  };
  const integrations = selectedIntegrations(project);
  const categories = [...new Set(integrations.filter((item) => item.needsConsent).map((item) => item.category))];
  const style = siteCss(project);
  const script = siteScript(docs, categories);
  const navigation = [
    project.sections.includes("services") ? '<a href="#servicios">Servicios</a>' : "",
    project.sections.some((section) => ["catalog", "projects", "gallery"].includes(section)) ? '<a href="#trabajo">Trabajo</a>' : "",
    project.sections.includes("about") ? '<a href="#empresa">Empresa</a>' : "",
    project.sections.includes("contact") ? '<a href="#contacto">Contacto</a>' : "",
  ].join("");
  const cookieBanner = categories.length && project.legal.cookieBanner
    ? `<div class="cookie-banner" role="dialog" aria-label="Preferencias de privacidad"><strong>Tu privacidad, bajo tu control</strong><p>Los servicios no necesarios están bloqueados. Acepta o rechaza con la misma facilidad, o elige por categorías.</p><div class="cookie-actions"><button data-consent="accept">Aceptar opcionales</button><button data-consent="reject">Rechazar opcionales</button><button data-consent="settings" class="configure">Configurar por categorías</button></div></div>`
    : "";
  const categoryOptions = categories.map((category) => {
    const label = INTEGRATION_CATALOG.find((item) => item.category === category)?.categoryLabel || category;
    return `<label class="consent-option"><span><strong>${esc(label)}</strong><small>Desactivada hasta que la aceptes.</small></span><input type="checkbox" data-category="${esc(category)}"></label>`;
  }).join("");
  const consentDialog = categories.length
    ? `<dialog id="consent-dialog"><button class="close" aria-label="Cerrar">×</button><div class="consent-panel"><h2>Configurar privacidad</h2><label class="consent-option"><span><strong>Necesarias</strong><small>Permiten funciones solicitadas y guardar tu elección.</small></span><input type="checkbox" checked disabled></label>${categoryOptions}<button class="consent-save" data-consent-save>Guardar preferencias</button></div></dialog>`
    : "";
  const cookieLink = categories.length ? '<button id="cookie-settings">Configurar privacidad</button>' : "";
  const termsLink = project.siteType === "ecommerce" ? '<a href="condiciones.html" data-legal="terms">Contratación</a>' : "";
  const description = esc(brief.valueProposition || `${client?.name || project.name || "Empresa"}: ${client?.sector || "servicios"} en ${client?.city || "España"}.`);
  const index = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} | ${sector}</title><meta name="description" content="${description}"><link rel="stylesheet" href="styles.css"></head><body class="template-${esc(project.template)} tone-${esc(brief.tone || "natural")}" data-template="${esc(template)}"><header class="site-header"><a class="brand" href="#">${name}</a><nav>${navigation}</nav><a class="header-cta" href="#contacto">${cta} ↗</a></header><main><section class="hero"><span class="hero-index">01 / 05</span><div class="hero-copy"><div class="kicker">${sector} · ${city}</div><h1>${headline}</h1><p class="hero-lead">${subheadline}</p><a class="hero-action" href="#contacto">${cta} <span>↗</span></a></div><aside class="hero-aside"><span>Por qué elegirnos</span><strong>${esc(differentiators[0] || pending("diferencial principal"))}</strong><p>${esc(differentiators[1] || brief.valueProposition || pending("segundo diferencial"))}</p></aside></section>${sectionMarkup(client, project)}</main><footer class="site-footer"><strong>${name}</strong><div class="footer-links"><a href="aviso-legal.html" data-legal="legal">Aviso legal</a><a href="privacidad.html" data-legal="privacy">Privacidad</a><a href="cookies.html" data-legal="cookies">Cookies</a>${termsLink}${cookieLink}</div></footer><dialog id="legal-dialog"><button class="close" aria-label="Cerrar">×</button><div class="legal"></div></dialog>${consentDialog}${cookieBanner}<script src="script.js"></script></body></html>`;
  const audit = assessProject(client, project);
  return {
    "index.html": index,
    "styles.css": style,
    "script.js": script,
    "aviso-legal.html": legalPage("Aviso legal", docs.legal, style),
    "privacidad.html": legalPage("Política de privacidad", docs.privacy, style),
    "cookies.html": legalPage("Política de cookies", docs.cookies, style),
    ...(project.siteType === "ecommerce" ? { "condiciones.html": legalPage("Condiciones de contratación", docs.terms, style) } : {}),
    "consent-manifest.json": JSON.stringify({ version: 1, generatedFrom: "Archic Studio", services: integrations }, null, 2),
    "vercel.json": JSON.stringify({ cleanUrls: true, trailingSlash: false }, null, 2),
    "archic.project.json": JSON.stringify({ generator: "Archic Studio", template, client, project, audit }, null, 2),
    "README.md": `# ${client?.name || project.name || "Sitio web"}\n\nSitio estático generado con Archic Studio.\n\n## Estado de salida\n\n- Puntuación de preparación: ${audit.score}/100\n- Bloqueos: ${audit.blockers.length}\n- Advertencias: ${audit.warnings.length}\n\n## Publicación\n\nImporta este repositorio en Vercel sin comando de build. La raíz contiene los archivos listos para servir.\n\n## Revisión obligatoria antes de publicar\n\n${[...audit.blockers, ...audit.warnings].map((item) => `- ${item.label}: ${item.detail}`).join("\n") || "- No quedan hallazgos en la configuración. Verificar aun así el sitio desplegado y el inventario técnico real."}\n- Conectar y probar el proveedor definitivo del formulario.\n- Comprobar accesibilidad, enlaces, metadatos y solicitudes de red en producción.\n`,
  };
}

export function buildWebsiteHtml(client: GeneratorClient | undefined, project: GeneratorProject) {
  const files = buildSiteBundle(client, project);
  return files["index.html"]
    .replace('<link rel="stylesheet" href="styles.css">', `<style>${files["styles.css"]}</style>`)
    .replace('<script src="script.js"></script>', `<script>${files["script.js"]}</script>`);
}
