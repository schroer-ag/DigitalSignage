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
