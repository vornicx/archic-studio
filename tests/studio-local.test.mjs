import assert from "node:assert/strict";
import test from "node:test";

import {
  applyLocalStudioAction,
  createDemoStudioData,
  parseLocalStudioData,
} from "../lib/studio-local.ts";

test("the Vercel browser store starts with the three sector examples", () => {
  const data = createDemoStudioData();
  assert.equal(data.clients.length, 3);
  assert.equal(data.projects.length, 3);
  assert.equal(data.audits.length, 3);
  assert.deepEqual(
    data.projects.map((project) => project.template),
    ["costa", "atlas", "norte"],
  );
});

test("local actions persist a client and a project without a server database", () => {
  const initial = createDemoStudioData();
  const withClient = applyLocalStudioAction(initial, {
    action: "createClient",
    client: {
      name: "Taller Horizonte",
      legalName: "Taller Horizonte, S.L.",
      taxId: "B87654321",
      email: "hola@tallerhorizonte.es",
      address: "Calle Nueva, 4",
      city: "Écija",
      country: "España",
      sector: "Arquitectura",
    },
  });
  const client = withClient.clients[0];
  assert.equal(client.name, "Taller Horizonte");
  assert.equal(client.phone, "");
  assert.equal(client.registryData, "");

  const result = applyLocalStudioAction(withClient, {
    action: "createProject",
    project: {
      ...initial.projects[0],
      id: undefined,
      clientId: client.id,
      name: "Nueva web corporativa",
      slug: "taller-horizonte",
    },
  });
  assert.ok(result.savedProjectId);
  assert.equal(result.projects[0].clientId, client.id);
  assert.equal(result.projects[0].name, "Nueva web corporativa");
});

test("stored browser data is accepted only with the expected collections", () => {
  const data = createDemoStudioData();
  assert.deepEqual(parseLocalStudioData(JSON.stringify(data)), data);
  assert.equal(parseLocalStudioData("{}"), null);
  assert.equal(parseLocalStudioData("not-json"), null);
});
