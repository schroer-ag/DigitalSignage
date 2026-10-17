import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "super_admin") redirect("/");

  return (
    <div className="flex min-h-screen">
      <AdminNav displayName={user.displayName} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
