import { redirect } from "next/navigation";
import { getFounder } from "../../../lib/founder-auth";
import { getSupabasePublicConfig } from "../../../lib/supabase/config";
import ResetPasswordForm from "./reset-password-form";

export const metadata = { title: "Nueva contraseña · Archic Studio" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  if (!getSupabasePublicConfig()) redirect("/login");
  if (!await getFounder()) redirect("/login");
  return <main className="auth-page auth-page-single"><ResetPasswordForm /></main>;
}
