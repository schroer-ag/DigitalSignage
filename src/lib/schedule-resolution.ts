// Decides which schedule is "live" right now for a screen. Used by both the
// kiosk content API (src/lib/display-content.ts) and the Schedules page
// itself (for the "Live now" badge) -- one place for this logic so the two
// never quietly disagree about what's actually airing.

// The district has one physical location, so one hardcoded timezone is
// enough -- there's no per-screen or per-user timezone to account for.
const SCHOOL_TIMEZONE = "America/Chicago";

export type ScheduleTiming = {
  schedule_type: "recurring" | "date_range";
  priority: number;
  days_of_week: number[] | null;
  start_time: string | null; // "HH:MM" or "HH:MM:SS"
  end_time: string | null;
  starts_at: string | null; // ISO timestamp
  ends_at: string | null;
  created_at: string;
};

function centralParts(date: Date): { weekday: number; minutesSinceMidnight: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: SCHOOL_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  // Some engines report midnight as hour "24" even with hour12:false --
  // normalize so minutesSinceMidnight never overflows a day.
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return { weekday: weekdayMap[get("weekday")] ?? 0, minutesSinceMidnight: hour * 60 + minute };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function isScheduleActiveAt(schedule: ScheduleTiming, now: Date): boolean {
  if (schedule.schedule_type === "date_range") {
    if (!schedule.starts_at || !schedule.ends_at) return false;
    const ts = now.getTime();
    return ts >= new Date(schedule.starts_at).getTime() && ts <= new Date(schedule.ends_at).getTime();
  }

  if (!schedule.days_of_week?.length || !schedule.start_time || !schedule.end_time) return false;
  const { weekday, minutesSinceMidnight } = centralParts(now);
  if (!schedule.days_of_week.includes(weekday)) return false;
  const start = timeToMinutes(schedule.start_time);
  const end = timeToMinutes(schedule.end_time);
  return minutesSinceMidnight >= start && minutesSinceMidnight <= end;
}

// Of whichever schedules are active right now, the highest priority wins;
// ties go to whichever was created more recently. Returns null when nothing
// matches -- the caller falls back to whatever's manually pushed.
export function resolveActiveSchedule<T extends ScheduleTiming>(
  schedules: T[],
  now: Date = new Date()
): T | null {
  const active = schedules.filter((s) => isScheduleActiveAt(s, now));
  if (active.length === 0) return null;
  active.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return active[0];
}
