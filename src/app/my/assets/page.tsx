import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import { createAsset, deleteAsset } from "./actions";
import type { Asset } from "@/lib/signage-types";

const KIND_LABEL: Record<string, string> = {
  image: "Image",
  video: "Video",
  embed: "Website",
};

export default async function MyAssetsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select("id, kind, url, label")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const assets = (data ?? []) as Asset[];

  return (
    <div>
      <h1 className="text-lg font-semibold">My Assets</h1>
      <p className="text-sm text-gray-500">
        Images, videos, and websites you can drop into a page. Paste a direct link to the file
        or site — there&apos;s no upload storage wired up yet, so hosted links (Drive, YouTube,
        your own site) work best.
      </p>

      <form
        action={createAsset}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Type</label>
          <select name="kind" className="rounded border border-gray-200 px-2 py-1 text-sm" defaultValue="image">
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="embed">Website</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Label</label>
          <input name="label" className="rounded border border-gray-200 px-2 py-1 text-sm" placeholder="Fall CDE Results" />
        </div>
        <div className="flex flex-1 min-w-[220px] flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Link</label>
          <input
            name="url"
            required
            className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
            placeholder="https://..."
          />
        </div>
        <button className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          Add asset
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-2">Label</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Link</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium">{asset.label ?? "Untitled"}</td>
                <td className="px-4 py-3 text-gray-500">{KIND_LABEL[asset.kind] ?? asset.kind}</td>
                <td className="max-w-xs truncate px-4 py-3 text-gray-400">{asset.url}</td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteAsset}>
                    <input type="hidden" name="asset_id" value={asset.id} />
                    <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No assets yet — add your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
