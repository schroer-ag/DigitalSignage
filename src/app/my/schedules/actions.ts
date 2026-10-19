"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Clamp to the same -100..100 range as nothing in particular in the
// database -- just a sane bound so a typo doesn't produce an unreadable
// priority number. Schedules only compare priorities to each other, so the
// actual range never matters, only the relative order.
function clampPriority(raw: FormDataEntryValue | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-100, Math.min(100, Math.round(n)));
}

export async function createSchedule(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const org = String(formData.get("org") ?? "ffa");
  const screenId = String(formData.get("screen_id") ?? "");
  const pageId = String(formData.get("page_id") ?? "");
  const scheduleType = String(formData.get("schedule_type") ?? "");
  const priority = clampPriority(formData.get("priority"));

  if (!screenId || !pageId || (scheduleType !== "recurring" && scheduleType !== "date_range")) {
    redirect(`/my/schedules?org=${org}&error=${encodeURIComponent("Missing required fields")}`);
  }

  const payload: Record<string, unknown> = {
    screen_id: screenId,
    page_id: pageId,
    schedule_type: scheduleType,
    priority,
    created_by: user.id,
  };

  if (scheduleType === "recurring") {
    const days = formData
      .getAll("days_of_week")
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    payload.days_of_week = days;
    payload.start_time = String(formData.get("start_time") ?? "") || null;
    payload.end_time = String(formData.get("end_time") ?? "") || null;
    payload.starts_at = null;
    payload.ends_at = null;
  } else {
    const startsAtLocal = String(formData.get("starts_at") ?? "");
    const endsAtLocal = String(formData.get("ends_at") ?? "");
    payload.days_of_week = null;
    payload.start_time = null;
    payload.end_time = null;
    payload.starts_at = startsAtLocal ? new Date(startsAtLocal).toISOString() : null;
    payload.ends_at = endsAtLocal ? new Date(endsAtLocal).toISOString() : null;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("schedules").insert(payload);

  // Same reasoning as assets/pages: surface a failed insert (a bad time
  // range, RLS denial, whatever) instead of silently doing nothing.
  if (error) {
    redirect(`/my/schedules?org=${org}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/my/schedules");
}

export async function deleteSchedule(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const scheduleId = String(formData.get("schedule_id") ?? "");
  if (!scheduleId) return;

  const supabase = await createClient();
  await supabase.from("schedules").delete().eq("id", scheduleId);

  revalidatePath("/my/schedules");
}
