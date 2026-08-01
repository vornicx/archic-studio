import {
  assessProject,
  type BusinessBrief,
  type GeneratorClient,
  type GeneratorProject,
} from "./site-generator.ts";

export type ProjectFlowDraft = GeneratorProject & {
  clientId?: string;
  name?: string;
  slug?: string;
};

export type ProjectFlowStep = {
  id: "project" | "business" | "design" | "integrations" | "legal" | "preview";
  label: string;
  description: string;
  complete: boolean;
  missing: string[];
};

export type ProjectTypePreset = {
  id: "corporate" | "booking" | "ecommerce";
  label: string;
  description: string;
  outcome: string;
  objective: string;
  primaryCta: string;
  sections: string[];
  integrations: string[];
};

export const PROJECT_TYPE_PRESETS: ProjectTypePreset[] = [
  {
    id: "corporate",
    label: "Corporativa",
    description: "Explica servicios, genera confianza y abre una vía de contacto.",
    outcome: "Ideal para presentar una empresa y captar oportunidades.",
    objective: "Presentar la empresa y generar confianza",
    primaryCta: "Pedir propuesta",
    sections: ["hero", "services", "about", "contact"],
    integrations: ["maps", "whatsapp"],
  },
  {
    id: "booking",
    label: "Reservas",
    description: "Convierte visitas en citas, solicitudes o reservas.",
    outcome: "Ideal para alojamientos, clínicas, restaurantes y servicios con agenda.",
    objective: "Conseguir reservas",
    primaryCta: "Solicitar reserva",
    sections: ["hero", "services", "gallery", "booking", "contact"],
    integrations: ["booking", "maps", "whatsapp"],
  },
  {
    id: "ecommerce",
    label: "Ecommerce",
    description: "Presenta el catálogo y prepara la contratación online.",
    outcome: "Ideal cuando la web vende productos o contrata servicios a distancia.",
    objective: "Vender productos online",
    primaryCta: "Ver catálogo",
    sections: ["hero", "catalog", "services", "about", "contact"],
    integrations: ["analytics", "whatsapp"],
  },
];

export function getProjectTypePreset(siteType: string) {
  return PROJECT_TYPE_PRESETS.find((preset) => preset.id === siteType)
    ?? PROJECT_TYPE_PRESETS[0];
}

function keepCustomValue(
  current: string | undefined,
  suggested: string,
  presetValues: string[],
) {
  const normalized = current?.trim();
  return !normalized || presetValues.includes(normalized) ? suggested : current;
}

export function applyProjectTypePreset<T extends ProjectFlowDraft>(
  draft: T,
  siteType: string,
): T {
  const preset = getProjectTypePreset(siteType);
  const knownObjectives = PROJECT_TYPE_PRESETS.map((item) => item.objective);
  const knownCtas = PROJECT_TYPE_PRESETS.map((item) => item.primaryCta);
  const brief: BusinessBrief = {
    ...draft.brief,
    objective: keepCustomValue(draft.brief?.objective, preset.objective, knownObjectives),
    primaryCta: keepCustomValue(draft.brief?.primaryCta, preset.primaryCta, knownCtas),
  };

  return {
    ...draft,
    siteType: preset.id,
    sections: [...preset.sections],
    integrations: [...preset.integrations],
    brief,
    legal: {
      ...draft.legal,
      terms: preset.id === "ecommerce",
      returns: preset.id === "ecommerce",
    },
  };
}

function missingText(value: string | undefined, label: string, missing: string[]) {
  if (!value?.trim()) missing.push(label);
}

export function getProjectFlowSteps(
  client: GeneratorClient | undefined,
  draft: ProjectFlowDraft,
): ProjectFlowStep[] {
  const projectMissing: string[] = [];
  if (!draft.clientId) projectMissing.push("cliente");
  missingText(draft.name, "nombre del proyecto", projectMissing);
  missingText(draft.slug, "ruta", projectMissing);

  const businessMissing: string[] = [];
  missingText(draft.brief?.objective, "objetivo", businessMissing);
  missingText(draft.brief?.audience, "público prioritario", businessMissing);
  missingText(draft.brief?.valueProposition, "propuesta de valor", businessMissing);

  const designMissing: string[] = [];
  missingText(draft.headline, "titular", designMissing);
  missingText(draft.subheadline, "texto de apoyo", designMissing);
  if (!draft.sections.length) designMissing.push("al menos una sección");

  const assessment = assessProject(client, draft);
  const legalMissing = assessment.blockers.map((finding) => finding.label);
  const previewComplete = projectMissing.length === 0
    && businessMissing.length === 0
    && designMissing.length === 0
    && legalMissing.length === 0;

  return [
    {
      id: "project",
      label: "Proyecto",
      description: "Cliente y tipo de web",
      complete: projectMissing.length === 0,
      missing: projectMissing,
    },
    {
      id: "business",
      label: "Empresa",
      description: "Objetivo y mensaje",
      complete: businessMissing.length === 0,
      missing: businessMissing,
    },
    {
      id: "design",
      label: "Diseño",
      description: "Identidad y estructura",
      complete: designMissing.length === 0,
      missing: designMissing,
    },
    {
      id: "integrations",
      label: "Servicios",
      description: "Conexiones externas",
      complete: true,
      missing: [],
    },
    {
      id: "legal",
      label: "Legal",
      description: "Datos y controles",
      complete: legalMissing.length === 0,
      missing: legalMissing,
    },
    {
      id: "preview",
      label: "Revisión",
      description: "Vista y publicación",
      complete: previewComplete,
      missing: previewComplete ? [] : ["revisar los pasos pendientes"],
    },
  ];
}

export type ProjectDraftRecovery = {
  version: 1;
  savedAt: string;
  step: number;
  draft: ProjectFlowDraft & Record<string, unknown>;
};

export function parseProjectDraftRecovery(raw: string | null): ProjectDraftRecovery | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ProjectDraftRecovery>;
    if (
      parsed.version !== 1
      || typeof parsed.savedAt !== "string"
      || !Number.isInteger(parsed.step)
      || Number(parsed.step) < 1
      || Number(parsed.step) > 6
      || !parsed.draft
      || typeof parsed.draft !== "object"
      || typeof parsed.draft.siteType !== "string"
      || !Array.isArray(parsed.draft.sections)
      || !Array.isArray(parsed.draft.integrations)
      || !parsed.draft.brief
      || typeof parsed.draft.brief !== "object"
      || !parsed.draft.legalProfile
      || typeof parsed.draft.legalProfile !== "object"
      || !parsed.draft.legal
      || typeof parsed.draft.legal !== "object"
    ) return null;
    return parsed as ProjectDraftRecovery;
  } catch {
    return null;
  }
}
