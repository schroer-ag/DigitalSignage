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
