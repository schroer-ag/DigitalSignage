export type AssetKind = "image" | "video" | "embed";

export type Asset = {
  id: string;
  kind: AssetKind;
  url: string;
  label: string | null;
};

export type PageItem = {
  asset_id: string;
  duration_seconds: number;
};

export type DisplayItem = {
  id: string;
  kind: AssetKind;
  url: string;
  label: string | null;
  duration_seconds: number;
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
