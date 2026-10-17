"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { revalidatePath } from "next/cache";

export async function activateBroadcast(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return;

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
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return;

  const supabase = await createClient();
  await supabase.from("emergency_broadcast").update({ active: false }).eq("id", 1);

  revalidatePath("/admin/broadcast");
}
