import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { getUserOrgs } from "@/lib/require-role";
import { redirect } from "next/navigation";
import { brandingFor } from "@/lib/branding";
import { resolveActiveSchedule } from "@/lib/schedule-resolution";
import { deleteSchedule } from "./actions";
import { ScheduleForm } from "./ScheduleForm";
import type { Org } from "@/lib/signage-types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDays(days: number[] | null): string {
  if (!days || days.length === 0) return "—";
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 5 && [1, 2, 3, 4, 5].every((d, i) => sorted[i] === d)) return "Mon–Fri";
  if (sorted.length === 7) return "Every day";
  if (sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6) return "Sat–Sun";
  return sorted.map((d) => DAY_LABELS[d]).join(", ");
}

function formatTime(t: string | null): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDateRange(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt || !endsAt) return "—";
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${fmt.format(new Date(startsAt))} – ${fmt.format(new Date(endsAt))}`;
}

function scheduleSummary(s: ScheduleRow): string {
  if (s.schedule_type === "recurring") {
    return `${formatDays(s.days_of_week)}, ${formatTime(s.start_time)}–${formatTime(s.end_time)}`;
  }
  return formatDateRange(s.starts_at, s.ends_at);
}

type ScreenOption = { id: string; name: string };
type PageOption = { id: string; name: string };

type ScheduleRow = {
  id: string;
  screen_id: string;
  page_id: string;
  schedule_type: "recurring" | "date_range";
  priority: number;
  days_of_week: number[] | null;
  start_time: string | null;
  end_time: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  screen: { id: string; name: string } | null;
  page: { id: string; name: string; org: string } | null;
};

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { org: orgParam, error: errorParam } = await searchParams;
  const orgs = await getUserOrgs();

  if (orgs.length === 0) {
    return (
      <div>
        <h1 className="text-lg font-semibold">Schedules</h1>
        <p className="mt-3 max-w-md rounded-md bg-amber-500/10 p-4 text-sm text-amber-300">
          You don&apos;t have access to FFA or District content yet. Ask your super admin to
          grant you access on the Users page.
        </p>
      </div>
    );
  }

  const org: Org = orgParam === "ffa" || orgParam === "district" ? (orgParam as Org) : orgs[0];

  const supabase = await createClient();

  const [{ data: screenRows }, { data: pageRows }, { data: scheduleRows }] = await Promise.all([
    supabase.from("user_screen_access").select("screen:screens(id, name)").eq("user_id", user.id),
    supabase.from("pages").select("id, name").eq("org", org).order("name"),
    supabase
      .from("schedules")
      .select(
        "id, screen_id, page_id, schedule_type, priority, days_of_week, start_time, end_time, starts_at, ends_at, created_at, screen:screens(id, name), page:pages(id, name, org)"
      )
      .order("created_at", { ascending: false }),
  ]);

  const screens = ((screenRows ?? []) as unknown as { screen: ScreenOption | null }[])
    .map((r) => r.screen)
    .filter((s): s is ScreenOption => !!s);
  const pages = (pageRows ?? []) as PageOption[];

  // Schedules RLS already limits this to orgs the user can see -- narrow it
  // further to the org tab that's open right now.
  const allSchedules = ((scheduleRows ?? []) as unknown as ScheduleRow[]).filter(
    (s) => s.page?.org === org
  );

  // Per screen, figure out which schedule is actually winning right now --
  // the same resolution the kiosk itself uses, so "Live now" here always
  // matches what's really on the screen.
  const byScreen = new Map<string, ScheduleRow[]>();
  for (const s of allSchedules) {
    const list = byScreen.get(s.screen_id) ?? [];
    list.push(s);
    byScreen.set(s.screen_id, list);
  }
  const liveScheduleIds = new Set<string>();
  for (const list of byScreen.values()) {
    const winner = resolveActiveSchedule(list);
    if (winner) liveScheduleIds.add(winner.id);
  }

  const screenNames = new Map<string, string>();
  for (const s of allSchedules) {
    if (s.screen) screenNames.set(s.screen_id, s.screen.name);
  }

  return (
    <div>
      <h1 className="text-lg font-semibold">Schedules</h1>
      <p className="text-sm text-gray-500">
        Set up timed rules for which playlist shows on a screen and when. A screen with no
        matching schedule right now just keeps showing whatever was manually pushed to it.
      </p>

      {errorParam && (
        <p className="mt-3 rounded-md bg-red-500/10 p-3 text-sm text-red-300">
          Couldn&apos;t save: {errorParam}
        </p>
      )}

      <div className="mt-4 flex border-b border-gray-800 text-sm font-medium">
        {orgs.map((o) => (
          <a
            key={o}
            href={`/my/schedules?org=${o}`}
            className={`px-4 py-2 ${o === org ? "border-b-2 font-medium" : "text-gray-400 hover:text-gray-200"}`}
            style={o === org ? { borderColor: brandingFor(o).accent, color: brandingFor(o).accent } : undefined}
          >
            {o === "ffa" ? "FFA" : "District"}
          </a>
        ))}
      </div>

      <div className="mt-4">
        <ScheduleForm org={org} screens={screens} pages={pages} />
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {byScreen.size === 0 && (
          <p className="text-sm text-gray-500">No schedules yet for {org === "ffa" ? "FFA" : "District"}.</p>
        )}
        {[...byScreen.entries()].map(([screenId, schedules]) => (
          <div key={screenId}>
            <div className="mb-2 text-sm font-semibold text-white">
              {screenNames.get(screenId) ?? "Unknown screen"}
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800 bg-[#171a21] text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Playlist</th>
                    <th className="px-4 py-2">When</th>
                    <th className="px-4 py-2">Priority</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id} className="border-b border-gray-800 bg-[#121419] last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-100">{s.page?.name ?? "Missing playlist"}</td>
                      <td className="px-4 py-3 text-gray-400">{scheduleSummary(s)}</td>
                      <td className="px-4 py-3 text-gray-400">{s.priority}</td>
                      <td className="px-4 py-3">
                        {liveScheduleIds.has(s.id) ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            ● Live now
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Not active now</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={deleteSchedule}>
                          <input type="hidden" name="schedule_id" value={s.id} />
                          <button className="text-xs font-medium text-red-400 hover:underline">Delete</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
