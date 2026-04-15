import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import TabelaUsuarios from "@/components/configuracoes/TabelaUsuarios";
import { Settings, Users } from "lucide-react";
import type { Metadata } from "next";

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
  if (isLiper) {
    const { data } = await admin
      .from("profiles")
      .select("id, name, email, categoria, creditos")
      .order("name", { ascending: true });
    usuarios = (data ?? []) as Profile[];
  }

  return (
    <div className="space-y-8">
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

      {/* Seção Usuários — visível apenas para liper */}
      {isLiper && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Usuários</h2>
          </div>
          <p className="text-sm text-gray-500">
            Gerencie categorias e créditos de todos os usuários da plataforma.
          </p>
          <TabelaUsuarios usuarios={usuarios} />
        </section>
      )}

      {/* Placeholder para futuras configurações */}
      {!isLiper && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Settings className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma configuração disponível no momento.</p>
        </div>
      )}
    </div>
  );
}
