import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

async function getBinding() {
  const workersModule = "cloudflare:workers";
  const workers = await import(
    /* webpackIgnore: true */
    /* @vite-ignore */
    workersModule
  ) as typeof import("cloudflare:workers");
  if (!workers.env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }
  return workers.env.DB;
}

export async function getDb() {
  return drizzle(await getBinding(), { schema });
}

export async function ensureSchema() {
  const binding = await getBinding();
  await binding.batch([
    binding.prepare(`CREATE TABLE IF NOT EXISTS clients (
      id text PRIMARY KEY NOT NULL,
      owner_email text NOT NULL,
      name text NOT NULL,
      legal_name text DEFAULT '' NOT NULL,
      tax_id text DEFAULT '' NOT NULL,
      email text DEFAULT '' NOT NULL,
      phone text DEFAULT '' NOT NULL,
      address text DEFAULT '' NOT NULL,
      city text DEFAULT '' NOT NULL,
      country text DEFAULT 'España' NOT NULL,
      sector text DEFAULT 'Servicios' NOT NULL,
      registry_data text DEFAULT '' NOT NULL,
      professional_data text DEFAULT '' NOT NULL,
      status text DEFAULT 'active' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    binding.prepare(`CREATE TABLE IF NOT EXISTS projects (
      id text PRIMARY KEY NOT NULL,
      owner_email text NOT NULL,
      client_id text NOT NULL,
      name text NOT NULL,
      slug text NOT NULL,
      site_type text DEFAULT 'corporate' NOT NULL,
      template text DEFAULT 'costa' NOT NULL,
      primary_color text DEFAULT '#0B1628' NOT NULL,
      accent_color text DEFAULT '#B7924C' NOT NULL,
      headline text DEFAULT '' NOT NULL,
      subheadline text DEFAULT '' NOT NULL,
      hero_image_url text DEFAULT '' NOT NULL,
      sections_json text DEFAULT '[]' NOT NULL,
      integrations_json text DEFAULT '[]' NOT NULL,
      legal_json text DEFAULT '{}' NOT NULL,
      brief_json text DEFAULT '{}' NOT NULL,
      legal_profile_json text DEFAULT '{}' NOT NULL,
      status text DEFAULT 'draft' NOT NULL,
      compliance_score integer DEFAULT 0 NOT NULL,
      github_repo_full_name text DEFAULT '' NOT NULL,
      github_repo_url text DEFAULT '' NOT NULL,
      github_default_branch text DEFAULT 'main' NOT NULL,
      github_last_push_at text DEFAULT '' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`),
    binding.prepare(`CREATE TABLE IF NOT EXISTS audit_events (
      id text PRIMARY KEY NOT NULL,
      owner_email text NOT NULL,
      project_id text NOT NULL,
      title text NOT NULL,
      detail text DEFAULT '' NOT NULL,
      severity text DEFAULT 'info' NOT NULL,
      status text DEFAULT 'open' NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`),
    binding.prepare("CREATE INDEX IF NOT EXISTS clients_owner_idx ON clients (owner_email)"),
    binding.prepare("CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects (owner_email)"),
    binding.prepare("CREATE INDEX IF NOT EXISTS audits_owner_idx ON audit_events (owner_email)"),
  ]);

  const projectTableInfo = await binding.prepare("PRAGMA table_info(projects)").all<{ name: string }>();
  const projectColumns = new Set((projectTableInfo.results ?? []).map((column) => column.name));
  const projectAdditions = [
    ["headline", "ALTER TABLE projects ADD COLUMN headline text DEFAULT '' NOT NULL"],
    ["subheadline", "ALTER TABLE projects ADD COLUMN subheadline text DEFAULT '' NOT NULL"],
    ["hero_image_url", "ALTER TABLE projects ADD COLUMN hero_image_url text DEFAULT '' NOT NULL"],
    ["github_repo_full_name", "ALTER TABLE projects ADD COLUMN github_repo_full_name text DEFAULT '' NOT NULL"],
    ["github_repo_url", "ALTER TABLE projects ADD COLUMN github_repo_url text DEFAULT '' NOT NULL"],
    ["github_default_branch", "ALTER TABLE projects ADD COLUMN github_default_branch text DEFAULT 'main' NOT NULL"],
    ["github_last_push_at", "ALTER TABLE projects ADD COLUMN github_last_push_at text DEFAULT '' NOT NULL"],
    ["brief_json", "ALTER TABLE projects ADD COLUMN brief_json text DEFAULT '{}' NOT NULL"],
    ["legal_profile_json", "ALTER TABLE projects ADD COLUMN legal_profile_json text DEFAULT '{}' NOT NULL"],
  ] as const;
  for (const [name, statement] of projectAdditions) {
    if (!projectColumns.has(name)) await binding.prepare(statement).run();
  }

  const clientTableInfo = await binding.prepare("PRAGMA table_info(clients)").all<{ name: string }>();
  const clientColumns = new Set((clientTableInfo.results ?? []).map((column) => column.name));
  const clientAdditions = [
    ["registry_data", "ALTER TABLE clients ADD COLUMN registry_data text DEFAULT '' NOT NULL"],
    ["professional_data", "ALTER TABLE clients ADD COLUMN professional_data text DEFAULT '' NOT NULL"],
  ] as const;
  for (const [name, statement] of clientAdditions) {
    if (!clientColumns.has(name)) await binding.prepare(statement).run();
  }
}
