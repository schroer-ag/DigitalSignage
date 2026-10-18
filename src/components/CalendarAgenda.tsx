"use client";

import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/lib/signage-types";

function dayHeading(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function eventTime(event: CalendarEvent): string {
  if (event.allDay) return "All day";
  return new Date(event.start).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupByDay(events: CalendarEvent[]): { key: string; heading: string; events: CalendarEvent[] }[] {
  const groups: { key: string; heading: string; events: CalendarEvent[] }[] = [];
  for (const event of events) {
    const key = event.start.slice(0, 10);
    const existing = groups.find((g) => g.key === key);
    if (existing) {
      existing.events.push(event);
    } else {
      groups.push({ key, heading: dayHeading(event.start), events: [event] });
    }
  }
  return groups;
}

// Full-screen, wide-format agenda list. Fills the whole kiosk frame
// (no centered card -- this is meant to be the entire slide) and, when
// there's more content than fits, scrolls smoothly through everything
// during the item's on-screen duration: a short pause at the top, a
// slow scroll through the middle, then a pause at the bottom, so
// whoever's watching sees the first and last events too, not just
// whatever didn't get cut off.
export function CalendarAgenda({
  events,
  durationSeconds,
  accentColor,
  accentTextColor,
}: {
  events: CalendarEvent[];
  durationSeconds: number;
  accentColor: string;
  accentTextColor: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const overflow = track.scrollHeight - viewport.clientHeight;
    if (overflow <= 0) {
      setOffset(0);
      return;
    }

    const totalMs = Math.max(1, durationSeconds) * 1000;
    const holdMs = Math.min(4000, totalMs * 0.2);
    const scrollMs = Math.max(1000, totalMs - holdMs * 2);

    let raf = 0;
    let start: number | null = null;

    function step(ts: number) {
      if (start === null) start = ts;
      const elapsed = ts - start;

      if (elapsed < holdMs) {
        setOffset(0);
      } else if (elapsed < holdMs + scrollMs) {
        const progress = (elapsed - holdMs) / scrollMs;
        setOffset(-overflow * progress);
      } else {
        setOffset(-overflow);
      }

      if (elapsed < holdMs + scrollMs + holdMs) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [events, durationSeconds]);

  const groups = groupByDay(events);

  return (
    <div className="flex h-full w-full flex-col px-20 py-14 text-white">
      <div className="flex items-center justify-between border-b border-white/15 pb-6">
        <h1 className="text-6xl font-bold">Upcoming Events</h1>
        <span
          className="rounded-full px-6 py-2 text-2xl font-semibold"
          style={{ backgroundColor: accentColor, color: accentTextColor }}
        >
          Next 30 days
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-3xl text-white/60">No events in the next 30 days.</p>
        </div>
      ) : (
        <div ref={viewportRef} className="mt-8 flex-1 overflow-hidden">
          <div ref={trackRef} style={{ transform: `translateY(${offset}px)` }}>
            {groups.map((group) => (
              <div key={group.key} className="mb-8">
                <div className="text-2xl font-semibold uppercase tracking-wide" style={{ color: accentColor }}>
                  {group.heading}
                </div>
                <div className="mt-3 space-y-3">
                  {group.events.map((event) => (
                    <div key={event.id} className="flex items-baseline gap-6 rounded-xl bg-white/5 px-6 py-4">
                      <span className="w-40 shrink-0 text-3xl font-medium text-white/80">
                        {eventTime(event)}
                      </span>
                      <div>
                        <div className="text-3xl font-semibold">{event.title}</div>
                        {event.location && (
                          <div className="mt-1 text-xl text-white/60">{event.location}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
