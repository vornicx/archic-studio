export async function runtimeEnv(): Promise<Record<string, string | undefined>> {
  const nodeValues: Record<string, string | undefined> =
    typeof process !== "undefined" ? process.env : {};
  if (nodeValues.VERCEL === "1") return nodeValues;

  const workersModule = "cloudflare:workers";
  try {
    const workers = await import(
      /* webpackIgnore: true */
      /* @vite-ignore */
      workersModule
    ) as typeof import("cloudflare:workers");
    return workers.env as unknown as Record<string, string | undefined>;
  } catch {
    return nodeValues;
  }
}
