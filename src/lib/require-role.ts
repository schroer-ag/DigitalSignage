import { getCurrentUser, type CurrentUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Org } from "@/lib/signage-types";

// A Server Action is its own endpoint, independent of whatever page's
// layout renders the form that calls it -- /admin/layout.tsx redirecting
// non-admins away from the PAGE does nothing to stop someone invoking the
// action directly. Every super-admin-only action must check this itself.
export async function requireSuperAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return null;
  return user;
}

// Which orgs (FFA / District) the current user can see and edit content
// in. A super admin gets both regardless of what's in user_org_access --
// RLS already grants them everything via is_super_admin(), this just
// keeps the UI (which org tab to default to, folder-create options)
// consistent with that.
export async function getUserOrgs(): Promise<Org[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  if (user.role === "super_admin") return ["ffa", "district"];

  const supabase = await createClient();
  const { data } = await supabase.from("user_org_access").select("org").eq("user_id", user.id);
  return ((data ?? []) as { org: Org }[]).map((row) => row.org);
}
