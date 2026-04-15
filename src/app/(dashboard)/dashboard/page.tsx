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
  const userId = session!.user!.id;
  const admin = supabaseAdmin();

  const [{ data: clientesData }, { data: profileData }] = await Promise.all([
    admin
      .from("clientes")
      .select("id, name, cpf, data_relatorio, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("profiles")
      .select("creditos")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const clientes = (clientesData ?? []) as {
    id: string;
    name: string;
    cpf: string | null;
    data_relatorio: string | null;
    created_at: string;
  }[];

  const creditos = (profileData as { creditos: number } | null)?.creditos ?? 0;

  return <Dashboard userName={userName} clientesRecentes={clientes} creditos={creditos} />;
}
