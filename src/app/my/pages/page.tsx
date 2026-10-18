import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { getUserOrgs } from "@/lib/require-role";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createPage, deletePage, movePage } from "./actions";
import { createFolder, deleteFolder } from "@/app/my/folders/actions";
import { FolderTree } from "@/components/FolderTree";
import { brandingFor } from "@/lib/branding";
import type { Folder, Org, PageItem } from "@/lib/signage-types";

type PageRow = { id: string; name: string; items: PageItem[]; updated_at: string; folder_id: string | null };

function folderPath(folders: Folder[], folderId: string | null): string {
  if (!folderId) return "Root";
  const byId = new Map(folders.map((f) => [f.id, f]));
  const parts: string[] = [];
  let current: Folder | undefined = byId.get(folderId);
  while (current) {
    parts.unshift(current.name);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return parts.join(" / ") || "Root";
}

export default async function MyPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; folder?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { org: orgParam, folder: folderParam } = await searchParams;
  const orgs = await getUserOrgs();

  if (orgs.length === 0) {
    return (
      <div>
        <h1 className="text-lg font-semibold">My Pages</h1>
        <p className="mt-3 max-w-md rounded-md bg-amber-500/10 p-4 text-sm text-amber-300">
          You don&apos;t have access to FFA or District content yet. Ask your super admin to
          grant you access on the Users page.
        </p>
      </div>
    );
  }

  const org: Org = orgParam === "ffa" || orgParam === "district" ? (orgParam as Org) : orgs[0];
  const selectedFolderId = folderParam?.trim() || null;

  const supabase = await createClient();

  const [{ data: folderRows }, pagesQuery] = await Promise.all([
    supabase.from("folders").select("id, org, parent_id, name").eq("org", org).order("name"),
    selectedFolderId
      ? supabase
          .from("pages")
          .select("id, name, items, updated_at, folder_id")
          .eq("org", org)
          .eq("folder_id", selectedFolderId)
          .order("updated_at", { ascending: false })
      : supabase
          .from("pages")
          .select("id, name, items, updated_at, folder_id")
          .eq("org", org)
          .is("folder_id", null)
          .order("updated_at", { ascending: false }),
  ]);

  const folders = (folderRows ?? []) as Folder[];
  const pages = (pagesQuery.data ?? []) as PageRow[];

  return (
    <div>
      <h1 className="text-lg font-semibold">My Pages</h1>
      <p className="text-sm text-gray-500">
        A page is a looping playlist of your assets. Build one, then push it to a screen you
        have access to. Anyone with access to {org === "ffa" ? "FFA" : "District"} can edit it.
      </p>

      <div className="mt-4 flex border-b border-gray-800 text-sm font-medium">
        {orgs.map((o) => (
          <a
            key={o}
            href={`/my/pages?org=${o}`}
            className={`px-4 py-2 ${o === org ? "border-b-2 font-medium" : "text-gray-400 hover:text-gray-200"}`}
            style={o === org ? { borderColor: brandingFor(o).accent, color: brandingFor(o).accent } : undefined}
          >
            {o === "ffa" ? "FFA" : "District"}
          </a>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
        <div className="rounded-lg border border-gray-800">
          <div className="p-2">
            <FolderTree folders={folders} org={org} selectedFolderId={selectedFolderId} basePath="/my/pages" />
          </div>
          <form action={createFolder} className="border-t border-gray-800 p-2">
            <input type="hidden" name="org" value={org} />
            <input type="hidden" name="parent_id" value={selectedFolderId ?? ""} />
            <div className="flex gap-1">
              <input
                name="name"
                required
                placeholder="New folder"
                className="w-full rounded border border-gray-800 px-2 py-1 text-xs"
              />
              <button className="shrink-0 rounded border border-gray-700 px-2 text-xs font-medium hover:bg-gray-800">
                +
              </button>
            </div>
          </form>
          {selectedFolderId && (
            <form action={deleteFolder} className="border-t border-gray-800 p-2">
              <input type="hidden" name="org" value={org} />
              <input type="hidden" name="folder_id" value={selectedFolderId} />
              <button className="w-full rounded border border-red-900 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-900/20">
                Delete this folder
              </button>
              <p className="mt-1 text-[10px] text-gray-400">Only works if it&apos;s empty.</p>
            </form>
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-gray-400">
            {org === "ffa" ? "FFA" : "District"} / {folderPath(folders, selectedFolderId)}
          </div>

          <form
            action={createPage}
            className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-gray-800 p-4"
          >
            <input type="hidden" name="org" value={org} />
            <input type="hidden" name="folder_id" value={selectedFolderId ?? ""} />
            <div className="flex flex-1 min-w-[220px] flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">New page name</label>
              <input
                name="name"
                required
                className="w-full rounded border border-gray-800 px-2 py-1 text-sm"
                placeholder="Fall Open House Loop"
              />
            </div>
            <button className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
              Create page
            </button>
          </form>

          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800 text-left text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-2">Page</th>
                  <th className="px-4 py-2">Items</th>
                  <th className="px-4 py-2">Total runtime</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => {
                  const items = page.items ?? [];
                  const totalSeconds = items.reduce((sum, item) => sum + (item.duration_seconds ?? 0), 0);
                  return (
                    <tr key={page.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/my/pages/${page.id}`} className="font-medium text-teal-400 hover:underline">
                          {page.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{items.length}</td>
                      <td className="px-4 py-3 text-gray-500">{totalSeconds}s</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <form action={movePage} className="flex items-center gap-1">
                            <input type="hidden" name="page_id" value={page.id} />
                            <select name="folder_id" defaultValue={selectedFolderId ?? ""} className="rounded border border-gray-800 text-xs">
                              <option value="">Root</option>
                              {folders.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {folderPath(folders, f.id)}
                                </option>
                              ))}
                            </select>
                            <button className="rounded border border-gray-700 px-2 py-0.5 text-xs font-medium hover:bg-gray-800">
                              Move
                            </button>
                          </form>
                          <form action={deletePage}>
                            <input type="hidden" name="page_id" value={page.id} />
                            <button className="text-xs font-medium text-red-400 hover:underline">Delete</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pages.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      Nothing in this folder yet — create a page above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
