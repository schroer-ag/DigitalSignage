"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { revalidatePath } from "next/cache";
import type { PageItem } from "@/lib/signage-types";

async function loadOwnedPage(pageId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("id, items")
    .eq("id", pageId)
    .eq("owner_id", userId)
    .maybeSingle();
  return { supabase, page: data as { id: string; items: PageItem[] } | null };
}

export async function renamePage(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const pageId = String(formData.get("page_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!pageId || !name) return;

  const supabase = await createClient();
  await supabase.from("pages").update({ name }).eq("id", pageId).eq("owner_id", user.id);

  revalidatePath(`/my/pages/${pageId}`);
  revalidatePath("/my/pages");
}

export async function addItemToPage(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const pageId = String(formData.get("page_id") ?? "");
  const assetId = String(formData.get("asset_id") ?? "");
  const durationSeconds = Number(formData.get("duration_seconds") ?? 10);
  if (!pageId || !assetId) return;

  const { supabase, page } = await loadOwnedPage(pageId, user.id);
  if (!page) return;

  const items = [...(page.items ?? []), { asset_id: assetId, duration_seconds: Math.max(1, durationSeconds) }];

  await supabase
    .from("pages")
    .update({ items, updated_at: new Date().toISOString() })
    .eq("id", pageId)
    .eq("owner_id", user.id);

  revalidatePath(`/my/pages/${pageId}`);
}

export async function removeItemFromPage(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const pageId = String(formData.get("page_id") ?? "");
  const index = Number(formData.get("index") ?? -1);
  if (!pageId || index < 0) return;

  const { supabase, page } = await loadOwnedPage(pageId, user.id);
  if (!page) return;

  const items = (page.items ?? []).filter((_, i) => i !== index);

  await supabase
    .from("pages")
    .update({ items, updated_at: new Date().toISOString() })
    .eq("id", pageId)
    .eq("owner_id", user.id);

  revalidatePath(`/my/pages/${pageId}`);
}

export async function moveItem(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const pageId = String(formData.get("page_id") ?? "");
  const index = Number(formData.get("index") ?? -1);
  const direction = String(formData.get("direction") ?? "");
  if (!pageId || index < 0) return;

  const { supabase, page } = await loadOwnedPage(pageId, user.id);
  if (!page) return;

  const items = [...(page.items ?? [])];
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return;

  [items[index], items[target]] = [items[target], items[index]];

  await supabase
    .from("pages")
    .update({ items, updated_at: new Date().toISOString() })
    .eq("id", pageId)
    .eq("owner_id", user.id);

  revalidatePath(`/my/pages/${pageId}`);
}

export async function pushPageToScreen(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const pageId = String(formData.get("page_id") ?? "");
  const screenId = String(formData.get("screen_id") ?? "");
  if (!pageId || !screenId) return;

  const supabase = await createClient();

  // Confirm the page belongs to this user and the screen is one they're
  // allowed to push to, before touching screen_assignments.
  const [{ data: page }, { data: access }] = await Promise.all([
    supabase.from("pages").select("id").eq("id", pageId).eq("owner_id", user.id).maybeSingle(),
    supabase
      .from("user_screen_access")
      .select("screen_id")
      .eq("user_id", user.id)
      .eq("screen_id", screenId)
      .maybeSingle(),
  ]);

  if (!page || !access) return;

  await supabase.from("screen_assignments").upsert(
    {
      screen_id: screenId,
      page_id: pageId,
      assigned_by: user.id,
      pushed_at: new Date().toISOString(),
    },
    { onConflict: "screen_id" }
  );

  revalidatePath(`/my/pages/${pageId}`);
}
