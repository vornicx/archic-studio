import assert from "node:assert/strict";
import test from "node:test";

import {
  applyProjectTypePreset,
  getProjectFlowSteps,
  parseProjectDraftRecovery,
} from "../lib/project-flow.ts";

function project(overrides = {}) {
  return {
    clientId: "client-1",
    name: "Web de Acme",
    slug: "web-de-acme",
    siteType: "corporate",
    template: "costa",
    primaryColor: "#0B1628",
    accentColor: "#B7924C",
    headline: "Una empresa con criterio",
    subheadline: "Servicios claros para equipos que buscan un socio fiable.",
    heroImageUrl: "",
    sections: ["hero", "services", "contact"],
    integrations: [],
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
      objective: "Presentar la empresa y generar confianza",
      audience: "Responsables de pequeñas empresas en Andalucía",
      valueProposition: "Acompañamiento experto con un único equipo",
      services: ["Consultoría", "Implantación"],
      differentiators: ["Equipo propio", "Seguimiento semanal"],
      tone: "cercano",
      primaryCta: "Pedir propuesta",
      aboutStory: "Diez años resolviendo proyectos complejos.",
      proofPoints: [],
      seoKeywords: [],
    },
    legalProfile: {
      dataCategories: "Identificativos y contacto",
      privacyPurposes: "Responder solicitudes",
      legalBasis: "Medidas precontractuales",
      retention: "Durante un año",
      recipients: "Proveedor de alojamiento",
      internationalTransfers: "No previstas",
      marketing: false,
      minors: false,
      specialCategories: false,
      profiling: false,
      professionalReview: false,
    },
    ...overrides,
  };
}

const client = {
  name: "Acme",
  legalName: "Acme, S.L.",
  taxId: "B12345678",
  address: "Calle Real, 1",
  email: "hola@acme.es",
};

test("a project type applies a useful base without overwriting custom copy", () => {
  const customized = project({
    brief: {
      ...project().brief,
      objective: "Una meta específica del cliente",
      primaryCta: "Hablar con el equipo",
    },
  });
  const result = applyProjectTypePreset(customized, "booking");

  assert.equal(result.siteType, "booking");
  assert.deepEqual(result.sections, ["hero", "services", "gallery", "booking", "contact"]);
  assert.deepEqual(result.integrations, ["booking", "maps", "whatsapp"]);
  assert.equal(result.brief.objective, "Una meta específica del cliente");
  assert.equal(result.brief.primaryCta, "Hablar con el equipo");
});

test("flow states identify exact missing essentials and a ready project", () => {
  const incomplete = getProjectFlowSteps(client, project({ name: "", headline: "" }));
  assert.deepEqual(incomplete[0].missing, ["nombre del proyecto"]);
  assert.deepEqual(incomplete[2].missing, ["titular"]);
  assert.equal(incomplete[5].complete, false);

  const ready = getProjectFlowSteps(client, project());
  assert.equal(ready.every((step) => step.complete), true);
});

test("draft recovery rejects malformed storage and keeps a valid wizard snapshot", () => {
  assert.equal(parseProjectDraftRecovery("{}"), null);
  assert.equal(parseProjectDraftRecovery("not-json"), null);

  const snapshot = {
    version: 1,
    savedAt: "2026-08-01T10:00:00.000Z",
    step: 3,
    draft: project(),
  };
  assert.deepEqual(parseProjectDraftRecovery(JSON.stringify(snapshot)), snapshot);
});
