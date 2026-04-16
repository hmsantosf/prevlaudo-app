import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import TabelaUsuarios from "@/components/configuracoes/TabelaUsuarios";
import TabelaCupons from "@/components/configuracoes/TabelaCupons";
import { Settings, Users, Ticket } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configurações | PrevLaudo",
};

type Profile = {
  id: string;
  name: string;
  email: string;
  categoria: string;
  creditos: number;
};

type Cupom = {
  id: string;
  nome: string;
  desconto: number;
  tipo_desconto: "real" | "percentual";
  data_validade: string | null;
  ativo: boolean;
};

export default async function ConfiguracoesPage() {
  const session = await auth();
  const userId = session!.user!.id;
  const admin = supabaseAdmin();

  const { data: meuPerfil } = await admin
    .from("profiles")
    .select("categoria")
    .eq("id", userId)
    .maybeSingle();

  const isLiper = meuPerfil?.categoria === "liper";

  let usuarios: Profile[] = [];
  let cupons: Cupom[] = [];

  if (isLiper) {
    const [{ data: profilesData }, { data: cuponsData }] = await Promise.all([
      admin
        .from("profiles")
        .select("id, name, email, categoria, creditos")
        .order("name", { ascending: true }),
      admin
        .from("cupons")
        .select("id, nome, desconto, tipo_desconto, data_validade, ativo")
        .order("created_at", { ascending: false }),
    ]);
    usuarios = (profilesData ?? []) as Profile[];
    cupons = (cuponsData ?? []) as Cupom[];
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie as configurações da sua conta</p>
        </div>
      </div>

      {/* Seções liper */}
      {isLiper && (
        <>
          {/* Usuários */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Users className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Usuários</h2>
            </div>
            <p className="text-sm text-gray-500">
              Gerencie categorias e créditos de todos os usuários da plataforma.
            </p>
            <TabelaUsuarios usuarios={usuarios} />
          </section>

          {/* Cupons */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Ticket className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Cupons</h2>
            </div>
            <p className="text-sm text-gray-500">
              Crie e gerencie cupons de desconto para os usuários da plataforma.
            </p>
            <TabelaCupons cuponsIniciais={cupons} />
          </section>
        </>
      )}

      {/* Placeholder para não-liper */}
      {!isLiper && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Settings className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma configuração disponível no momento.</p>
        </div>
      )}
    </div>
  );
}
