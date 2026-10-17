import { getCurrentUser, type CurrentUser } from "@/lib/current-user";

// A Server Action is its own endpoint, independent of whatever page's
// layout renders the form that calls it -- /admin/layout.tsx redirecting
// non-admins away from the PAGE does nothing to stop someone invoking the
// action directly. Every super-admin-only action must check this itself.
export async function requireSuperAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return null;
  return user;
}
