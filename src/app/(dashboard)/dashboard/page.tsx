import { auth } from "@/lib/auth";
import Dashboard from "@/components/dashboard/IndividualDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | PrevLaudo",
};

export default async function DashboardPage() {
  const session = await auth();
  const userName = session!.user?.name ?? "Usuário";

  return <Dashboard userName={userName} />;
}
