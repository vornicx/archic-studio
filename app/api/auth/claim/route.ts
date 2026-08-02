import { createHash, timingSafeEqual } from "node:crypto";
import { createAdminSupabase } from "../../../../lib/supabase/server";

type Invite = {
  slot: 1 | 2;
  hash: string;
  color: string;
};

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function inviteHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function configuredInvites(): Invite[] {
  return [
    { slot: 1 as const, hash: process.env.ARCHIC_FOUNDER_INVITE_HASH_1?.trim() ?? "", color: "#B7924C" },
    { slot: 2 as const, hash: process.env.ARCHIC_FOUNDER_INVITE_HASH_2?.trim() ?? "", color: "#527D73" },
  ].filter((invite) => invite.hash.length === 64);
}

function safeHashMatch(left: string, right: string) {
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const expectedHost = request.headers.get("x-forwarded-host")
      || request.headers.get("host")
      || new URL(request.url).host;
    return new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Solicitud rechazada." }, { status: 403 });
  }

  try {
    const body = await request.json() as {
      invite?: unknown;
      name?: unknown;
      email?: unknown;
      password?: unknown;
    };
    const token = clean(body.invite, 200);
    const name = clean(body.name, 80);
    const email = clean(body.email, 320).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (token.length < 32 || name.length < 2 || !email.includes("@")) {
      return Response.json({ error: "Completa el nombre, el correo y una invitación válida." }, { status: 400 });
    }
    if (password.length < 12 || password.length > 128) {
      return Response.json({ error: "La contraseña debe tener entre 12 y 128 caracteres." }, { status: 400 });
    }

    const hash = inviteHash(token);
    const invite = configuredInvites().find((candidate) => safeHashMatch(candidate.hash, hash));
    if (!invite) {
      return Response.json({ error: "La invitación no es válida o ya fue sustituida." }, { status: 403 });
    }

    const admin = createAdminSupabase();
    const [{ data: occupied }, { data: claimed }] = await Promise.all([
      admin.from("studio_members").select("user_id").eq("slot", invite.slot).maybeSingle(),
      admin.from("founder_invites").select("claimed_by").eq("token_hash", hash).maybeSingle(),
    ]);
    if (occupied || claimed?.claimed_by) {
      return Response.json({ error: "Esta invitación ya se utilizó." }, { status: 409 });
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name, founder_slot: invite.slot },
    });
    if (createError || !created.user) {
      return Response.json({
        error: createError?.message.toLowerCase().includes("registered")
          ? "Ese correo ya tiene una cuenta. Entra o utiliza otro correo."
          : "No se pudo activar la cuenta. Inténtalo de nuevo.",
      }, { status: 409 });
    }

    const userId = created.user.id;
    const { error: memberError } = await admin.from("studio_members").insert({
      user_id: userId,
      slot: invite.slot,
      email,
      display_name: name,
      color: invite.color,
    });
    if (memberError) {
      await admin.auth.admin.deleteUser(userId);
      return Response.json({ error: "La plaza de esta invitación acaba de ocuparse." }, { status: 409 });
    }

    const { error: inviteError } = await admin.from("founder_invites").upsert({
      token_hash: hash,
      slot: invite.slot,
      claimed_by: userId,
      claimed_at: new Date().toISOString(),
    }, { onConflict: "token_hash" });
    if (inviteError) {
      await admin.from("studio_members").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
      throw new Error(inviteError.message);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "No se pudo activar la cuenta.",
    }, { status: 500 });
  }
}
