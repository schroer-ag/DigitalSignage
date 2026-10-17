"use client";

import type { ReactNode } from "react";

// A form submit button that asks for a native confirm() first -- for
// actions impactful enough to want a second thought, like overriding
// every screen district-wide.
export function ConfirmSubmitButton({
  children,
  confirmText,
  className,
}: {
  children: ReactNode;
  confirmText: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmText)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
