import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createPage, deletePage } from "./actions";
import type { PageItem } from "@/lib/signage-types";

type PageRow = { id: string; name: string; items: PageItem[]; updated_at: string };

export default async function MyPagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("id, name, items, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const pages = (data ?? []) as PageRow[];

  return (
    <div>
      <h1 className="text-lg font-semibold">My Pages</h1>
      <p className="text-sm text-gray-500">
        A page is a looping playlist of your assets. Build one, then push it to a screen you
        have access to.
      </p>

      <form
        action={createPage}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 p-4"
      >
        <div className="flex flex-1 min-w-[220px] flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">New page name</label>
          <input
            name="name"
            required
            className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
            placeholder="Fall Open House Loop"
          />
        </div>
        <button className="rounded bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
          Create page
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
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
                    <Link href={`/my/pages/${page.id}`} className="font-medium text-teal-700 hover:underline">
                      {page.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{items.length}</td>
                  <td className="px-4 py-3 text-gray-500">{totalSeconds}s</td>
                  <td className="px-4 py-3 text-right">
                    <form action={deletePage}>
                      <input type="hidden" name="page_id" value={page.id} />
                      <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {pages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No pages yet — create your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
