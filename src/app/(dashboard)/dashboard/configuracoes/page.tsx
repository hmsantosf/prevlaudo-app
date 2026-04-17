import Link from "next/link";
import { Settings, Users, Ticket, Table2, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurações | PrevLaudo",
};

const cards = [
  {
    href: "/dashboard/configuracoes/usuarios",
    icon: Users,
    label: "Usuários",
    descricao: "Gerencie categorias e créditos dos usuários da plataforma.",
  },
  {
    href: "/dashboard/configuracoes/cupons",
    icon: Ticket,
    label: "Cupons",
    descricao: "Crie e gerencie cupons de desconto para os usuários.",
  },
  {
    href: "/dashboard/configuracoes/tabuas",
    icon: Table2,
    label: "Tábuas",
    descricao: "Gerencie as tábuas atuariais disponíveis na plataforma.",
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie as configurações da plataforma.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, icon: Icon, label, descricao }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 bg-white rounded-2xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{descricao}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 group-hover:text-blue-500 transition" />
          </Link>
        ))}
      </div>
    </div>
  );
}
