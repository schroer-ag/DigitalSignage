import Link from "next/link";
import { brandingFor } from "@/lib/branding";
import type { Folder, Org } from "@/lib/signage-types";

// Shared by My Assets and My Pages -- same org, same folder tree, just a
// different basePath. Server-rendered as plain links (?folder=<id> in the
// URL) rather than client-side expand/collapse state, so it works exactly
// like the rest of the app: no JS needed to browse it.
//
// The selected-row highlight uses this org's own accent color (gold for
// FFA, light blue for District) rather than a hardcoded hex, and as an
// inline style rather than a Tailwind arbitrary-value class -- the color
// depends on `org`, a runtime value, so a class string built from it
// wouldn't exist in the build's scanned source and Tailwind would never
// generate CSS for it.
export function FolderTree({
  folders,
  org,
  selectedFolderId,
  basePath,
}: {
  folders: Folder[];
  org: Org;
  selectedFolderId: string | null;
  basePath: string;
}) {
  const accent = brandingFor(org).accent;

  const children = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    const key = folder.parent_id;
    children.set(key, [...(children.get(key) ?? []), folder]);
  }

  function renderLevel(parentId: string | null, depth: number) {
    const level = children.get(parentId) ?? [];
    return level.map((folder) => {
      const selected = selectedFolderId === folder.id;
      return (
        <div key={folder.id} style={{ marginLeft: depth * 14 }}>
          <Link
            href={`${basePath}?org=${org}&folder=${folder.id}`}
            className={`block truncate rounded px-2 py-1 text-sm ${
              selected ? "font-medium" : "text-gray-400 hover:bg-gray-800"
            }`}
            style={selected ? { backgroundColor: `${accent}26`, color: accent } : undefined}
          >
            📁 {folder.name}
          </Link>
          {renderLevel(folder.id, depth + 1)}
        </div>
      );
    });
  }

  const rootSelected = selectedFolderId === null;

  return (
    <div className="text-sm">
      <Link
        href={`${basePath}?org=${org}`}
        className={`block rounded px-2 py-1 font-medium ${rootSelected ? "" : "text-gray-400 hover:bg-gray-800"}`}
        style={rootSelected ? { backgroundColor: `${accent}26`, color: accent } : undefined}
      >
        📁 {org === "ffa" ? "FFA" : "District"} (root)
      </Link>
      {renderLevel(null, 1)}
    </div>
  );
}
