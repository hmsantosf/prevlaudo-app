import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { FileText, Clock, CheckCircle2, XCircle, Search, Plus } from "lucide-react";
import CalcularButton from "@/components/processos/CalcularButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Processos | PrevLaudo",
};

const STATUS_MAP: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pendente: {
    label: "Pendente",
    color: "bg-yellow-100 text-yellow-700",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  em_analise: {
    label: "Em análise",
    color: "bg-blue-100 text-blue-700",
    icon: <Search className="w-3.5 h-3.5" />,
  },
  concluido: {
    label: "Concluído",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  cancelado: {
    label: "Cancelado",
    color: "bg-red-100 text-red-700",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? {
    label: status,
    color: "bg-gray-100 text-gray-600",
    icon: null,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Processo = {
  id: string;
  tipo: string;
  status: string;
  created_at: string;
  clientes: { name: string; cpf: string | null } | null;
};

export default async function ProcessosPage() {
  const session = await auth();

  const { data: processos } = await supabaseAdmin()
    .from("processos")
    .select("id, tipo, status, created_at, clientes(name, cpf)")
    .eq("user_id", session!.user!.id)
    .order("created_at", { ascending: false });

  const lista = (processos ?? []) as unknown as Processo[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Processos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {lista.length === 0
              ? "Nenhum processo aberto ainda."
              : `${lista.length} processo${lista.length !== 1 ? "s" : ""} encontrado${lista.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/dashboard/processos/novo"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Novo processo
        </Link>
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Nenhum processo aberto</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            Faça upload de um relatório AERUS para iniciar o primeiro processo.
          </p>
          <Link
            href="/dashboard/processos/novo"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Novo processo
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">
                  Cliente
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">
                  Tipo
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">
                  Aberto em
                </th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">
                      {p.clientes?.name ?? "—"}
                    </p>
                    {p.clientes?.cpf && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.clientes.cpf}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-700">{p.tipo}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <CalcularButton processoId={p.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
