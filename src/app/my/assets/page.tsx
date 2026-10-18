import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { getUserOrgs } from "@/lib/require-role";
import { redirect } from "next/navigation";
import { createAsset, deleteAsset, moveAsset, updateAsset } from "./actions";
import { createFolder, deleteFolder } from "@/app/my/folders/actions";
import { FolderTree } from "@/components/FolderTree";
import { brandingFor } from "@/lib/branding";
import type { Asset, Folder, Org } from "@/lib/signage-types";

const KIND_LABEL: Record<string, string> = {
  image: "Image",
  video: "Video",
  embed: "Website",
  calendar_agenda: "Calendar Agenda",
};

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

type AssetRow = Asset & { owner: { display_name: string | null; email: string } | null };

export default async function MyAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; folder?: string; error?: string; edit?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { org: orgParam, folder: folderParam, error: errorParam, edit: editParam } = await searchParams;
  const orgs = await getUserOrgs();

  if (orgs.length === 0) {
    return (
      <div>
        <h1 className="text-lg font-semibold">My Assets</h1>
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

  const [{ data: folderRows }, assetsQuery] = await Promise.all([
    supabase.from("folders").select("id, org, parent_id, name").eq("org", org).order("name"),
    selectedFolderId
      ? supabase
          .from("assets")
          .select("id, kind, url, label, org, folder_id, days_ahead, owner:users(display_name, email)")
          .eq("org", org)
          .eq("folder_id", selectedFolderId)
          .order("created_at", { ascending: false })
      : supabase
          .from("assets")
          .select("id, kind, url, label, org, folder_id, days_ahead, owner:users(display_name, email)")
          .eq("org", org)
          .is("folder_id", null)
          .order("created_at", { ascending: false }),
  ]);

  const folders = (folderRows ?? []) as Folder[];
  const assets = (assetsQuery.data ?? []) as unknown as AssetRow[];

  return (
    <div>
      <h1 className="text-lg font-semibold">My Assets</h1>
      <p className="text-sm text-gray-500">
        Images, videos, websites, and calendar agendas you can drop into a page. Anyone with
        access to {org === "ffa" ? "FFA" : "District"} can see and edit everything filed here.
      </p>

      {errorParam && (
        <p className="mt-3 rounded-md bg-red-500/10 p-3 text-sm text-red-300">
          Couldn&apos;t save: {errorParam}
        </p>
      )}

      <div className="mt-4 flex border-b border-gray-800 text-sm font-medium">
        {orgs.map((o) => (
          <a
            key={o}
            href={`/my/assets?org=${o}`}
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
            <FolderTree folders={folders} org={org} selectedFolderId={selectedFolderId} basePath="/my/assets" />
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
            action={createAsset}
            className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-gray-800 p-4"
          >
            <input type="hidden" name="org" value={org} />
            <input type="hidden" name="folder_id" value={selectedFolderId ?? ""} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Type</label>
              <select name="kind" className="rounded border border-gray-800 px-2 py-1 text-sm bg-[#0f1115] text-gray-200" defaultValue="image">
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="embed">Website</option>
                <option value="calendar_agenda">Calendar Agenda</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Label</label>
              <input name="label" className="rounded border border-gray-800 px-2 py-1 text-sm" placeholder="Fall CDE Results" />
            </div>
            <div className="flex flex-1 min-w-[220px] flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Link (or calendar email/ID for Calendar Agenda)</label>
              <input
                name="url"
                required
                className="w-full rounded border border-gray-800 px-2 py-1 text-sm"
                placeholder="https://... or name@group.calendar.google.com"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Days ahead (Calendar Agenda only)</label>
              <input
                type="number"
                name="days_ahead"
                min={1}
                max={90}
                defaultValue={30}
                className="w-24 rounded border border-gray-800 px-2 py-1 text-sm"
              />
            </div>
            <button className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
              Add asset
            </button>
          </form>
          <p className="mt-1 text-xs text-gray-400">
            Added here: {org === "ffa" ? "FFA" : "District"} / {folderPath(folders, selectedFolderId)}.
            For Calendar Agenda, the calendar must be public (Settings → Access permissions → Make
            available to public) and must list the next 30 days automatically.
          </p>

          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800 text-left text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-2">Label</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Added by</th>
                  <th className="px-4 py-2">Link</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  if (editParam === asset.id) {
                    return (
                      <tr key={asset.id} className="border-b border-gray-100 bg-gray-800 last:border-0">
                        <td colSpan={5} className="px-4 py-3">
                          <form action={updateAsset} className="flex flex-wrap items-end gap-3">
                            <input type="hidden" name="asset_id" value={asset.id} />
                            <input type="hidden" name="org" value={org} />
                            <input type="hidden" name="folder_id" value={selectedFolderId ?? ""} />
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-gray-500">Type</label>
                              <select name="kind" defaultValue={asset.kind} className="rounded border border-gray-800 px-2 py-1 text-sm bg-[#0f1115] text-gray-200">
                                <option value="image">Image</option>
                                <option value="video">Video</option>
                                <option value="embed">Website</option>
                                <option value="calendar_agenda">Calendar Agenda</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-gray-500">Label</label>
                              <input name="label" defaultValue={asset.label ?? ""} className="rounded border border-gray-800 px-2 py-1 text-sm" />
                            </div>
                            <div className="flex flex-1 min-w-[220px] flex-col gap-1">
                              <label className="text-xs font-medium text-gray-500">Link</label>
                              <input name="url" required defaultValue={asset.url} className="w-full rounded border border-gray-800 px-2 py-1 text-sm" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-gray-500">Days ahead</label>
                              <input
                                type="number"
                                name="days_ahead"
                                min={1}
                                max={90}
                                defaultValue={asset.days_ahead}
                                className="w-24 rounded border border-gray-800 px-2 py-1 text-sm"
                              />
                            </div>
                            <button className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
                              Save
                            </button>
                            <a
                              href={`/my/assets?org=${org}${selectedFolderId ? `&folder=${selectedFolderId}` : ""}`}
                              className="rounded border border-gray-700 px-3 py-1.5 text-sm font-medium hover:bg-gray-800"
                            >
                              Cancel
                            </a>
                          </form>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={asset.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-medium">{asset.label ?? "Untitled"}</td>
                      <td className="px-4 py-3 text-gray-500">{KIND_LABEL[asset.kind] ?? asset.kind}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {asset.owner?.display_name ?? asset.owner?.email ?? "—"}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-gray-400">{asset.url}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/my/assets?org=${org}${selectedFolderId ? `&folder=${selectedFolderId}` : ""}&edit=${asset.id}`}
                            className="text-xs font-medium text-gray-400 hover:text-teal-400 hover:underline"
                          >
                            Edit
                          </a>
                          <form action={moveAsset} className="flex items-center gap-1">
                            <input type="hidden" name="asset_id" value={asset.id} />
                            <select name="folder_id" defaultValue={selectedFolderId ?? ""} className="rounded border border-gray-800 text-xs bg-[#0f1115] text-gray-200">
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
                          <form action={deleteAsset}>
                            <input type="hidden" name="asset_id" value={asset.id} />
                            <button className="text-xs font-medium text-red-400 hover:underline">Delete</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {assets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                      Nothing in this folder yet — add an asset above.
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
