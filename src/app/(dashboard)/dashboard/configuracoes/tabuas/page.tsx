import { supabaseAdmin } from "@/lib/supabase";
import TabelaTabuas from "@/components/configuracoes/TabelaTabuas";
import { Table2 } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tábuas | PrevLaudo",
};

type Tabua = {
  id: string;
  nome: string;
  sigla: string;
  ativo: boolean;
  created_at: string;
};

export default async function TabuasPage() {
  const admin = supabaseAdmin();

  const { data: tabuasData } = await admin
    .from("tabuas")
    .select("id, nome, sigla, ativo, created_at")
    .order("created_at", { ascending: false });

  const tabuas = (tabuasData ?? []) as Tabua[];

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Table2 className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tábuas atuariais</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie as tábuas atuariais disponíveis na plataforma.</p>
        </div>
      </div>

      <TabelaTabuas tabuasIniciais={tabuas} />
    </div>
  );
}
