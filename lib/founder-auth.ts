import { createAdminSupabase, createServerSupabase } from "./supabase/server";

export type Founder = {
  id: string;
  email: string;
  name: string;
  slot: 1 | 2;
  color: string;
};

type MemberRow = {
  user_id: string;
  email: string;
  display_name: string;
  slot: number;
  color: string;
};

function memberToFounder(member: MemberRow): Founder {
  return {
    id: member.user_id,
    email: member.email,
    name: member.display_name,
    slot: member.slot === 2 ? 2 : 1,
    color: member.color,
  };
}
export async function getFounder(): Promise<Founder | null> {
  const supabase = await createServerSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from("studio_members")
    .select("user_id,email,display_name,slot,color")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo comprobar el acceso al Studio: ${error.message}`);
  return data ? memberToFounder(data as MemberRow) : null;
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user?.id ?? null;
}
