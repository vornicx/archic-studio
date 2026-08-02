import { redirect } from "next/navigation";
import { getFounder } from "../lib/founder-auth";
import { getSupabasePublicConfig } from "../lib/supabase/config";
import StudioApp from "./studio-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!getSupabasePublicConfig()) redirect("/login");
  const founder = await getFounder();
  if (!founder) redirect("/login");

  return <StudioApp user={founder} />;
}
