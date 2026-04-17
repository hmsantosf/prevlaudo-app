import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import TabelaUsuarios from "@/components/configuracoes/TabelaUsuarios";
import { Users } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usuários | PrevLaudo",
};

type Profile = {
  id: string;
  name: string;
  email: string;
  categoria: string;
  creditos: number;
};

export default async function UsuariosPage() {
  const session = await auth();
  const admin = supabaseAdmin();

  const { data: profilesData } = await admin
    .from("profiles")
    .select("id, name, email, categoria, creditos")
    .order("name", { ascending: true });

  const usuarios = (profilesData ?? []) as Profile[];

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie categorias e créditos dos usuários da plataforma.</p>
        </div>
      </div>

      <TabelaUsuarios usuarios={usuarios} />
    </div>
  );
}
