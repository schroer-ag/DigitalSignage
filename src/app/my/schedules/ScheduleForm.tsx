"use client";

import { useState } from "react";
import { createSchedule } from "./actions";

// Displayed Monday-first (more natural for a school week) but the values
// sent are 0=Sunday..6=Saturday, matching how the database and
// schedule-resolution.ts both index days_of_week.
const DAYS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const WEEKDAY_VALUES = [1, 2, 3, 4, 5];

const inputClass =
  "rounded border border-gray-700 bg-[#0f1115] px-2 py-1 text-sm text-gray-200";

export function ScheduleForm({
  org,
  screens,
  pages,
}: {
  org: string;
  screens: { id: string; name: string }[];
  pages: { id: string; name: string }[];
}) {
  const [scheduleType, setScheduleType] = useState<"recurring" | "date_range">("recurring");

  return (
    <form action={createSchedule} className="rounded-lg border border-gray-800 bg-[#171a21] p-4">
      <input type="hidden" name="org" value={org} />
      <div className="mb-3 text-sm font-semibold text-white">New schedule</div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Screen</label>
          <select name="screen_id" required className={inputClass}>
            <option value="">Choose a screen…</option>
            {screens.map((screen) => (
              <option key={screen.id} value={screen.id}>
                {screen.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Playlist</label>
          <select name="page_id" required className={inputClass}>
            <option value="">Choose a playlist…</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Priority</label>
          <input type="number" name="priority" defaultValue={0} className={`w-16 ${inputClass}`} />
        </div>
      </div>

      {screens.length === 0 && (
        <p className="mt-2 text-xs text-amber-500">
          You don&apos;t have any screens assigned yet — ask your super admin to assign one.
        </p>
      )}
      {pages.length === 0 && (
        <p className="mt-2 text-xs text-amber-500">
          No playlists in this org yet — create one on the Playlists page first.
        </p>
      )}

      <div className="mt-4 flex gap-4 text-sm">
        <label className={`flex items-center gap-1.5 ${scheduleType === "recurring" ? "text-gray-300" : "text-gray-500"}`}>
          <input
            type="radio"
            name="schedule_type"
            value="recurring"
            checked={scheduleType === "recurring"}
            onChange={() => setScheduleType("recurring")}
          />
          Recurring weekly
        </label>
        <label className={`flex items-center gap-1.5 ${scheduleType === "date_range" ? "text-gray-300" : "text-gray-500"}`}>
          <input
            type="radio"
            name="schedule_type"
            value="date_range"
            checked={scheduleType === "date_range"}
            onChange={() => setScheduleType("date_range")}
          />
          Date range
        </label>
      </div>

      {scheduleType === "recurring" ? (
        <div className="mt-3 rounded-md border border-gray-800 p-3">
          <div className="mb-2 text-xs font-medium text-gray-500">Days</div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-300">
            {DAYS.map((day) => (
              <label key={day.value} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  name="days_of_week"
                  value={day.value}
                  defaultChecked={WEEKDAY_VALUES.includes(day.value)}
                />
                {day.label}
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Start time</label>
              <input type="time" name="start_time" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">End time</label>
              <input type="time" name="end_time" required className={inputClass} />
            </div>
            <div className="pb-1.5 text-xs text-gray-500">(school&apos;s local time, Central)</div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-gray-800 p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Starts</label>
              <input type="datetime-local" name="starts_at" required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Ends</label>
              <input type="datetime-local" name="ends_at" required className={inputClass} />
            </div>
          </div>
        </div>
      )}

      <button className="mt-4 rounded bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-500">
        Add schedule
      </button>
    </form>
  );
}
