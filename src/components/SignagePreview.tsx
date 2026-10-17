"use client";

import { useEffect, useMemo, useState } from "react";
import type { Asset } from "@/lib/signage-types";

type PreviewItem = Asset & { duration_seconds: number };

export function SignagePreview({ items }: { items: PreviewItem[] }) {
  const [index, setIndex] = useState(0);

  // Clamp during render instead of resetting state in an effect -- the
  // list can shrink (an item removed) between renders, so the stored
  // index may briefly point past the end.
  const safeIndex = items.length === 0 ? 0 : index % items.length;
  const current = items[safeIndex] ?? null;

  useEffect(() => {
    if (items.length === 0) return;
    const durationMs = Math.max(1, items[safeIndex]?.duration_seconds ?? 10) * 1000;
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1) % items.length);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [safeIndex, items]);

  const label = useMemo(() => current?.label ?? current?.url ?? "", [current]);

  if (!current) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-md bg-gray-50 text-xs text-gray-400">
        Add items to preview the loop
      </div>
    );
  }

  return (
    <div>
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-black">
        {current.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={label} className="h-full w-full object-contain" />
        )}
        {current.kind === "video" && (
          <video src={current.url} className="h-full w-full object-contain" autoPlay muted loop playsInline />
        )}
        {current.kind === "embed" && (
          <iframe src={current.url} className="h-full w-full border-0" title={label} />
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span className="truncate">{label}</span>
        <span>
          {safeIndex + 1} / {items.length}
        </span>
      </div>
    </div>
  );
}
