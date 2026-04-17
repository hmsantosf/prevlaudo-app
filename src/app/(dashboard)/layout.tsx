import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import { supabaseAdmin } from "@/lib/supabase";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("categoria")
    .eq("id", session.user?.id ?? "")
    .single();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userName={session.user?.name ?? "Usuário"}
        userEmail={session.user?.email ?? ""}
        userCategoria={profile?.categoria ?? ""}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
