import { getFounder } from "../../../../lib/founder-auth";

export async function GET() {
  try {
    const founder = await getFounder();
    if (!founder) {
      return Response.json({ error: "Esta cuenta no pertenece al equipo de Archic." }, { status: 403 });
    }
    return Response.json({ founder });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "No se pudo comprobar la sesión.",
    }, { status: 500 });
  }
}
