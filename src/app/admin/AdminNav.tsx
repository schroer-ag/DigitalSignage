"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/screens", label: "Screens" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/broadcast", label: "Broadcast" },
];

export function AdminNav({ displayName }: { displayName: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 border-r border-gray-200 p-4">
      <div className="text-sm font-semibold">Digital Signage</div>
      <div className="text-xs uppercase tracking-wide text-gray-400">Super Admin</div>
      <nav className="mt-6 flex flex-col gap-1">
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                active ? "bg-teal-50 text-teal-700" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/my/pages"
        className="mt-4 block rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-100"
      >
        My Workspace →
      </Link>
      <div className="mt-auto pt-6 text-xs text-gray-400">
        Signed in as
        <div className="font-medium text-gray-700">{displayName}</div>
      </div>
    </aside>
  );
}
