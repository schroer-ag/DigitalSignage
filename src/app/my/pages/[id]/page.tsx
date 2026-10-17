import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  renamePage,
  addItemToPage,
  removeItemFromPage,
  moveItem,
  pushPageToScreen,
} from "./actions";
import { SignagePreview } from "@/components/SignagePreview";
import type { Asset, PageItem } from "@/lib/signage-types";

const KIND_ICON: Record<string, string> = { image: "🖼", video: "🎬", embed: "🌐" };

export default async function PageBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const [{ data: page }, { data: assetRows }, { data: screenRows }] = await Promise.all([
    supabase.from("pages").select("id, name, items").eq("id", id).eq("owner_id", user.id).maybeSingle(),
    supabase
      .from("assets")
      .select("id, kind, url, label")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("user_screen_access").select("screen:screens(id, name)").eq("user_id", user.id),
  ]);

  if (!page) notFound();

  const assets = (assetRows ?? []) as Asset[];
  const assetsById = new Map(assets.map((a) => [a.id, a]));
  const items = (page.items ?? []) as PageItem[];
  const screens = ((screenRows ?? []) as unknown as { screen: { id: string; name: string } | null }[])
    .map((r) => r.screen)
    .filter((s): s is { id: string; name: string } => !!s);

  const previewItems = items
    .map((item) => {
      const asset = assetsById.get(item.asset_id);
      return asset ? { ...asset, duration_seconds: item.duration_seconds } : null;
    })
    .filter((x): x is Asset & { duration_seconds: number } => !!x);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/my/pages" className="text-xs text-gray-400 hover:underline">
            ← My Pages
          </Link>
          <form action={renamePage} className="mt-1 flex items-center gap-2">
            <input type="hidden" name="page_id" value={page.id} />
            <input
              name="name"
              defaultValue={page.name}
              className="rounded border border-transparent px-1 py-0.5 text-lg font-semibold hover:border-gray-200 focus:border-gray-300"
            />
            <button className="text-xs font-medium text-gray-400 hover:text-teal-700">Save name</button>
          </form>
        </div>

        <form action={pushPageToScreen} className="flex items-end gap-2">
          <input type="hidden" name="page_id" value={page.id} />
          <select name="screen_id" required className="rounded border border-gray-200 px-2 py-1.5 text-sm">
            <option value="">Push to screen…</option>
            {screens.map((screen) => (
              <option key={screen.id} value={screen.id}>
                {screen.name}
              </option>
            ))}
          </select>
          <button className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
            Push
          </button>
        </form>
      </div>
      {screens.length === 0 && (
        <p className="mt-2 text-xs text-amber-600">
          You don&apos;t have any screens assigned yet — ask your super admin to assign one before pushing.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr_280px]">
        <div className="rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase text-gray-400">
            Asset library
          </div>
          <form action={addItemToPage} className="flex flex-col gap-2 p-3">
            <input type="hidden" name="page_id" value={page.id} />
            <select name="asset_id" required className="rounded border border-gray-200 px-2 py-1 text-sm">
              <option value="">Choose an asset…</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {KIND_ICON[asset.kind] ?? ""} {asset.label ?? asset.url}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="duration_seconds"
                defaultValue={10}
                min={1}
                className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
              />
              <span className="text-xs text-gray-400">seconds</span>
            </div>
            <button className="rounded border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50">
              Add to page
            </button>
          </form>
          {assets.length === 0 && (
            <p className="px-3 pb-3 text-xs text-gray-400">
              No assets yet — add some from{" "}
              <Link href="/my/assets" className="text-teal-700 hover:underline">
                My Assets
              </Link>
              .
            </p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase text-gray-400">
            Timeline
          </div>
          {items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              Nothing in this page yet — add an asset from the library.
            </p>
          )}
          <div>
            {items.map((item, index) => {
              const asset = assetsById.get(item.asset_id);
              return (
                <div
                  key={`${item.asset_id}-${index}`}
                  className="flex items-center gap-3 border-b border-gray-100 px-4 py-2 last:border-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-50 text-base">
                    {asset ? KIND_ICON[asset.kind] : "⚠"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {asset?.label ?? asset?.url ?? "Missing asset"}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-gray-400">{item.duration_seconds}s</div>
                  <form action={moveItem}>
                    <input type="hidden" name="page_id" value={page.id} />
                    <input type="hidden" name="index" value={index} />
                    <input type="hidden" name="direction" value="up" />
                    <button disabled={index === 0} className="px-1 text-gray-400 hover:text-teal-700 disabled:opacity-30">
                      ↑
                    </button>
                  </form>
                  <form action={moveItem}>
                    <input type="hidden" name="page_id" value={page.id} />
                    <input type="hidden" name="index" value={index} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      disabled={index === items.length - 1}
                      className="px-1 text-gray-400 hover:text-teal-700 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </form>
                  <form action={removeItemFromPage}>
                    <input type="hidden" name="page_id" value={page.id} />
                    <input type="hidden" name="index" value={index} />
                    <button className="px-1 text-xs font-medium text-red-600 hover:underline">Remove</button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase text-gray-400">
            Live preview
          </div>
          <div className="p-3">
            <SignagePreview items={previewItems} />
          </div>
        </div>
      </div>
    </div>
  );
}
