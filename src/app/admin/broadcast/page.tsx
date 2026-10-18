import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import { activateBroadcast, deactivateBroadcast } from "./actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

type BroadcastRow = {
  active: boolean;
  message: string | null;
  activated_at: string | null;
  activated_by: string | null;
};

export default async function BroadcastPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("emergency_broadcast")
    .select("active, message, activated_at, activated_by")
    .eq("id", 1)
    .maybeSingle();

  const broadcast = data as BroadcastRow | null;
  const active = broadcast?.active ?? false;

  let activatedByName: string | null = null;
  if (broadcast?.activated_by) {
    const { data: activator } = await supabase
      .from("users")
      .select("display_name, email")
      .eq("id", broadcast.activated_by)
      .maybeSingle();
    activatedByName = activator?.display_name ?? activator?.email ?? null;
  }

  return (
    <div>
      <h1 className="text-lg font-semibold">Emergency Broadcast</h1>
      <p className="text-sm text-gray-500">
        Replaces every screen&apos;s content immediately, district-wide, bypassing whatever each
        screen is normally assigned. Use for closures, lockdowns, or anything that needs to be on
        every screen right now.
      </p>

      {active ? (
        <div className="mt-6 rounded-lg border-2 border-red-600 bg-red-500/10 p-5">
          <div className="text-sm font-semibold uppercase tracking-wide text-red-300">
            Broadcast is live
          </div>
          <div className="mt-2 whitespace-pre-wrap text-base font-medium text-red-100">
            {broadcast?.message}
          </div>
          <div className="mt-3 text-xs text-red-400">
            Activated{activatedByName ? ` by ${activatedByName}` : ""}
            {broadcast?.activated_at
              ? ` at ${new Date(broadcast.activated_at).toLocaleString()}`
              : ""}
          </div>
          <form action={deactivateBroadcast} className="mt-4">
            <ConfirmSubmitButton
              confirmText="Turn off the emergency broadcast and return every screen to its normal assigned page?"
              className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Deactivate broadcast
            </ConfirmSubmitButton>
          </form>
        </div>
      ) : (
        <form
          action={activateBroadcast}
          className="mt-6 flex flex-col gap-3 rounded-lg border border-gray-800 p-5"
        >
          <label className="text-xs font-medium text-gray-500">
            Message to show on every screen
          </label>
          <textarea
            name="message"
            required
            rows={4}
            className="rounded border border-gray-800 px-2 py-1.5 text-sm"
            placeholder="e.g. School closed Friday due to weather. Check email for updates."
          />
          <div>
            <ConfirmSubmitButton
              confirmText="This replaces the content on every registered screen immediately. Continue?"
              className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Activate emergency broadcast
            </ConfirmSubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
