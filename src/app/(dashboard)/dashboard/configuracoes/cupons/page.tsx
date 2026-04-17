import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import TabelaCupons from "@/components/configuracoes/TabelaCupons";
import { Ticket } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cupons | PrevLaudo",
};

type Cupom = {
  id: string;
  nome: string;
  desconto: number;
  tipo_desconto: "real" | "percentual";
  data_validade: string | null;
  ativo: boolean;
};

export default async function CuponsPage() {
  const session = await auth();
  const admin = supabaseAdmin();

  const { data: cuponsData } = await admin
    .from("cupons")
    .select("id, nome, desconto, tipo_desconto, data_validade, ativo")
    .order("created_at", { ascending: false });

  const cupons = (cuponsData ?? []) as Cupom[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Ticket className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupons</h1>
          <p className="text-sm text-gray-500 mt-0.5">Crie e gerencie cupons de desconto para os usuários da plataforma.</p>
        </div>
      </div>

      <TabelaCupons cuponsIniciais={cupons} />
    </div>
  );
}
