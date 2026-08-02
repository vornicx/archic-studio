# Archic Studio

Herramienta privada de Archic para crear webs con una base visual sólida,
controles de consentimiento, documentos legales configurables y publicación
directa en GitHub. Está diseñada como un único espacio compartido para sus dos
fundadores, cada uno con su propia cuenta.

## Qué incluye

- fichas de cliente con datos legales;
- dos cuentas personales activadas mediante invitaciones distintas de un solo uso;
- clientes, proyectos y auditorías en un Postgres compartido, sin datos de demostración;
- presencia, actividad y sincronización en vivo mediante Supabase Realtime;
- control optimista de revisiones para impedir que dos guardados simultáneos se sobrescriban en silencio;
- constructor en seis pasos con briefing empresarial obligatorio;
- tres direcciones creativas: Origen, Forja y Atelier;
- público, objetivo, propuesta de valor, servicios, diferenciales, pruebas, voz y CTA propios;
- titular, texto de apoyo, imagen de portada, colores, secciones e integraciones;
- registro de privacidad con finalidades, base jurídica, conservación, destinatarios y transferencias;
- privacidad, cookies, aviso legal, contratación y primera capa de formularios;
- inventario versionado de servicios externos y consentimiento por categorías;
- auditoría con bloqueos reales de publicación, no solo una puntuación orientativa;
- vista previa responsive y exportación HTML;
- creación o actualización de un repositorio GitHub listo para importar en Vercel.

## Conexión con GitHub

La publicación se ejecuta únicamente desde la ruta de servidor
`/api/github`. La credencial nunca se devuelve al navegador.

Configura estas variables como secretos del entorno:

```text
GITHUB_TOKEN=
GITHUB_OWNER=vornicx
ARCHIC_PUBLISH_KEY=
```

La credencial debe estar limitada a la cuenta de Archic y permitir crear
repositorios y escribir su contenido. Cada publicación genera `index.html`,
`styles.css`, `script.js`, páginas legales independientes,
`consent-manifest.json`, `vercel.json`, `archic.project.json` y `README.md`.

En Vercel, `ARCHIC_PUBLISH_KEY` es obligatoria. El Studio la solicita al
publicar, la conserva solo durante la sesión del navegador y la compara en el
servidor antes de usar `GITHUB_TOKEN`. Utiliza una clave larga y distinta del
token de GitHub.

## Despliegue en Vercel

El script `npm run build` detecta `VERCEL=1` y ejecuta el build nativo de
Next.js, que produce la carpeta `.next` esperada por la plataforma. Fuera de
Vercel conserva el build Vinext/Cloudflare y su validación de Worker.

No configures manualmente otro directorio de salida en Vercel: deja el preset
Next.js y la salida predeterminada. El proyecto no utiliza `localStorage` como
base de datos: clientes, proyectos, auditorías, miembros y actividad viven en
Supabase y se comparten entre los dos navegadores.

### Base compartida y dos cuentas

1. Instala Supabase desde Vercel Marketplace y conéctalo a los entornos de
   producción, preview y desarrollo.
2. Ejecuta `vercel env pull .env.local` y después
   `npm run db:migrate:supabase` para crear las tablas, índices y políticas RLS.
3. Ejecuta `npm run auth:create-invites`. Añade únicamente los dos hashes como
   `ARCHIC_FOUNDER_INVITE_HASH_1` y `ARCHIC_FOUNDER_INVITE_HASH_2` en Vercel.
4. Entrega cada ruta de activación al fundador correspondiente por un canal
   privado. Cada enlace crea una sola cuenta y queda inutilizado al ocupar su
   plaza.

La clave de servicio de Supabase solo se usa en rutas de servidor para crear
esas dos cuentas y realizar operaciones ya autenticadas. El navegador recibe
exclusivamente la clave pública. Las políticas RLS deniegan a cualquier usuario
que no figure en `studio_members`, incluso si consigue registrarse directamente
contra el proveedor de autenticación.

## Flujo de producción

1. Completar la ficha reutilizable del cliente, incluidos los datos registrales
   o profesionales cuando correspondan.
2. Definir el encargo y su objetivo comercial.
3. Completar el briefing específico de la empresa. Los servicios aceptan el
   formato `Nombre | beneficio` y se convierten en contenido real de la web.
4. Elegir la dirección visual y escribir una portada coherente con el briefing.
5. Activar únicamente las integraciones necesarias. Cada una entra en el
   inventario de consentimiento con proveedor, categoría y finalidad.
6. Documentar los tratamientos reales y resolver todos los bloqueos críticos.
7. Revisar la web responsive, guardar y publicar. El servidor repite la
   auditoría antes de crear o actualizar el repositorio de GitHub.

Un `100/100` indica que los campos y controles configurados están completos;
no demuestra por sí solo que el sitio desplegado cumpla. Antes de hacerlo
público deben probarse el formulario definitivo, las solicitudes de red, las
cookies reales, la accesibilidad y la correspondencia entre textos y actividad.

## Arquitectura

- Next.js en Vercel y Vinext/React en Cloudflare, desde la misma fuente.
- Supabase Auth para sesiones seguras con cookies y dos invitaciones de fundador.
- Supabase Postgres con RLS para una única fuente de verdad compartida.
- Supabase Realtime privado para presencia, actividad y actualización inmediata.
- API REST de GitHub para repositorios y versiones generadas.
- Acceso privado comprobado en cada página y cada ruta de escritura.

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout and then validates the Sites artifact. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- `app/login/` contiene acceso, activación por invitación y recuperación.
- `proxy.ts` renueva de forma segura las cookies de sesión.
- `app/api/studio/` valida la cuenta en cada lectura y escritura.
- `supabase/migrations/` define Postgres, RLS y autorización Realtime privada.
- `scripts/migrate-supabase.mjs` aplica el esquema sin imprimir credenciales.
- `scripts/create-founder-invites.mjs` genera las dos invitaciones y sus hashes.
- `app/api/github/` publica únicamente para fundadores autenticados y vuelve a
  auditar el proyecto antes de escribir en GitHub.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: seleccionar automáticamente el artefacto de Vercel o Cloudflare
- `npm run build:vercel`: generar `.next` con el build nativo de Next.js
- `npm run build:cloudflare`: generar y validar el Worker Vinext
- `npm run start`: start the built Vinext application
- `npm run start:vercel`: iniciar localmente el build nativo de Next.js
- `npm test`: build, validate, and verify the rendered development-preview metadata
- `npm run validate:artifact`: recheck an existing artifact's manifest and ESM `default.fetch` export
- `npm run db:generate`: generate Drizzle migrations after schema changes
- `npm run db:migrate:supabase`: aplicar la base compartida y sus políticas RLS
- `npm run auth:create-invites`: generar las dos rutas de activación de un solo uso

Use build and validation commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
