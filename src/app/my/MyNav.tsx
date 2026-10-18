"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-actions";

const LINKS = [
  { href: "/my/pages", label: "My Pages" },
  { href: "/my/assets", label: "My Assets" },
];

export function MyNav({ displayName, isSuperAdmin }: { displayName: string; isSuperAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 border-r border-gray-800 p-4">
      <div className="text-sm font-semibold">Digital Signage</div>
      <div className="text-xs uppercase tracking-wide text-gray-400">My Workspace</div>
      <nav className="mt-6 flex flex-col gap-1">
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                active ? "bg-teal-500/10 text-teal-400" : "text-gray-500 hover:bg-gray-800"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        {isSuperAdmin && (
          <Link
            href="/admin/screens"
            className="mt-4 rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800"
          >
            ← Admin console
          </Link>
        )}
      </nav>
      <div className="mt-auto pt-6 text-xs text-gray-400">
        Signed in as
        <div className="font-medium text-gray-300">{displayName}</div>
        <form action={signOut} className="mt-2">
          <button className="text-xs font-medium text-gray-400 hover:text-red-400 hover:underline">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
