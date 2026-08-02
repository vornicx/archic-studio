"use client";

import { CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { getBrowserSupabase } from "../../../lib/supabase/client";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== repeat) return setError("Las contraseñas no coinciden.");
    if (password.length < 12) return setError("Utiliza al menos 12 caracteres.");
    setBusy(true);
    setError("");
    const { error: updateError } = await getBrowserSupabase().auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError("El enlace ha caducado. Solicita uno nuevo.");
    window.location.assign("/");
  }

  return <section className="auth-card reset-card"><span className="auth-icon"><LockKeyhole /></span><p className="overline">Cuenta protegida</p><h2>Elige una contraseña nueva</h2><p>Debe tener al menos 12 caracteres y ser distinta de las que utilizas en otros servicios.</p><form onSubmit={submit} className="auth-form"><label><span>Nueva contraseña</span><div><LockKeyhole /><input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} /></div></label><label><span>Repetir contraseña</span><div><CheckCircle2 /><input type="password" autoComplete="new-password" required minLength={12} value={repeat} onChange={(event) => setRepeat(event.target.value)} /></div></label>{error ? <div className="auth-message auth-error">{error}</div> : null}<button className="primary-button auth-submit" disabled={busy}>{busy ? <Loader2 className="spin" /> : <CheckCircle2 />}{busy ? "Guardando..." : "Guardar contraseña"}</button></form></section>;
}
