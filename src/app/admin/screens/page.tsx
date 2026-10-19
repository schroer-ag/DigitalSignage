import { createClient } from "@/lib/supabase/server";
import { registerScreen, assignUserToScreen } from "./actions";
import { CopyLinkButton } from "./CopyLinkButton";
import { BrandingBadge } from "@/components/BrandingBadge";
import { resolveActiveSchedule, type ScheduleTiming } from "@/lib/schedule-resolution";

const ONLINE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type ScreenRow = {
  id: string;
  name: string;
  building: string | null;
  branding_group: string;
  last_seen_at: string | null;
  screen_assignments: { page: { name: string } | null } | { page: { name: string } | null }[] | null;
};

type UserRow = { id: string; display_name: string | null; email: string };

type ScheduleRow = ScheduleTiming & { id: string; screen_id: string; page: { name: string } | null };

function currentPageName(row: ScreenRow): string | null {
  const assignment = Array.isArray(row.screen_assignments)
    ? row.screen_assignments[0]
    : row.screen_assignments;
  return assignment?.page?.name ?? null;
}

export default async function ScreensPage() {
  const supabase = await createClient();

  const [screensResult, usersResult, schedulesResult] = await Promise.all([
    supabase
      .from("screens")
      .select(
        "id, name, building, branding_group, last_seen_at, screen_assignments(page:pages(name))"
      )
      .order("name"),
    supabase.from("users").select("id, display_name, email").order("display_name"),
    supabase
      .from("schedules")
      .select(
        "id, screen_id, priority, schedule_type, days_of_week, start_time, end_time, starts_at, ends_at, created_at, page:pages(name)"
      ),
  ]);

  const screens = (screensResult.data ?? []) as unknown as ScreenRow[];
  const users = (usersResult.data ?? []) as unknown as UserRow[];

  // A schedule overriding the manual push should show here too, not just
  // on the Schedules page -- otherwise this list quietly lies about what's
  // actually on a screen whenever a schedule is live.
  const schedulesByScreen = new Map<string, ScheduleRow[]>();
  for (const row of (schedulesResult.data ?? []) as unknown as ScheduleRow[]) {
    const list = schedulesByScreen.get(row.screen_id) ?? [];
    list.push(row);
    schedulesByScreen.set(row.screen_id, list);
  }
  const scheduledPageByScreen = new Map<string, string>();
  for (const [screenId, rows] of schedulesByScreen) {
    const winner = resolveActiveSchedule(rows);
    if (winner?.page?.name) scheduledPageByScreen.set(screenId, winner.page.name);
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">Screens</h1>
          <p className="text-sm text-gray-500">
            Every registered display, who it belongs to, and what&apos;s live on it. Setting up a
            new stick? Register it below, then grab its link here for Fully Kiosk Browser&apos;s
            start URL.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-2">Screen</th>
              <th className="px-4 py-2">Branding</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Now playing</th>
              <th className="px-4 py-2">Display link</th>
              <th className="px-4 py-2">Assign</th>
            </tr>
          </thead>
          <tbody>
            {screens.map((screen) => {
              const scheduledName = scheduledPageByScreen.get(screen.id);
              const pageName = scheduledName ?? currentPageName(screen);
              const online = isOnline(screen.last_seen_at);

              return (
                <tr key={screen.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{screen.name}</div>
                    <div className="text-xs text-gray-400">{screen.building ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <BrandingBadge group={screen.branding_group} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={online ? "text-green-400" : "text-red-300"}>
                      {online ? "Online" : "Offline"}
                    </span>
                    <div className="text-xs text-gray-400">
                      {screen.last_seen_at ? `last seen ${timeAgo(screen.last_seen_at)}` : "never seen"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {pageName ?? "Nothing assigned"}
                    {scheduledName && (
                      <span className="ml-1.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                        scheduled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-gray-400">{screen.id.slice(0, 8)}…</code>
                      <CopyLinkButton screenId={screen.id} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <form action={assignUserToScreen} className="flex gap-2">
                      <input type="hidden" name="screen_id" value={screen.id} />
                      <select name="user_id" className="rounded border border-gray-800 text-xs bg-[#0f1115] text-gray-200" required>
                        <option value="">Choose a user…</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.display_name ?? u.email}
                          </option>
                        ))}
                      </select>
                      <button className="rounded border border-gray-700 px-2 text-xs font-medium hover:bg-gray-800">
                        Assign
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form action={registerScreen} className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-800 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Name</label>
          <input name="name" required className="rounded border border-gray-800 px-2 py-1 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Building</label>
          <input name="building" className="rounded border border-gray-800 px-2 py-1 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Branding</label>
          <select name="branding_group" className="rounded border border-gray-800 px-2 py-1 text-sm bg-[#0f1115] text-gray-200" defaultValue="district">
            <option value="ffa">FFA</option>
            <option value="district">District</option>
          </select>
        </div>
        <button className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          Register screen
        </button>
      </form>
    </div>
  );
}
