"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { revalidatePath } from "next/cache";

export async function createAsset(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const kind = String(formData.get("kind") ?? "image");
  const org = String(formData.get("org") ?? "ffa");
  const url = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!url) return;

  const supabase = await createClient();
  await supabase.from("assets").insert({
    owner_id: user.id,
    kind,
    org,
    url,
    label: label || null,
  });

  revalidatePath("/my/assets");
}

export async function deleteAsset(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const assetId = String(formData.get("asset_id") ?? "");
  if (!assetId) return;

  const supabase = await createClient();
  // Scoped to owner_id so a user can only ever delete their own assets.
  await supabase.from("assets").delete().eq("id", assetId).eq("owner_id", user.id);

  revalidatePath("/my/assets");
}
