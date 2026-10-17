import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { MyNav } from "./MyNav";

export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <MyNav displayName={user.displayName} isSuperAdmin={user.role === "super_admin"} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
