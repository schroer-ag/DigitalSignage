import type { CalendarEvent } from "@/lib/signage-types";

// Pulls events from a PUBLIC Google Calendar's .ics feed (no OAuth/API key
// needed -- the calendar just has to be shared "Make available to public"
// in its settings). We hand-parse the ICS text ourselves rather than
// pulling in a dependency: the subset of RFC 5545 a school calendar
// actually uses (plain events, occasional weekly/monthly recurrence) is
// small enough to cover directly.

type RawEvent = {
  uid: string;
  summary: string;
  location: string | null;
  start: DateValue;
  end: DateValue | null;
  rrule: Record<string, string> | null;
};

type DateValue = { date: Date; allDay: boolean };

// --- very small timezone table -----------------------------------------
// Good enough for US school calendars; anything outside this list (or a
// floating/UTC time) is treated as UTC, which is the one case we can't
// get wrong in a way that silently shows nothing.
const US_STANDARD_OFFSET: Record<string, number> = {
  "America/New_York": -5,
  "America/Chicago": -6,
  "America/Denver": -7,
  "America/Los_Angeles": -8,
  "America/Phoenix": -7, // no DST
};

function isUsDst(d: Date): boolean {
  // Second Sunday in March through first Sunday in November, which is
  // close enough for a digital signage schedule (we're not scheduling
  // court dates).
  const year = d.getUTCFullYear();
  const marchSecondSunday = nthSunday(year, 2, 2);
  const novemberFirstSunday = nthSunday(year, 10, 1);
  return d.getTime() >= marchSecondSunday.getTime() && d.getTime() < novemberFirstSunday.getTime();
}

function nthSunday(year: number, monthIndex: number, n: number): Date {
  const first = new Date(Date.UTC(year, monthIndex, 1, 7)); // 7am UTC buffer
  const firstSundayDate = 1 + ((7 - first.getUTCDay()) % 7);
  return new Date(Date.UTC(year, monthIndex, firstSundayDate + (n - 1) * 7, 7));
}

function tzOffsetHours(tzid: string, atUtc: Date): number {
  const standard = US_STANDARD_OFFSET[tzid];
  if (standard === undefined) return 0;
  if (tzid === "America/Phoenix") return standard;
  return isUsDst(atUtc) ? standard + 1 : standard;
}

// --- ICS line/value parsing ---------------------------------------------

function unfold(text: string): string[] {
  const rawLines = text.split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseProp(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return null;
  const head = line.slice(0, colonIndex);
  const value = line.slice(colonIndex + 1);
  const [name, ...paramParts] = head.split(";");
  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const [k, v] = part.split("=");
    if (k && v) params[k.toUpperCase()] = v;
  }
  return { name: name.toUpperCase(), params, value };
}

function parseDate(value: string, params: Record<string, string>): DateValue {
  if (params.VALUE === "DATE" || /^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    return { date: new Date(Date.UTC(year, month, day)), allDay: true };
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!match) return { date: new Date(value), allDay: false };

  const [, y, mo, d, h, mi, s, z] = match;
  const naiveUtc = new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
  );

  if (z || !params.TZID) {
    return { date: naiveUtc, allDay: false };
  }

  const offset = tzOffsetHours(params.TZID, naiveUtc);
  return { date: new Date(naiveUtc.getTime() - offset * 3_600_000), allDay: false };
}

function parseIcs(text: string): RawEvent[] {
  const lines = unfold(text);
  const events: RawEvent[] = [];
  let current: Partial<RawEvent> & { rruleRaw?: string } | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.start && current.summary) {
        events.push({
          uid: current.uid ?? `${current.summary}-${current.start.date.toISOString()}`,
          summary: current.summary,
          location: current.location ?? null,
          start: current.start,
          end: current.end ?? null,
          rrule: current.rruleRaw ? parseRrule(current.rruleRaw) : null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const prop = parseProp(line);
    if (!prop) continue;

    switch (prop.name) {
      case "UID":
        current.uid = prop.value;
        break;
      case "SUMMARY":
        current.summary = prop.value.replace(/\\,/g, ",").replace(/\\n/gi, " ");
        break;
      case "LOCATION":
        current.location = prop.value.replace(/\\,/g, ",").replace(/\\n/gi, " ") || null;
        break;
      case "DTSTART":
        current.start = parseDate(prop.value, prop.params);
        break;
      case "DTEND":
        current.end = parseDate(prop.value, prop.params);
        break;
      case "RRULE":
        current.rruleRaw = prop.value;
        break;
      default:
        break;
    }
  }

  return events;
}

function parseRrule(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const [k, v] = part.split("=");
    if (k && v) out[k.toUpperCase()] = v;
  }
  return out;
}

// --- recurrence expansion -------------------------------------------
// Covers FREQ=DAILY/WEEKLY/MONTHLY with INTERVAL, COUNT, UNTIL, and
// BYDAY (weekly only). That's the realistic range for a school calendar
// -- a recurring chapter meeting or a monthly board meeting. Anything
// fancier (BYMONTHDAY, YEARLY, BYSETPOS...) just won't repeat past its
// first occurrence, which is a safe way to fail: it under-shows rather
// than showing something wrong.
const BYDAY_INDEX: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function expandOccurrences(event: RawEvent, rangeStart: Date, rangeEnd: Date): Date[] {
  if (!event.rrule) {
    return event.start.date >= rangeStart && event.start.date <= rangeEnd ? [event.start.date] : [];
  }

  const freq = event.rrule.FREQ;
  const interval = Math.max(1, Number(event.rrule.INTERVAL ?? "1"));
  const count = event.rrule.COUNT ? Number(event.rrule.COUNT) : null;
  const until = event.rrule.UNTIL ? parseDate(event.rrule.UNTIL, {}).date : null;
  const byDay = event.rrule.BYDAY?.split(",").map((d) => d.trim().slice(-2)) ?? null;

  const occurrences: Date[] = [];
  let cursor = new Date(event.start.date);
  let produced = 0;
  const maxIterations = 500; // safety valve, well beyond anything a 30-day window needs

  for (let i = 0; i < maxIterations; i++) {
    if (count !== null && produced >= count) break;
    if (until && cursor > until) break;
    if (cursor > rangeEnd) break;

    const matchesByDay = freq === "WEEKLY" && byDay ? byDay.includes(dayCode(cursor)) : true;

    if (matchesByDay) {
      produced++;
      if (cursor >= rangeStart && cursor <= rangeEnd) occurrences.push(new Date(cursor));
    }

    if (freq === "DAILY") {
      cursor = addDays(cursor, interval);
    } else if (freq === "WEEKLY") {
      cursor = addDays(cursor, byDay ? 1 : 7 * interval);
    } else if (freq === "MONTHLY") {
      cursor = addMonths(cursor, interval);
    } else {
      break; // unsupported FREQ -- stop rather than loop forever
    }
  }

  return occurrences;
}

function dayCode(d: Date): string {
  return Object.keys(BYDAY_INDEX).find((k) => BYDAY_INDEX[k] === d.getUTCDay()) ?? "SU";
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function addMonths(d: Date, months: number): Date {
  const copy = new Date(d);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

// --- public API -----------------------------------------------------

function icsUrlFor(calendarId: string): string {
  // Accepts either a bare calendar id/email or a full ICS URL someone
  // pasted directly -- either way we end up with the public feed URL.
  if (calendarId.startsWith("http")) return calendarId;
  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
}

type CacheEntry = { fetchedAt: number; raw: RawEvent[] };
const CACHE_TTL_MS = 10 * 60 * 1000;
// Module-level cache: survives across requests on a warm serverless
// instance, so screens polling every 20s don't each trigger a fresh
// fetch to Google. Resets on cold start -- that's fine, it just means
// an occasional extra fetch, never stale-forever data.
const cache = new Map<string, CacheEntry>();

async function getRawEvents(calendarId: string): Promise<RawEvent[]> {
  const cached = cache.get(calendarId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.raw;
  }

  const res = await fetch(icsUrlFor(calendarId), { cache: "no-store" });
  if (!res.ok) throw new Error(`Calendar feed returned ${res.status}`);
  const text = await res.text();
  const raw = parseIcs(text);
  cache.set(calendarId, { fetchedAt: Date.now(), raw });
  return raw;
}

// Returns events starting from now through `days` days out, expanded,
// sorted, and trimmed to a sane count for a slide. Never throws past
// this point -- a broken/unreachable calendar just means an empty list,
// so one bad feed can't take down a whole screen's rotation.
export async function getUpcomingEvents(calendarId: string, days = 30): Promise<CalendarEvent[]> {
  try {
    const raw = await getRawEvents(calendarId);
    const rangeStart = new Date();
    const rangeEnd = new Date(rangeStart.getTime() + days * 86_400_000);

    const expanded: { event: RawEvent; occursAt: Date }[] = [];
    for (const event of raw) {
      for (const occursAt of expandOccurrences(event, rangeStart, rangeEnd)) {
        expanded.push({ event, occursAt });
      }
    }

    expanded.sort((a, b) => a.occursAt.getTime() - b.occursAt.getTime());

    return expanded.slice(0, 40).map(({ event, occursAt }) => ({
      id: `${event.uid}-${occursAt.toISOString()}`,
      title: event.summary,
      location: event.location,
      start: event.start.allDay ? occursAt.toISOString().slice(0, 10) : occursAt.toISOString(),
      allDay: event.start.allDay,
    }));
  } catch {
    return [];
  }
}
