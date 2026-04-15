import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import Dashboard from "@/components/dashboard/IndividualDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | PrevLaudo",
};

export default async function DashboardPage() {
  const session = await auth();
  const userName = session!.user?.name ?? "Usuário";

  const { data } = await supabaseAdmin()
    .from("clientes")
    .select("id, name, cpf, data_relatorio, created_at")
    .eq("user_id", session!.user!.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const clientes = (data ?? []) as {
    id: string;
    name: string;
    cpf: string | null;
    data_relatorio: string | null;
    created_at: string;
  }[];

  return <Dashboard userName={userName} clientesRecentes={clientes} />;
}
