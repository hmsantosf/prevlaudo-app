import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { ChevronLeft, Coins } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Histórico de Créditos | PrevLaudo",
};

type RegistroHistorico = {
  id: string;
  tipo: "credito" | "debito";
  quantidade: number;
  descricao: string;
  origem: string;
  pagamento_id: string | null;
  valor_total: number | null;
  desconto: number | null;
  valor_pago: number | null;
  metodo_pagamento: string | null;
  ultimos_4_digitos: string | null;
  created_at: string;
};

function formatarMetodo(metodo: string | null, ultimos4: string | null): string {
  if (!metodo) return "—";
  const mapa: Record<string, string> = {
    PIX: "PIX",
    BOLETO: "Boleto",
    CREDIT_CARD: "Cartão de crédito",
  };
  const base = mapa[metodo] ?? metodo;
  if (metodo === "CREDIT_CARD" && ultimos4) {
    return `${base} ****${ultimos4}`;
  }
  return base;
}

function formatarMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function descricaoOrigem(registro: RegistroHistorico): string {
  if (registro.origem === "sistema") {
    return registro.tipo === "credito" ? "Creditado pelo sistema" : "Debitado pelo sistema";
  }
  if (registro.origem === "revisao") {
    return registro.descricao;
  }
  return registro.descricao;
}

export default async function HistoricoCreditos() {
  const session = await auth();
  const userId = session!.user!.id;
  const admin = supabaseAdmin();

  const [{ data: historico }, { data: perfil }] = await Promise.all([
    admin
      .from("creditos_historico")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("profiles")
      .select("creditos")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const registros = (historico ?? []) as RegistroHistorico[];
  const creditos = (perfil as { creditos: number } | null)?.creditos ?? 0;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Histórico de créditos</h1>
      </div>

      {/* Saldo atual */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center gap-4">
        <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
          <Coins className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm text-amber-700">Saldo atual</p>
          <p className="text-2xl font-bold text-amber-900">
            {creditos} crédito{creditos !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="ml-auto">
          <Link
            href="/dashboard/creditos/comprar"
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            Comprar créditos
          </Link>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {registros.length === 0 ? (
          <div className="p-12 text-center">
            <Coins className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Data</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Descrição</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Créditos</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registros.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                    {formatarData(r.created_at)}
                  </td>
                  <td className="px-5 py-4 text-gray-900">{descricaoOrigem(r)}</td>
                  <td className="px-5 py-4 text-right font-semibold whitespace-nowrap">
                    {r.tipo === "credito" ? (
                      <span className="text-green-600">+{r.quantidade}</span>
                    ) : (
                      <span className="text-red-500">-{r.quantidade}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right text-gray-500 whitespace-nowrap">
                    {r.origem === "pagamento" ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span>{formatarMetodo(r.metodo_pagamento, r.ultimos_4_digitos)}</span>
                        {r.desconto !== null && r.desconto > 0 && (
                          <span className="text-xs text-green-600">
                            Desconto: {formatarMoeda(r.desconto)}
                          </span>
                        )}
                        {r.valor_pago !== null && (
                          <span className="text-xs">{formatarMoeda(r.valor_pago)}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
