"use client";

import { useState } from "react";
import { addItemToPage } from "./actions";
import type { Asset } from "@/lib/signage-types";

const KIND_ICON: Record<string, string> = { image: "🖼", video: "🎬", embed: "🌐", calendar_agenda: "📅" };

const FALLBACK_DURATION = 10;

export function AddItemForm({ pageId, assets }: { pageId: string; assets: Asset[] }) {
  const [assetId, setAssetId] = useState("");
  const [duration, setDuration] = useState(FALLBACK_DURATION);

  function handleAssetChange(id: string) {
    setAssetId(id);
    const asset = assets.find((a) => a.id === id);
    // Pre-fill from the asset's own default -- still just a starting point,
    // the field right below stays freely editable before adding.
    setDuration(asset?.default_duration_seconds ?? FALLBACK_DURATION);
  }

  return (
    <form action={addItemToPage} className="flex flex-col gap-2 p-3">
      <input type="hidden" name="page_id" value={pageId} />
      <select
        name="asset_id"
        required
        value={assetId}
        onChange={(e) => handleAssetChange(e.target.value)}
        className="rounded border border-gray-800 px-2 py-1 text-sm bg-[#0f1115] text-gray-200"
      >
        <option value="">Choose an asset…</option>
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {KIND_ICON[asset.kind] ?? ""} {asset.label ?? asset.url}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <input
          type="number"
          name="duration_seconds"
          value={duration}
          min={1}
          onChange={(e) => setDuration(Number(e.target.value) || 1)}
          className="w-20 rounded border border-gray-800 bg-[#0f1115] px-2 py-1 text-sm text-gray-200"
        />
        <span className="text-xs text-gray-400">seconds</span>
      </div>
      <button className="rounded border border-gray-700 px-2 py-1 text-xs font-medium hover:bg-gray-800">
        Add to playlist
      </button>
    </form>
  );
}
