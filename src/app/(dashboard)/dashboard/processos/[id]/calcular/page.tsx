import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, AlertTriangle, Calculator } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cálculo Atuarial | PrevLaudo",
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function parsePorcentagem(texto: string | null): number {
  if (!texto) return 0;
  const limpo = texto.replace(/[^0-9,.]/g, "").replace(",", ".");
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num / 100;
}

function isoParaBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function normalizarSexo(sexo: string | null | undefined): "MASCULINO" | "FEMININO" {
  if (!sexo) return "MASCULINO";
  return sexo.toUpperCase().includes("FEM") ? "FEMININO" : "MASCULINO";
}

function fmt(n: unknown): string {
  if (typeof n === "number") return n.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
  return String(n ?? "—");
}

function extrairNumero(valor: unknown): number | null {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const n = parseFloat(valor.replace(",", "."));
    return isNaN(n) ? null : n;
  }
  if (valor !== null && typeof valor === "object") {
    const obj = valor as Record<string, unknown>;
    for (const chave of ["valor", "value", "resultado", "axy", "ax", "ay", "total"]) {
      if (typeof obj[chave] === "number") return obj[chave] as number;
    }
    for (const v of Object.values(obj)) {
      if (typeof v === "number") return v;
    }
  }
  return null;
}

function calcularIdade(dataNasc: string | null, dataRef: string | null): number | null {
  if (!dataNasc || !dataRef) return null;
  const nasc = new Date(dataNasc);
  const ref = new Date(dataRef);
  let idade = ref.getFullYear() - nasc.getFullYear();
  const m = ref.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < nasc.getDate())) idade--;
  return idade;
}

// ─────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────

type ClienteDB = {
  name: string;
  cpf: string | null;
  data_nascimento: string | null;
  data_concessao: string | null;
  sexo: string | null;
  nome_beneficiario: string | null;
  data_nasc_beneficiario: string | null;
  percentual_continuacao: string | null;
  indenizacao_atualizada: string | null;
};

type ProcessoDB = {
  id: string;
  tipo: string;
  status: string;
  clientes: ClienteDB | null;
};

type ResultadoAPI = {
  axy_final?: number;
  formula?: string;
  CHAMADA_1?: unknown;
  CHAMADA_2?: unknown;
  CHAMADA_3?: unknown;
  [key: string]: unknown;
};

// ─────────────────────────────────────────────────────────────────
// Componentes
// ─────────────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{value || "—"}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

export default async function CalcularPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const { data: processo } = await supabaseAdmin()
    .from("processos")
    .select(
      `id, tipo, status, cliente_id,
       clientes(
         name, cpf, data_nascimento, data_concessao, sexo,
         nome_beneficiario, data_nasc_beneficiario,
         percentual_continuacao, indenizacao_atualizada
       )`
    )
    .eq("id", id)
    .eq("user_id", session!.user!.id)
    .single();

  if (!processo) notFound();

  const p = processo as any;
  const c = p.clientes as ClienteDB;

  if (!c) notFound();

  // ── Dados derivados ───────────────────────────────────────────
  const temBeneficiario = Boolean(c.data_nasc_beneficiario);
  const sexoPart = normalizarSexo(c.sexo);
  const idadePart = calcularIdade(c.data_nascimento, c.data_concessao);
  const idadeBen = calcularIdade(c.data_nasc_beneficiario, c.data_concessao);
  const diffIdade = idadePart !== null && idadeBen !== null ? idadeBen - idadePart : null;
  const percentual = parsePorcentagem(c.percentual_continuacao);

  const tabulaPart = sexoPart === "MASCULINO" ? "AT83M2" : "AT83F2";
  const tabulaOutra = sexoPart === "MASCULINO" ? "AT83F2" : "AT83M2";

  const axParams  = { qx: tabulaPart,  qy: "ZERO",       idade: idadePart, diff: 0 };
  const ayParams  = { qx: "ZERO",      qy: tabulaPart,   idade: idadeBen,  diff: 0 };
  const axyParams = { qx: tabulaPart,  qy: tabulaOutra,  idade: idadePart, diff: diffIdade ?? 0 };

  // ── Payload para a API ────────────────────────────────────────
  const payload = {
    data_nascimento_participante: isoParaBR(c.data_nascimento),
    data_concessao:               isoParaBR(c.data_concessao),
    sexo_participante:            sexoPart,
    percentual_continuacao:       percentual,
    ...(temBeneficiario && {
      data_nascimento_beneficiario: isoParaBR(c.data_nasc_beneficiario),
      sexo_beneficiario:            "FEMININO",
    }),
  };

  console.log("[calcular] payload enviado à API:", JSON.stringify(payload, null, 2));

  // ── Chamada à API externa ─────────────────────────────────────
  let resultado: ResultadoAPI | null = null;
  let erroAPI: string | null = null;

  try {
    const res = await fetch("https://prevlaudo-api.onrender.com/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const textoResposta = await res.text();
    console.log(`[calcular] status HTTP: ${res.status}`);
    console.log("[calcular] resposta bruta da API:", textoResposta);

    if (!res.ok) {
      try {
        const json = JSON.parse(textoResposta);
        erroAPI = json?.detail ?? json?.error ?? `Erro HTTP ${res.status}`;
      } catch {
        erroAPI = `Erro HTTP ${res.status} — ${textoResposta.slice(0, 2000)}`;
      }
      console.error(`[calcular] erro ${res.status}:`, erroAPI);
    } else {
      try {
        resultado = JSON.parse(textoResposta) as ResultadoAPI;
        console.log("[calcular] resposta da API (JSON):", JSON.stringify(resultado, null, 2));
      } catch (parseErr) {
        erroAPI = `A API retornou uma resposta inválida (não é JSON). Resposta: ${textoResposta.slice(0, 300)}`;
        console.error("[calcular] falha ao parsear JSON:", parseErr);
      }
    }
  } catch (err) {
    erroAPI = err instanceof Error ? err.message : "Falha ao conectar com a API de cálculos.";
    console.error("[calcular] erro de rede:", err);
  }

  // ── Valores calculados ────────────────────────────────────────
  const axVal  = resultado ? extrairNumero(resultado.CHAMADA_1) : null;
  const ayVal  = resultado ? extrairNumero(resultado.CHAMADA_2) : null;
  const axyVal = resultado ? extrairNumero(resultado.CHAMADA_3) : null;
  const anuidade = resultado?.axy_final != null ? Number(resultado.axy_final) : null;
  const anuidadeMensal = anuidade !== null ? anuidade / 12 : null;

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={p.cliente_id ? `/dashboard/clientes/${p.cliente_id}/processos` : "/dashboard/clientes"}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Calculator className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cálculo Atuarial</h1>
          <p className="text-sm text-gray-500">{p.tipo}</p>
        </div>
      </div>

      {/* Card participante + beneficiário */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className={`grid gap-6 ${temBeneficiario ? "grid-cols-2" : "grid-cols-1"}`}>
          <div>
            <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
              Participante
            </h3>
            <div className="space-y-3">
              <InfoItem label="Nome"               value={c.name} />
              <InfoItem label="Sexo"               value={c.sexo ?? ""} />
              <InfoItem label="Data de nascimento" value={isoParaBR(c.data_nascimento)} />
              <InfoItem label="Idade na concessão" value={idadePart !== null ? `${idadePart} anos` : "—"} />
            </div>
          </div>

          {temBeneficiario && (
            <div>
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
                Beneficiário
              </h3>
              <div className="space-y-3">
                <InfoItem label="Nome"               value={c.nome_beneficiario ?? ""} />
                <InfoItem label="Sexo"               value="FEMININO" />
                <InfoItem label="Data de nascimento" value={isoParaBR(c.data_nasc_beneficiario)} />
                <InfoItem label="Idade na concessão" value={idadeBen !== null ? `${idadeBen} anos` : "—"} />
                <InfoItem label="Diferença de idade" value={diffIdade !== null ? `${diffIdade} anos` : "—"} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Erro da API */}
      {erroAPI && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-700">Erro ao calcular — a API retornou um erro</p>
              <p className="text-xs text-red-600 mt-1 font-mono break-all">{erroAPI}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-red-100 bg-red-50">
              <p className="text-sm font-semibold text-red-700">Parâmetros enviados à API</p>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {Object.entries(payload).map(([k, v]) => {
                  const vazio = String(v) === "" || v === null || v === undefined || v === 0;
                  return (
                    <tr key={k} className={vazio ? "bg-amber-50" : "hover:bg-gray-50"}>
                      <td className="px-5 py-3 font-medium text-gray-500 w-64 font-mono text-xs">{k}</td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {String(v) === "" || v === null || v === undefined ? (
                          <span className="text-amber-600 font-semibold">⚠ vazio / nulo</span>
                        ) : (
                          <span className={vazio ? "text-amber-700 font-semibold" : "text-gray-900"}>{String(v)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="space-y-5">
          {/* Tabela de resultados: ax / ay / axy */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Parâmetros dos Cálculos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-48"></th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">ax</th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">ay</th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">axy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-xs font-medium text-gray-500">Tábua qx</td>
                    <td className="px-5 py-3 text-center font-mono text-xs text-gray-700">{axParams.qx}</td>
                    <td className="px-5 py-3 text-center font-mono text-xs text-gray-700">{ayParams.qx}</td>
                    <td className="px-5 py-3 text-center font-mono text-xs text-gray-700">{axyParams.qx}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-xs font-medium text-gray-500">Tábua qy</td>
                    <td className="px-5 py-3 text-center font-mono text-xs text-gray-700">{axParams.qy}</td>
                    <td className="px-5 py-3 text-center font-mono text-xs text-gray-700">{ayParams.qy}</td>
                    <td className="px-5 py-3 text-center font-mono text-xs text-gray-700">{axyParams.qy}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-xs font-medium text-gray-500">Idade</td>
                    <td className="px-5 py-3 text-center tabular-nums text-gray-700">{axParams.idade ?? "—"}</td>
                    <td className="px-5 py-3 text-center tabular-nums text-gray-700">{ayParams.idade ?? "—"}</td>
                    <td className="px-5 py-3 text-center tabular-nums text-gray-700">{axyParams.idade ?? "—"}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-xs font-medium text-gray-500">Diferença de idade</td>
                    <td className="px-5 py-3 text-center tabular-nums text-gray-700">0</td>
                    <td className="px-5 py-3 text-center tabular-nums text-gray-700">0</td>
                    <td className="px-5 py-3 text-center tabular-nums text-gray-700">{axyParams.diff}</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="px-5 py-3 text-xs font-semibold text-gray-700">Valor</td>
                    <td className="px-5 py-3 text-center font-bold tabular-nums text-gray-900">
                      {axVal !== null ? fmt(axVal) : "—"}
                    </td>
                    <td className="px-5 py-3 text-center font-bold tabular-nums text-gray-900">
                      {ayVal !== null ? fmt(ayVal) : "—"}
                    </td>
                    <td className="px-5 py-3 text-center font-bold tabular-nums text-gray-900">
                      {axyVal !== null ? fmt(axyVal) : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Card resultado final */}
          <div className="bg-blue-600 text-white rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-blue-200 text-xs">ax</span>
                <p className="font-mono font-semibold">{axVal !== null ? fmt(axVal) : "—"}</p>
              </div>
              <div>
                <span className="text-blue-200 text-xs">% continuação</span>
                <p className="font-mono font-semibold">{(percentual * 100).toFixed(2)}%</p>
              </div>
              <div>
                <span className="text-blue-200 text-xs">ay</span>
                <p className="font-mono font-semibold">{ayVal !== null ? fmt(ayVal) : "—"}</p>
              </div>
              <div>
                <span className="text-blue-200 text-xs">axy</span>
                <p className="font-mono font-semibold">{axyVal !== null ? fmt(axyVal) : "—"}</p>
              </div>
            </div>

            <div className="border-t border-blue-500 pt-4 space-y-3">
              <div>
                <p className="text-blue-200 text-xs mb-1">
                  Anuidade = ax + % × (ay − axy)
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {anuidade !== null ? fmt(anuidade) : "—"}
                </p>
              </div>
              <div>
                <p className="text-blue-200 text-xs mb-1">
                  Anuidade mensal = anuidade ÷ 12
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {anuidadeMensal !== null ? fmt(anuidadeMensal) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Debug */}
          <details className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none">
              Debug — resposta completa da API
            </summary>
            <pre className="mt-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Debug payload (sempre visível como details) */}
      {!resultado && !erroAPI && (
        <details className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none">
            Parâmetros enviados à API
          </summary>
          <pre className="mt-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
