"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

const STORAGE_BUCKET = "assets";

// Clamp to the same 1-90 range the database check constraint enforces,
// so a bad value fails obviously here rather than as a cryptic DB error.
function clampDaysAhead(raw: FormDataEntryValue | null): number {
  const n = Number(raw ?? 30);
  if (!Number.isFinite(n)) return 30;
  return Math.min(90, Math.max(1, Math.round(n)));
}

// Same idea, for the 1-300 range default_duration_seconds' check enforces.
function clampDefaultDuration(raw: FormDataEntryValue | null): number {
  const n = Number(raw ?? 10);
  if (!Number.isFinite(n)) return 10;
  return Math.min(300, Math.max(1, Math.round(n)));
}

// If `url` points at our own uploads bucket, pull the storage path back out
// of the public URL so it can be deleted -- a link pasted from Drive,
// YouTube, etc. never matches this and is left alone (we don't own it).
function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

// Best-effort: an asset row should never fail to save or delete just
// because cleaning up its old uploaded file in storage hiccuped. Worst
// case is an orphaned file sitting in the bucket, not a broken asset.
async function deleteStorageObjectIfOwned(supabase: SupabaseClient, url: string | null) {
  const path = url ? storagePathFromUrl(url) : null;
  if (!path) return;
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}

export async function createAsset(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const kind = String(formData.get("kind") ?? "image");
  const org = String(formData.get("org") ?? "ffa");
  const folderId = String(formData.get("folder_id") ?? "").trim() || null;
  const typedUrl = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const daysAhead = clampDaysAhead(formData.get("days_ahead"));
  const defaultDuration = clampDefaultDuration(formData.get("default_duration_seconds"));
  // The file itself already went straight from the browser to Supabase
  // Storage (see AssetForm.tsx) -- a Vercel serverless function has a hard
  // ~4.5MB request body cap that no Next.js config can lift, so the file
  // bytes never come through this Server Action. Only the resulting
  // (small) public URL does.
  const fileUrl = String(formData.get("file_url") ?? "").trim();
  const fileName = String(formData.get("file_name") ?? "").trim();

  const supabase = await createClient();

  const bail = (message: string) => {
    const params = new URLSearchParams({ org, error: message });
    if (folderId) params.set("folder", folderId);
    redirect(`/my/assets?${params.toString()}`);
  };

  // An uploaded file only makes sense for image/video -- an embed or
  // calendar asset is always a link, so a leftover file_url from switching
  // kinds is just ignored rather than erroring.
  let url = typedUrl;
  let resolvedLabel = label;
  if (fileUrl && (kind === "image" || kind === "video")) {
    url = fileUrl;
    if (!resolvedLabel) resolvedLabel = fileName;
  }

  if (!url) bail("Add a link or upload a file.");

  // RLS (has_org_access) is what actually enforces that this user may
  // file something under `org` -- a mismatched org here just gets
  // rejected by the database, not silently allowed.
  const { error } = await supabase.from("assets").insert({
    owner_id: user.id,
    kind,
    org,
    folder_id: folderId,
    url,
    label: resolvedLabel || null,
    days_ahead: daysAhead,
    default_duration_seconds: defaultDuration,
  });

  // A failed insert (RLS denial, a bad constraint, anything) used to just
  // silently do nothing -- bounce back to the same folder with the
  // actual database error instead, so "it won't save" has a reason.
  if (error) bail(error.message);

  revalidatePath("/my/assets");
}

export async function updateAsset(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const assetId = String(formData.get("asset_id") ?? "");
  const kind = String(formData.get("kind") ?? "image");
  const typedUrl = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const org = String(formData.get("org") ?? "");
  const folderId = String(formData.get("folder_id") ?? "").trim() || null;
  const daysAhead = clampDaysAhead(formData.get("days_ahead"));
  const defaultDuration = clampDefaultDuration(formData.get("default_duration_seconds"));
  const fileUrl = String(formData.get("file_url") ?? "").trim();
  const fileName = String(formData.get("file_name") ?? "").trim();
  if (!assetId) return;

  const supabase = await createClient();

  const bail = (message: string) => {
    const params = new URLSearchParams({ org, error: message, edit: assetId });
    if (folderId) params.set("folder", folderId);
    redirect(`/my/assets?${params.toString()}`);
  };

  // Need the row's current url up front: if this edit uploaded a new file
  // (or otherwise changes the url), the old uploaded file -- if it was one
  // of ours -- gets cleaned up after the update succeeds, same reasoning
  // as deleteAsset below.
  const { data: existing } = await supabase.from("assets").select("url").eq("id", assetId).maybeSingle();
  const previousUrl = existing?.url ?? null;

  let url = typedUrl;
  let resolvedLabel = label;
  if (fileUrl && (kind === "image" || kind === "video")) {
    url = fileUrl;
    if (!resolvedLabel) resolvedLabel = fileName;
  }

  if (!url) bail("Add a link or upload a file.");

  const { error } = await supabase
    .from("assets")
    .update({
      kind,
      url,
      label: resolvedLabel || null,
      days_ahead: daysAhead,
      default_duration_seconds: defaultDuration,
    })
    .eq("id", assetId);

  if (error) bail(error.message);

  if (previousUrl && previousUrl !== url) {
    await deleteStorageObjectIfOwned(supabase, previousUrl);
  }

  revalidatePath("/my/assets");
}

export async function deleteAsset(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const assetId = String(formData.get("asset_id") ?? "");
  if (!assetId) return;

  const supabase = await createClient();

  // Grab the url before the row is gone so an uploaded file can be cleaned
  // up out of storage too -- otherwise deleting the asset only removes the
  // database row and the file it pointed at just sits in the bucket
  // forever, orphaned.
  const { data: existing } = await supabase.from("assets").select("url").eq("id", assetId).maybeSingle();

  // No owner_id filter -- anyone with access to this asset's org can
  // delete it (RLS enforces that org check), not just whoever made it.
  const { error } = await supabase.from("assets").delete().eq("id", assetId);

  if (!error) {
    await deleteStorageObjectIfOwned(supabase, existing?.url ?? null);
  }

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
