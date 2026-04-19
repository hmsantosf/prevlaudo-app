import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TabelaIndexadores from "@/components/indexadores/TabelaIndexadores";
import { TrendingUp } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Indexadores | PrevLaudo",
};

type Indexador = {
  id: string;
  nome: string;
  sigla: string;
  ativo: boolean;
  created_at: string;
};

export default async function IndexadoresPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const admin = supabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select("categoria")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profile?.categoria !== "liper") redirect("/dashboard");

  const { data: indexadoresData } = await admin
    .from("indexadores")
    .select("id, nome, sigla, ativo, created_at")
    .order("created_at", { ascending: false });

  const indexadores = (indexadoresData ?? []) as Indexador[];

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Indexadores</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os indexadores econômicos disponíveis na plataforma.</p>
        </div>
      </div>

      <TabelaIndexadores indexadoresIniciais={indexadores} />
    </div>
  );
}
