import assert from "node:assert/strict";
import test from "node:test";

import {
  assessProject,
  buildSiteBundle,
  legalDocument,
} from "../lib/site-generator.ts";

const client = {
  name: "Taller Horizonte",
  legalName: "Taller Horizonte, S.L.",
  taxId: "B12345678",
  email: "privacidad@taller-horizonte.example",
  phone: "+34 600 000 000",
  address: "Calle Ejemplo, 1",
  city: "Sevilla",
  country: "España",
  sector: "Diseño y fabricación",
  registryData: "Registro Mercantil: dato de prueba",
  professionalData: "",
};

const project = {
  name: "Nueva web",
  slug: "taller-horizonte",
  siteType: "corporate",
  template: "costa",
  primaryColor: "#102239",
  accentColor: "#B8894A",
  headline: "Objetos que hacen más humano cada espacio.",
  subheadline: "Diseñamos y fabricamos piezas duraderas para estudios que no aceptan soluciones intercambiables.",
  heroImageUrl: "",
  sections: ["hero", "services", "projects", "about", "contact"],
  integrations: ["analytics", "whatsapp"],
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
    objective: "Generar solicitudes cualificadas",
    audience: "Estudios de arquitectura y negocios de hostelería del sur de España",
    valueProposition: "Diseño y fabricación local con control directo de cada pieza",
    services: [
      "Diseño a medida | Piezas desarrolladas para el espacio y el uso real",
      "Fabricación local | Producción controlada desde el prototipo hasta el acabado",
      "Instalación | Coordinación final con el equipo de obra",
    ],
    differentiators: ["Un único equipo diseña y fabrica", "Materiales trazables y reparables"],
    tone: "experto",
    primaryCta: "Estudiar mi proyecto",
    aboutStory: "El taller nació para recuperar el vínculo entre quien diseña, quien fabrica y quien usa cada pieza.",
    proofPoints: ["Prototipado propio", "Producción en Sevilla", "Seguimiento de instalación"],
    seoKeywords: ["mobiliario a medida Sevilla"],
  },
  legalProfile: {
    dataCategories: "Datos identificativos, profesionales y de contacto",
    privacyPurposes: "Responder consultas y elaborar propuestas solicitadas",
    legalBasis: "Aplicación de medidas precontractuales",
    retention: "Durante la solicitud y los plazos legales posteriores",
    recipients: "Proveedor de alojamiento y asesoría bajo contrato",
    internationalTransfers: "Analytics: verificar garantías y configuración antes de publicar",
    dpoEmail: "",
    marketing: false,
    minors: false,
    specialCategories: false,
    profiling: false,
    professionalReview: false,
    lastReviewedAt: "2026-08-01",
  },
};

test("a complete company brief produces personalized output and a ready assessment", () => {
  const audit = assessProject(client, project);
  assert.equal(audit.score, 100);
  assert.equal(audit.status, "ready");
  assert.equal(audit.blockers.length, 0);

  const files = buildSiteBundle(client, project);
  assert.match(files["index.html"], /Diseño a medida/);
  assert.match(files["index.html"], /Materiales trazables y reparables/);
  assert.match(files["index.html"], /Estudiar mi proyecto/);
  assert.doesNotMatch(files["index.html"], /Servicio principal/);
  assert.doesNotMatch(files["styles.css"], /fonts\.googleapis\.com/);
});

test("the bundle contains direct legal pages and a consent inventory", () => {
  const files = buildSiteBundle(client, project);
  assert.ok(files["aviso-legal.html"]);
  assert.ok(files["privacidad.html"]);
  assert.ok(files["cookies.html"]);
  assert.match(files["index.html"], /Aceptar opcionales/);
  assert.match(files["index.html"], /Rechazar opcionales/);
  assert.match(files["script.js"], /archic-consent-v1/);

  const manifest = JSON.parse(files["consent-manifest.json"]);
  assert.deepEqual(manifest.services.map((service) => service.id), ["analytics", "whatsapp"]);
});

test("missing privacy facts block publication and stay visible in documents", () => {
  const incomplete = {
    ...project,
    legalProfile: { ...project.legalProfile, retention: "", recipients: "" },
  };
  const audit = assessProject(client, incomplete);
  assert.equal(audit.status, "attention");
  assert.ok(audit.blockers.some((finding) => finding.id === "privacy"));
  assert.match(legalDocument(client, incomplete, "privacy"), /REVISIÓN NECESARIA: plazos o criterios de conservación/);
});

test("high-risk processing requires documented professional review", () => {
  const risky = {
    ...project,
    legalProfile: { ...project.legalProfile, specialCategories: true, professionalReview: false },
  };
  assert.ok(assessProject(client, risky).blockers.some((finding) => finding.id === "risk"));
  const reviewed = { ...risky, legalProfile: { ...risky.legalProfile, professionalReview: true } };
  assert.ok(!assessProject(client, reviewed).blockers.some((finding) => finding.id === "risk"));
});

test("ecommerce stays blocked until operational terms are supplied", () => {
  const ecommerce = {
    ...project,
    siteType: "ecommerce",
    legal: { ...project.legal, terms: true, returns: true },
  };
  assert.ok(assessProject(client, ecommerce).blockers.some((finding) => finding.id === "commerce"));

  const complete = {
    ...ecommerce,
    legalProfile: {
      ...ecommerce.legalProfile,
      paymentMethods: "Tarjeta mediante proveedor seguro",
      deliveryTerms: "España peninsular, entre 3 y 5 días laborables",
      returnCosts: "A cargo de la persona compradora salvo defecto",
      withdrawalInfo: "14 días naturales, salvo excepciones legalmente aplicables descritas en cada ficha",
    },
  };
  assert.ok(!assessProject(client, complete).blockers.some((finding) => finding.id === "commerce"));
  assert.ok(buildSiteBundle(client, complete)["condiciones.html"]);
});
