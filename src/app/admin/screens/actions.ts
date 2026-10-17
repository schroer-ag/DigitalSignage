"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registerScreen(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const building = String(formData.get("building") ?? "").trim();
  const brandingGroup = String(formData.get("branding_group") ?? "district");

  if (!name) return;

  const supabase = await createClient();
  await supabase.from("screens").insert({
    name,
    building: building || null,
    branding_group: brandingGroup,
  });

  revalidatePath("/admin/screens");
}

export async function assignUserToScreen(formData: FormData) {
  const screenId = String(formData.get("screen_id") ?? "");
  const userId = String(formData.get("user_id") ?? "");
  if (!screenId || !userId) return;

  const supabase = await createClient();
  await supabase
    .from("user_screen_access")
    .upsert({ screen_id: screenId, user_id: userId }, { onConflict: "user_id,screen_id" });

  revalidatePath("/admin/screens");
}
