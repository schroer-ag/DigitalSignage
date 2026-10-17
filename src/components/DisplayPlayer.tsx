"use client";

import { useCallback, useEffect, useState } from "react";
import type { DisplayContent } from "@/lib/signage-types";
import { brandingFor } from "@/lib/branding";

// How often the display polls for new content. Every poll doubles as a
// heartbeat, so this also bounds how quickly the admin "online" status
// reacts -- comfortably under the 2-minute offline window in
// src/app/admin/screens/page.tsx.
const POLL_MS = 20_000;

// Video items play to completion (their 'ended' event) rather than on a
// fixed timer. This is the backstop in case a video never fires 'ended' or
// 'error' -- a bad stream shouldn't freeze the whole loop forever.
const VIDEO_FALLBACK_MS = 60_000;

function cacheKey(screenId: string) {
  return `signage:${screenId}`;
}

export function DisplayPlayer({
  screenId,
  initial,
}: {
  screenId: string;
  initial: DisplayContent;
}) {
  const [content, setContent] = useState<DisplayContent>(initial);
  const [index, setIndex] = useState(0);
  // A debug overlay doesn't need to react to anything after mount, so this
  // reads the query string once via a lazy initializer instead of an effect.
  const [debug] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug")
  );
  const [lastPollOk, setLastPollOk] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/screens/${screenId}/content`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const next: DisplayContent = await res.json();
        if (cancelled) return;

        setLastPollOk(new Date());
        setContent((prev) => {
          if (prev.updatedAt === next.updatedAt && prev.pageName === next.pageName) {
            return prev; // nothing changed -- don't restart the loop mid-item
          }
          setIndex(0);
          return next;
        });

        try {
          localStorage.setItem(cacheKey(screenId), JSON.stringify(next));
        } catch {
          // Best-effort diagnostic cache only -- never required for the
          // loop itself to keep running.
        }
      } catch {
        // A dropped poll (Wi-Fi hiccup, server blip) just means we keep
        // showing whatever is already on screen. Never blank out or show
        // an error on a kiosk display over a transient network issue.
      }
    }

    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [screenId]);

  const brand = brandingFor(content.brandingGroup);
  const items = content.items;
  const safeIndex = items.length === 0 ? 0 : index % items.length;
  const current = items[safeIndex] ?? null;

  const advance = useCallback(() => {
    setIndex((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
  }, [items.length]);

  useEffect(() => {
    if (!current) return;
    const ms =
      current.kind === "video" ? VIDEO_FALLBACK_MS : Math.max(1, current.duration_seconds) * 1000;
    const timer = setTimeout(advance, ms);
    return () => clearTimeout(timer);
  }, [current, advance]);

  if (content.emergencyMessage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-red-700 p-12">
        <div className="max-w-4xl text-center">
          <div className="text-sm font-semibold uppercase tracking-widest text-red-100">
            Emergency Broadcast
          </div>
          <div className="mt-4 whitespace-pre-wrap text-4xl font-semibold leading-tight text-white">
            {content.emergencyMessage}
          </div>
        </div>
        {debug && (
          <div className="absolute bottom-2 right-2 rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-red-100">
            screen {screenId.slice(0, 8)} · last poll{" "}
            {lastPollOk ? lastPollOk.toLocaleTimeString() : "none yet"}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: brand.background }}
    >
      {!current && (
        <div className="text-center">
          <div className="text-lg font-medium" style={{ color: brand.accent }}>
            {content.screenName}
          </div>
          <div className="mt-1 text-sm text-gray-400">Nothing assigned to this screen yet</div>
        </div>
      )}
      {current?.kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current.url} alt={current.label ?? ""} className="h-full w-full object-contain" />
      )}
      {current?.kind === "video" && (
        <video
          key={current.id}
          src={current.url}
          className="h-full w-full object-contain"
          autoPlay
          muted
          playsInline
          onEnded={advance}
          onError={advance}
        />
      )}
      {current?.kind === "embed" && (
        <iframe src={current.url} title={current.label ?? ""} className="h-full w-full border-0" />
      )}
      {debug && (
        <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 font-mono text-[10px] text-green-400">
          screen {screenId.slice(0, 8)} · {content.pageName ?? "no page"} · item{" "}
          {items.length ? safeIndex + 1 : 0}/{items.length} · last poll{" "}
          {lastPollOk ? lastPollOk.toLocaleTimeString() : "none yet"}
        </div>
      )}
    </div>
  );
}
