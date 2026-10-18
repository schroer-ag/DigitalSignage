"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/require-role";
import { revalidatePath } from "next/cache";

export async function setUserRole(formData: FormData) {
  if (!(await requireSuperAdmin())) return;

  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "user");
  if (!userId) return;

  const supabase = await createClient();
  await supabase.from("users").update({ role }).eq("id", userId);

  revalidatePath("/admin/users");
}

export async function setUserOrgAccess(formData: FormData) {
  if (!(await requireSuperAdmin())) return;

  const userId = String(formData.get("user_id") ?? "");
  const ffa = formData.get("ffa") === "on";
  const district = formData.get("district") === "on";
  if (!userId) return;

  const supabase = await createClient();

  // Simplest correct approach for two possible rows: clear and
  // re-insert whichever are checked, rather than diffing.
  await supabase.from("user_org_access").delete().eq("user_id", userId);

  const rows = [
    ...(ffa ? [{ user_id: userId, org: "ffa" }] : []),
    ...(district ? [{ user_id: userId, org: "district" }] : []),
  ];
  if (rows.length > 0) {
    await supabase.from("user_org_access").insert(rows);
  }

  revalidatePath("/admin/users");
}
