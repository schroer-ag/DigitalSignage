import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  role: "super_admin" | "user";
};

// Combines the Supabase session with the app's own `users` row. Role comes
// from the database, OR'd with the SUPER_ADMIN_EMAILS break-glass list so
// the bootstrap super admin never has to be hand-inserted into the table.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return null;

  const { data: row } = await supabase
    .from("users")
    .select("display_name, role")
    .eq("id", auth.user.id)
    .maybeSingle();

  const role: CurrentUser["role"] =
    row?.role === "super_admin" || isSuperAdmin(auth.user.email)
      ? "super_admin"
      : "user";

  return {
    id: auth.user.id,
    email: auth.user.email,
    displayName: row?.display_name ?? auth.user.email,
    role,
  };
}
