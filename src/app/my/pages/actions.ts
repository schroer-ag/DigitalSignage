"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPage(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  const org = String(formData.get("org") ?? "ffa");
  const folderId = String(formData.get("folder_id") ?? "").trim() || null;
  if (!name) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .insert({ owner_id: user.id, name, org, folder_id: folderId, items: [] })
    .select("id")
    .single();

  revalidatePath("/my/pages");
  if (data?.id) redirect(`/my/pages/${data.id}`);
}

export async function deletePage(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const pageId = String(formData.get("page_id") ?? "");
  if (!pageId) return;

  const supabase = await createClient();
  // No owner_id filter -- anyone with access to this page's org can
  // delete it (RLS enforces that org check), not just whoever made it.
  await supabase.from("pages").delete().eq("id", pageId);

  revalidatePath("/my/pages");
}

export async function movePage(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const pageId = String(formData.get("page_id") ?? "");
  const folderId = String(formData.get("folder_id") ?? "").trim() || null;
  if (!pageId) return;

  const supabase = await createClient();
  await supabase.from("pages").update({ folder_id: folderId }).eq("id", pageId);

  revalidatePath("/my/pages");
}
