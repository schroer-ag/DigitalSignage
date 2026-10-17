"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPage(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .insert({ owner_id: user.id, name, items: [] })
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
  await supabase.from("pages").delete().eq("id", pageId).eq("owner_id", user.id);

  revalidatePath("/my/pages");
}
