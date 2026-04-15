import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { Users, Clock, CheckCircle2, XCircle, Search, Plus, FolderOpen } from "lucide-react";
import ExcluirClienteButton from "@/components/clientes/ExcluirClienteButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clientes | PrevLaudo",
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
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

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const cfg = STATUS_MAP[status] ?? {
    label: status,
    color: "bg-gray-100 text-gray-600",
    icon: null,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

type ClienteRow = {
  id: string;
  name: string;
  cpf: string | null;
  processos: { status: string; created_at: string }[];
};

export default async function ClientesPage() {
  const session = await auth();

  const { data } = await supabaseAdmin()
    .from("clientes")
    .select("id, name, cpf, processos(status, created_at)")
    .eq("user_id", session!.user!.id)
    .order("created_at", { ascending: false });

  const clientes = (data ?? []) as ClienteRow[];

  const linhas = clientes.map((c) => {
    const ultimo = c.processos?.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0] ?? null;
    return { ...c, statusProcesso: ultimo?.status ?? null };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {linhas.length === 0
              ? "Nenhum cliente cadastrado ainda."
              : `${linhas.length} cliente${linhas.length !== 1 ? "s" : ""} cadastrado${linhas.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/dashboard/processos/novo"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Novo cliente
        </Link>
      </div>

      {/* Lista */}
      {linhas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Nenhum cliente cadastrado</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            Os clientes são criados automaticamente ao salvar um novo processo.
          </p>
          <Link
            href="/dashboard/processos/novo"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Novo cliente
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">
                  Nome
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">
                  CPF
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {linhas.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">{c.name}</td>
                  <td className="px-5 py-4 text-gray-600 tabular-nums">
                    {c.cpf ?? "—"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={c.statusProcesso} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/clientes/${c.id}/processos`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Processos
                      </Link>
                      <ExcluirClienteButton clienteId={c.id} clienteNome={c.name} />
                    </div>
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
