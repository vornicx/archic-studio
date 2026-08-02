"use client";

import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getBrowserSupabase } from "../../lib/supabase/client";

type Mode = "login" | "claim" | "reset";

export default function LoginForm({ invite, linkError }: { invite: string; linkError: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(invite ? "claim" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkError ? "El enlace ha caducado o no es válido." : "");
  const [notice, setNotice] = useState("");

  async function enterStudio() {
    const check = await fetch("/api/auth/me", { cache: "no-store" });
    if (!check.ok) {
      await getBrowserSupabase().auth.signOut();
      const payload = await check.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error || "Esta cuenta no tiene acceso al Studio.");
    }
    router.replace("/");
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const supabase = getBrowserSupabase();
      if (mode === "reset") {
        const redirectTo = `${window.location.origin}/auth/callback?next=/cuenta/restablecer`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (resetError) throw resetError;
        setNotice("Te hemos enviado un enlace seguro para elegir una contraseña nueva.");
        return;
      }

      if (mode === "claim") {
        const response = await fetch("/api/auth/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ invite, name, email, password }),
        });
        const payload = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(payload.error || "No se pudo activar la cuenta.");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw new Error("Correo o contraseña incorrectos.");
      await enterStudio();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo completar el acceso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-card-heading">
        <span className="auth-icon">{mode === "claim" ? <KeyRound /> : <LockKeyhole />}</span>
        <p className="overline">{mode === "claim" ? "Invitación personal" : mode === "reset" ? "Recuperar acceso" : "Acceso del equipo"}</p>
        <h2>{mode === "claim" ? "Activa tu cuenta de fundador" : mode === "reset" ? "Restablece tu contraseña" : "Entra en el Studio"}</h2>
        <p>{mode === "claim" ? "Esta invitación ocupa una de las dos plazas y solo puede utilizarse una vez." : mode === "reset" ? "Recibirás el enlace únicamente si el correo pertenece a una cuenta válida." : "Utiliza tu cuenta personal; nunca compartáis una contraseña."}</p>
      </div>

      <form onSubmit={submit} className="auth-form">
        {mode === "claim" ? <label><span>Nombre visible</span><div><UserRound /><input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Cómo te verá el otro fundador" /></div></label> : null}
        <label><span>Correo</span><div><Mail /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@empresa.com" /></div></label>
        {mode !== "reset" ? <label><span>Contraseña</span><div><LockKeyhole /><input type={visible ? "text" : "password"} autoComplete={mode === "claim" ? "new-password" : "current-password"} required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "claim" ? "Mínimo 12 caracteres" : "Tu contraseña"} /><button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>{visible ? <EyeOff /> : <Eye />}</button></div></label> : null}

        {error ? <div className="auth-message auth-error">{error}</div> : null}
        {notice ? <div className="auth-message auth-success"><CheckCircle2 />{notice}</div> : null}

        <button className="primary-button auth-submit" disabled={busy}>
          {busy ? <Loader2 className="spin" /> : mode === "reset" ? <Mail /> : <ArrowRight />}
          {busy ? "Comprobando..." : mode === "claim" ? "Activar y entrar" : mode === "reset" ? "Enviar enlace" : "Entrar"}
        </button>
      </form>

      <div className="auth-card-foot">
        {mode === "login" ? <button onClick={() => { setMode("reset"); setError(""); }}>He olvidado mi contraseña</button> : null}
        {mode === "reset" ? <button onClick={() => { setMode("login"); setError(""); setNotice(""); }}>Volver al acceso</button> : null}
        {mode === "claim" ? <Link href="/login">Ya tengo mi cuenta</Link> : null}
      </div>
    </section>
  );
}
