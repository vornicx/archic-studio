import { redirect } from "next/navigation";
import { getFounder } from "../../lib/founder-auth";
import { getSupabasePublicConfig } from "../../lib/supabase/config";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Acceso · Archic Studio",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; error?: string }>;
}) {
  const params = await searchParams;
  const configured = Boolean(getSupabasePublicConfig());

  if (configured) {
    const founder = await getFounder();
    if (founder) redirect("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Archic Studio">
        <div className="auth-brand">
          <span className="brand-emblem"><i /><b>A</b></span>
          <span>Archic<br />Studio</span>
        </div>
        <div className="auth-story-copy">
          <p className="overline">Estudio privado · 2 fundadores</p>
          <h1>Un único lugar para construir juntos.</h1>
          <p>Clientes reales, decisiones compartidas y cada cambio visible para el otro fundador en el momento.</p>
        </div>
        <div className="auth-principles">
          <span><i />Dos cuentas personales</span>
          <span><i />Datos compartidos y protegidos</span>
          <span><i />Presencia y actividad en vivo</span>
        </div>
      </section>
      {configured ? (
        <LoginForm invite={params.invite ?? ""} linkError={params.error === "enlace"} />
      ) : (
        <section className="auth-card auth-unconfigured">
          <p className="overline">Configuración pendiente</p>
          <h2>La base compartida todavía no está conectada.</h2>
          <p>Conecta Supabase en Vercel y vuelve a desplegar. Archic Studio no utilizará datos locales ni cuentas provisionales.</p>
        </section>
      )}
    </main>
  );
}
