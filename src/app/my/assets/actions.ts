"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { revalidatePath } from "next/cache";

export async function createAsset(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const kind = String(formData.get("kind") ?? "image");
  const org = String(formData.get("org") ?? "ffa");
  const folderId = String(formData.get("folder_id") ?? "").trim() || null;
  const url = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!url) return;

  const supabase = await createClient();
  // RLS (has_org_access) is what actually enforces that this user may
  // file something under `org` -- a mismatched org here just gets
  // rejected by the database, not silently allowed.
  await supabase.from("assets").insert({
    owner_id: user.id,
    kind,
    org,
    folder_id: folderId,
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
  // No owner_id filter -- anyone with access to this asset's org can
  // delete it (RLS enforces that org check), not just whoever made it.
  await supabase.from("assets").delete().eq("id", assetId);

  revalidatePath("/my/assets");
}

export async function moveAsset(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const assetId = String(formData.get("asset_id") ?? "");
  const folderId = String(formData.get("folder_id") ?? "").trim() || null;
  if (!assetId) return;

  const supabase = await createClient();
  await supabase.from("assets").update({ folder_id: folderId }).eq("id", assetId);

  revalidatePath("/my/assets");
}
