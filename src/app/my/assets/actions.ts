"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  const { error } = await supabase.from("assets").insert({
    owner_id: user.id,
    kind,
    org,
    folder_id: folderId,
    url,
    label: label || null,
  });

  // A failed insert (RLS denial, a bad constraint, anything) used to just
  // silently do nothing -- bounce back to the same folder with the
  // actual database error instead, so "it won't save" has a reason.
  if (error) {
    const params = new URLSearchParams({ org, error: error.message });
    if (folderId) params.set("folder", folderId);
    redirect(`/my/assets?${params.toString()}`);
  }

  revalidatePath("/my/assets");
}

export async function updateAsset(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const assetId = String(formData.get("asset_id") ?? "");
  const kind = String(formData.get("kind") ?? "image");
  const url = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const org = String(formData.get("org") ?? "");
  const folderId = String(formData.get("folder_id") ?? "").trim() || null;
  if (!assetId || !url) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("assets")
    .update({ kind, url, label: label || null })
    .eq("id", assetId);

  if (error) {
    const params = new URLSearchParams({ org, error: error.message, edit: assetId });
    if (folderId) params.set("folder", folderId);
    redirect(`/my/assets?${params.toString()}`);
  }

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
