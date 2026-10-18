import Link from "next/link";
import type { Folder, Org } from "@/lib/signage-types";

// Shared by My Assets and My Pages -- same org, same folder tree, just a
// different basePath. Server-rendered as plain links (?folder=<id> in the
// URL) rather than client-side expand/collapse state, so it works exactly
// like the rest of the app: no JS needed to browse it.
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
  const children = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    const key = folder.parent_id;
    children.set(key, [...(children.get(key) ?? []), folder]);
  }

  function renderLevel(parentId: string | null, depth: number) {
    const level = children.get(parentId) ?? [];
    return level.map((folder) => (
      <div key={folder.id} style={{ marginLeft: depth * 14 }}>
        <Link
          href={`${basePath}?org=${org}&folder=${folder.id}`}
          className={`block truncate rounded px-2 py-1 text-sm ${
            selectedFolderId === folder.id
              ? "bg-[#004C971A] font-medium text-[#004C97]"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          📁 {folder.name}
        </Link>
        {renderLevel(folder.id, depth + 1)}
      </div>
    ));
  }

  return (
    <div className="text-sm">
      <Link
        href={`${basePath}?org=${org}`}
        className={`block rounded px-2 py-1 font-medium ${
          selectedFolderId === null ? "bg-[#004C971A] text-[#004C97]" : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        📁 {org === "ffa" ? "FFA" : "District"} (root)
      </Link>
      {renderLevel(null, 1)}
    </div>
  );
}
