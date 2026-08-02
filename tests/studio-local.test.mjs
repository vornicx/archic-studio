import assert from "node:assert/strict";
import test from "node:test";

import {
  applyLocalStudioAction,
  createEmptyStudioData,
  parseLocalStudioData,
} from "../lib/studio-local.ts";

test("the Studio starts empty instead of inventing clients or projects", () => {
  assert.deepEqual(createEmptyStudioData(), {
    clients: [],
    projects: [],
    audits: [],
  });
});

test("the pure reducer can add a real client and its first project", () => {
  const initial = createEmptyStudioData();
  const withClient = applyLocalStudioAction(initial, {
    action: "createClient",
    client: {
      name: "Empresa real",
      legalName: "Empresa real, S.L.",
      taxId: "B87654321",
      email: "hola@empresa-real.es",
      address: "Calle Principal, 4",
      city: "Écija",
      country: "España",
      sector: "Servicios",
    },
  });
  const client = withClient.clients[0];
  assert.equal(client.name, "Empresa real");
  assert.equal(client.phone, "");
  assert.equal(client.registryData, "");

  const result = applyLocalStudioAction(withClient, {
    action: "createProject",
    project: {
      clientId: client.id,
      name: "Nueva web corporativa",
      slug: "empresa-real",
      siteType: "corporate",
      template: "costa",
      primaryColor: "#0B1628",
      accentColor: "#B7924C",
      headline: "Una propuesta real",
      subheadline: "Contenido validado con la empresa.",
      sections: ["hero", "services", "about", "contact"],
      integrations: [],
      legal: {},
      brief: {},
      legalProfile: {},
    },
  });
  assert.ok(result.savedProjectId);
  assert.equal(result.projects[0].clientId, client.id);
  assert.equal(result.projects[0].name, "Nueva web corporativa");
});

test("stored data is accepted only with the expected collections", () => {
  const data = createEmptyStudioData();
  assert.deepEqual(parseLocalStudioData(JSON.stringify(data)), data);
  assert.equal(parseLocalStudioData("{}"), null);
  assert.equal(parseLocalStudioData("not-json"), null);
});
