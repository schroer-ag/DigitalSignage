import { createClient } from "@/lib/supabase/server";
import { setUserRole } from "./actions";

export default async function UsersPage() {
  const supabase = await createClient();

  const [{ data: users }, { data: access }] = await Promise.all([
    supabase.from("users").select("id, display_name, email, role").order("display_name"),
    supabase.from("user_screen_access").select("user_id"),
  ]);

  const screenCounts = new Map<string, number>();
  for (const row of access ?? []) {
    screenCounts.set(row.user_id, (screenCounts.get(row.user_id) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="text-lg font-semibold">Users</h1>
      <p className="text-sm text-gray-500">Who can sign in, and what they&apos;re allowed to touch.</p>
      <p className="mt-2 max-w-xl rounded-md bg-amber-50 p-3 text-xs text-amber-800">
        People show up here automatically the first time they sign in with an allowed school
        account — there&apos;s no &quot;add a user&quot; step. Use the dropdown below to set
        someone&apos;s role once they&apos;ve signed in at least once.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
            <tr>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Screens</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.display_name ?? u.email}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <form action={setUserRole} className="flex items-center gap-2">
                    <input type="hidden" name="user_id" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.role}
                      className="rounded border border-gray-200 text-xs"
                    >
                      <option value="user">User</option>
                      <option value="super_admin">Super admin</option>
                    </select>
                    <button className="rounded border border-gray-300 px-2 text-xs font-medium hover:bg-gray-50">
                      Save
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {u.role === "super_admin" ? "All screens" : screenCounts.get(u.id) ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
