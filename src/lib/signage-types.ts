export type AssetKind = "image" | "video" | "embed" | "calendar_agenda";

// Top-level org a piece of content is filed under -- drives the FFA /
// District folder split and shared visibility in My Assets, My Pages,
// and Screens.
export type Org = "ffa" | "district";

export type Folder = {
  id: string;
  org: Org;
  parent_id: string | null;
  name: string;
};

export type Asset = {
  id: string;
  kind: AssetKind;
  url: string;
  label: string | null;
  org: Org;
  folder_id: string | null;
  // Only meaningful for kind "calendar_agenda" -- how many days ahead of
  // today it pulls events for. Unused (but still present, default 30)
  // on every other kind.
  days_ahead: number;
};

export type PageItem = {
  asset_id: string;
  duration_seconds: number;
};

// One upcoming event pulled from a public Google Calendar feed, trimmed
// to what the display actually needs to show.
export type CalendarEvent = {
  id: string;
  title: string;
  location: string | null;
  start: string; // ISO timestamp (or date-only, YYYY-MM-DD, for all-day events)
  allDay: boolean;
};

export type DisplayItem = {
  id: string;
  kind: AssetKind;
  url: string;
  label: string | null;
  duration_seconds: number;
  // Only present for kind "calendar_agenda" -- fetched and resolved
  // server-side so the kiosk never talks to Google directly.
  calendarEvents?: CalendarEvent[];
};

export type DisplayContent = {
  screenName: string;
  brandingGroup: "ffa" | "district";
  pageName: string | null;
  items: DisplayItem[];
  // ISO timestamp of the assigned page's last edit -- the display player
  // compares this across polls to tell "nothing changed" from "a new page
  // just got pushed" without caring about the page's id or name alone.
  updatedAt: string | null;
  // Set only while the district-wide emergency broadcast is active. When
  // present, the display player shows this instead of the normal item
  // loop, regardless of what's assigned to the screen.
  emergencyMessage: string | null;
};
