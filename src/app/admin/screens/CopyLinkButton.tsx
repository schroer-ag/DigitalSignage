"use client";

import { useState } from "react";

// Grabs the kiosk URL for one screen so it can be pasted straight into
// Fully Kiosk Browser's start-URL setting while rolling out a stick.
export function CopyLinkButton({ screenId }: { screenId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = `${window.location.origin}/display/${screenId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be blocked (insecure context, permissions) --
      // fall back to a prompt so the link can still be selected by hand.
      window.prompt("Copy this screen's display link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded border border-gray-300 px-2 py-0.5 text-xs font-medium hover:bg-gray-50"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
