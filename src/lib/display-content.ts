import { createServiceClient } from "@/lib/supabase/service";
import type { AssetKind, DisplayContent } from "@/lib/signage-types";

type PageRow = {
  id: string;
  name: string;
  items: { asset_id: string; duration_seconds: number }[];
  updated_at: string;
};

type ScreenRow = {
  name: string;
  branding_group: "ffa" | "district";
  screen_assignments: { page: PageRow | null } | { page: PageRow | null }[] | null;
};

type AssetRow = { id: string; kind: AssetKind; url: string; label: string | null };

type BroadcastRow = { active: boolean; message: string | null; activated_at: string | null };

// Shared by the public /display page (first paint) and its polling API
// route (everything after). `heartbeat: true` stamps screens.last_seen_at
// first -- the admin "online/offline" status is just whether this has run
// recently, so every real read of a screen's content doubles as a signal
// that it's alive, with no separate monitoring job.
export async function getDisplayContent(
  screenId: string,
  options: { heartbeat?: boolean } = {}
): Promise<DisplayContent | null> {
  const supabase = createServiceClient();

  if (options.heartbeat) {
    await supabase
      .from("screens")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", screenId);
  }

  const { data } = await supabase
    .from("screens")
    .select("name, branding_group, screen_assignments(page:pages(id, name, items, updated_at))")
    .eq("id", screenId)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as ScreenRow;

  // A district-wide emergency broadcast overrides every screen's normal
  // assignment -- check it before even looking at what's assigned.
  const { data: broadcastData } = await supabase
    .from("emergency_broadcast")
    .select("active, message, activated_at")
    .eq("id", 1)
    .maybeSingle();
  const broadcast = broadcastData as BroadcastRow | null;

  if (broadcast?.active) {
    return {
      screenName: row.name,
      brandingGroup: row.branding_group,
      pageName: "Emergency Broadcast",
      items: [],
      updatedAt: broadcast.activated_at,
      emergencyMessage: broadcast.message ?? "Emergency broadcast is active.",
    };
  }

  const assignment = Array.isArray(row.screen_assignments)
    ? row.screen_assignments[0]
    : row.screen_assignments;
  const page = assignment?.page ?? null;

  if (!page) {
    return {
      screenName: row.name,
      brandingGroup: row.branding_group,
      pageName: null,
      items: [],
      updatedAt: null,
      emergencyMessage: null,
    };
  }

  const assetIds = page.items.map((item) => item.asset_id);
  const { data: assetRows } = assetIds.length
    ? await supabase.from("assets").select("id, kind, url, label").in("id", assetIds)
    : { data: [] as AssetRow[] };

  const assetsById = new Map(((assetRows ?? []) as AssetRow[]).map((a) => [a.id, a]));

  const items = page.items
    .map((item) => {
      const asset = assetsById.get(item.asset_id);
      if (!asset) return null;
      return {
        id: asset.id,
        kind: asset.kind,
        url: asset.url,
        label: asset.label,
        duration_seconds: item.duration_seconds,
      };
    })
    .filter((x): x is DisplayContent["items"][number] => !!x);

  return {
    screenName: row.name,
    brandingGroup: row.branding_group,
    pageName: page.name,
    items,
    updatedAt: page.updated_at,
    emergencyMessage: null,
  };
}
