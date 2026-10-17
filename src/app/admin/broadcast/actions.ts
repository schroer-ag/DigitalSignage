"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/require-role";
import { revalidatePath } from "next/cache";

export async function activateBroadcast(formData: FormData) {
  const user = await requireSuperAdmin();
  if (!user) return;

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return;

  const supabase = await createClient();
  await supabase
    .from("emergency_broadcast")
    .update({
      active: true,
      message,
      activated_by: user.id,
      activated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  revalidatePath("/admin/broadcast");
}

export async function deactivateBroadcast() {
  if (!(await requireSuperAdmin())) return;

  const supabase = await createClient();
  await supabase.from("emergency_broadcast").update({ active: false }).eq("id", 1);

  revalidatePath("/admin/broadcast");
}
