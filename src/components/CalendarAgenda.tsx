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

// Pixels per second while actively scrolling -- a fixed reading pace so a
// short list and a long list both feel the same speed, rather than one
// racing by and the other crawling.
const SCROLL_PX_PER_SEC = 55;
const HOLD_MS = 3000; // pause at the top (and again at the bottom) each pass

// Full-screen, wide-format agenda list. Loops continuously for as long as
// this item is on screen -- pause at the top, scroll through everything,
// pause at the bottom, then jump back to the top and do it again -- so it
// isn't tied to the item's own on-screen duration, and nothing ever gets
// permanently cut off just because this slide happened to be showing a
// different scroll position when it advanced away and back.
export function CalendarAgenda({
  events,
  accentColor,
}: {
  events: CalendarEvent[];
  accentColor: string;
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

    const scrollMs = Math.max(1000, (overflow / SCROLL_PX_PER_SEC) * 1000);
    const cycleMs = HOLD_MS + scrollMs + HOLD_MS;

    let raf = 0;
    let start: number | null = null;

    function step(ts: number) {
      if (start === null) start = ts;
      const elapsed = (ts - start) % cycleMs;

      if (elapsed < HOLD_MS) {
        setOffset(0);
      } else if (elapsed < HOLD_MS + scrollMs) {
        const progress = (elapsed - HOLD_MS) / scrollMs;
        setOffset(-overflow * progress);
      } else {
        setOffset(-overflow);
      }

      raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [events]);

  const groups = groupByDay(events);

  return (
    <div className="flex h-full w-full flex-col px-20 py-14 text-white">
      <div className="border-b border-white/15 pb-6">
        <h1 className="text-6xl font-bold">Upcoming Events</h1>
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
