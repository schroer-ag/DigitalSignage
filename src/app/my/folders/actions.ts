"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, type CurrentUser } from "@/lib/current-user";
import { getUserOrgs } from "@/lib/require-role";
import { revalidatePath } from "next/cache";
import type { Org } from "@/lib/signage-types";

// Folders are shared between My Assets and My Pages (same org, same
// tree), so these actions live on their own rather than under either.

async function requireOrgMember(org: string): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const orgs = await getUserOrgs();
  if (!orgs.includes(org as Org)) return null;
  return user;
}

export async function createFolder(formData: FormData) {
  const org = String(formData.get("org") ?? "");
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  if (!org || !name) return;

  const user = await requireOrgMember(org);
  if (!user) return;

  const supabase = await createClient();
  await supabase.from("folders").insert({ org, parent_id: parentId, name });

  revalidatePath("/my/assets");
  revalidatePath("/my/pages");
}

export async function deleteFolder(formData: FormData) {
  const folderId = String(formData.get("folder_id") ?? "");
  const org = String(formData.get("org") ?? "");
  if (!folderId || !org) return;

  const user = await requireOrgMember(org);
  if (!user) return;

  const supabase = await createClient();

  // Only delete an empty folder -- no sub-folders, no assets or pages
  // still filed in it -- so nothing gets silently orphaned.
  const [{ count: subfolderCount }, { count: assetCount }, { count: pageCount }] = await Promise.all([
    supabase.from("folders").select("id", { count: "exact", head: true }).eq("parent_id", folderId),
    supabase.from("assets").select("id", { count: "exact", head: true }).eq("folder_id", folderId),
    supabase.from("pages").select("id", { count: "exact", head: true }).eq("folder_id", folderId),
  ]);

  if ((subfolderCount ?? 0) > 0 || (assetCount ?? 0) > 0 || (pageCount ?? 0) > 0) return;

  await supabase.from("folders").delete().eq("id", folderId);

  revalidatePath("/my/assets");
  revalidatePath("/my/pages");
}
