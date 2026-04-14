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

/** "50,00 %" ou "70,00%" → 0.50 / 0.70 */
function parsePorcentagem(texto: string | null): number {
  if (!texto) return 0;
  const limpo = texto.replace(/[^0-9,.]/g, "").replace(",", ".");
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num / 100;
}

/** "1960-01-15" (ISO) → "15/01/1960" (BR) */
function isoParaBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** "Masculino" | "masculino" | "MASCULINO" → "MASCULINO" */
function normalizarSexo(sexo: string | null | undefined): "MASCULINO" | "FEMININO" {
  if (!sexo) return "MASCULINO";
  return sexo.toUpperCase().includes("FEM") ? "FEMININO" : "MASCULINO";
}

function fmt(n: unknown): string {
  if (typeof n === "number") return n.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
  return String(n ?? "—");
}

/**
 * Extrai o primeiro valor numérico de um campo que pode ser
 * number, string numérica ou objeto com propriedades numéricas.
 */
function extrairNumero(valor: unknown): number | null {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    const n = parseFloat(valor.replace(",", "."));
    return isNaN(n) ? null : n;
  }
  if (valor !== null && typeof valor === "object") {
    const obj = valor as Record<string, unknown>;
    // Tenta chaves semânticas antes de iterar
    for (const chave of ["valor", "value", "resultado", "axy", "ax", "ay", "total"]) {
      if (typeof obj[chave] === "number") return obj[chave] as number;
    }
    // Fallback: primeiro valor numérico encontrado
    for (const v of Object.values(obj)) {
      if (typeof v === "number") return v;
    }
  }
  return null;
}

// Mapeamento CHAMADA_N → label exibida
const LABEL_CHAMADA: Record<string, string> = {
  CHAMADA_1: "ax",
  CHAMADA_2: "ay",
  CHAMADA_3: "axy",
};

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

type LinhaCalculo = Record<string, unknown>;

type ResultadoAPI = {
  axy_final?: number;
  formula?: string;
  calculos?: LinhaCalculo[];
  resultados?: LinhaCalculo[];
  [key: string]: unknown;
};

// ─────────────────────────────────────────────────────────────────
// Componentes de exibição
// ─────────────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{value || "—"}</p>
    </div>
  );
}

function TabelaCalculos({ linhas }: { linhas: LinhaCalculo[] }) {
  if (!linhas.length) return null;
  const colunas = Object.keys(linhas[0]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {colunas.map((col) => (
              <th
                key={col}
                className="px-4 py-2.5 text-left font-medium text-gray-500 uppercase text-xs tracking-wide"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {linhas.map((linha, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {colunas.map((col) => (
                <td key={col} className="px-4 py-3 text-gray-700 tabular-nums">
                  {fmt(linha[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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

  // ── Busca processo + cliente ──────────────────────────────────
  const { data: processo } = await supabaseAdmin()
    .from("processos")
    .select(
      `id, tipo, status,
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
  const c = p.clientes;

  if (!c) notFound();

  // ── Monta payload para a API ──────────────────────────────────
  const temBeneficiario = Boolean(c.data_nasc_beneficiario);

  const payload = {
    data_nascimento_participante: isoParaBR(c.data_nascimento),
    data_concessao:               isoParaBR(c.data_concessao),
    sexo_participante:            normalizarSexo(c.sexo),
    percentual_continuacao:       parsePorcentagem(c.percentual_continuacao),
    ...(temBeneficiario && {
      data_nascimento_beneficiario: isoParaBR(c.data_nasc_beneficiario),
      sexo_beneficiario:            "FEMININO",
    }),
  };

  console.log("[calcular] payload enviado à API:", JSON.stringify(payload, null, 2));

  // ── Chama a API externa ───────────────────────────────────────
  let resultado: ResultadoAPI | null = null;
  let erroAPI: string | null = null;

  try {
    const res = await fetch("https://prevlaudo-api.onrender.com/calcular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    // Lê o corpo como texto bruto antes de tentar parsear
    const textoResposta = await res.text();
    console.log(`[calcular] status HTTP: ${res.status}`);
    console.log("[calcular] resposta bruta da API:", textoResposta);

    if (!res.ok) {
      // Tenta extrair mensagem JSON; se falhar, usa o texto bruto
      try {
        const json = JSON.parse(textoResposta);
        erroAPI = json?.detail ?? json?.error ?? `Erro HTTP ${res.status}`;
      } catch {
        erroAPI = `Erro HTTP ${res.status} — ${textoResposta.slice(0, 2000)}`;
      }
      console.error(`[calcular] erro ${res.status}:`, erroAPI);
      console.error("[calcular] resposta completa da API:", textoResposta);
    } else {
      try {
        const json = JSON.parse(textoResposta);
        console.log("[calcular] resposta da API (JSON):", JSON.stringify(json, null, 2));
        resultado = json as ResultadoAPI;
      } catch (parseErr) {
        erroAPI = `A API retornou uma resposta inválida (não é JSON). Resposta: ${textoResposta.slice(0, 300)}`;
        console.error("[calcular] falha ao parsear JSON:", parseErr, "| texto:", textoResposta);
      }
    }
  } catch (err) {
    erroAPI = err instanceof Error ? err.message : "Falha ao conectar com a API de cálculos.";
    console.error("[calcular] erro de rede:", err);
  }

  // Detecta qual campo tem o array de cálculos (calculos ou resultados)
  const linhasCalculo: LinhaCalculo[] =
    (resultado?.calculos as LinhaCalculo[] | undefined) ??
    (resultado?.resultados as LinhaCalculo[] | undefined) ??
    [];

  // Chamadas renomeadas: CHAMADA_1 → ax, CHAMADA_2 → ay, CHAMADA_3 → axy
  const chamadas = resultado
    ? (["CHAMADA_1", "CHAMADA_2", "CHAMADA_3"] as const)
        .filter((k) => k in resultado)
        .map((k) => ({
          label: LABEL_CHAMADA[k],
          valor: extrairNumero(resultado[k]),
          raw:   resultado[k],
        }))
    : [];

  // Detecta chave do FORMULA_FINAL (pode ter variantes de nome)
  const CHAVES_FORMULA = ["FORMULA_FINAL", "formula_final"];
  const chaveFormula = resultado
    ? CHAVES_FORMULA.find((k) => k in resultado) ?? null
    : null;
  const formulaFinalRaw = chaveFormula ? resultado![chaveFormula] : null;
  const formulaFinalNum = extrairNumero(formulaFinalRaw);
  const axyFinalNum = resultado?.axy_final != null ? Number(resultado.axy_final) : null;
  const anuidade = axyFinalNum !== null ? axyFinalNum / 12 : null;

  // Campos que têm exibição dedicada (chamadas, axy_final, formula, arrays)
  const CAMPOS_RESERVADOS = new Set([
    "axy_final", "formula", "calculos", "resultados",
    "CHAMADA_1", "CHAMADA_2", "CHAMADA_3",
    ...(chaveFormula ? [chaveFormula] : []),
  ]);

  // Campos escalares da API sem seção dedicada (ex: IDADE_*, DIFERENCA_IDADE)
  const camposScalares = resultado
    ? Object.entries(resultado).filter(([k, v]) => {
        if (CAMPOS_RESERVADOS.has(k)) return false;
        if (Array.isArray(v)) return false;
        if (v !== null && typeof v === "object") return false;
        return true;
      })
    : [];

  // Lista ordenada: campos escalares → ax/ay/axy → ANUIDADE → FORMULA_FINAL
  type LinhaDisplay = { label: string; valor: unknown };
  const linhasExibicao: LinhaDisplay[] = [
    ...camposScalares.map(([k, v]) => ({ label: k, valor: v })),
    ...chamadas.filter((c) => c.valor !== null).map((c) => ({ label: c.label, valor: c.valor })),
    ...(anuidade !== null ? [{ label: "ANUIDADE", valor: anuidade }] : []),
    ...(formulaFinalRaw != null ? [{ label: chaveFormula!, valor: formulaFinalRaw }] : []),
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/processos"
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

      {/* Dados do Participante */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
          Dados do Participante
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoItem label="Nome"             value={c.name} />
          <InfoItem label="Sexo"             value={c.sexo ?? ""} />
          <InfoItem label="Data de Nascimento" value={isoParaBR(c.data_nascimento)} />
        </div>
      </div>

      {/* Dados do Beneficiário */}
      {temBeneficiario && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
            Dados do Beneficiário
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoItem label="Nome do Beneficiário"       value={c.nome_beneficiario ?? ""} />
            <InfoItem label="Data de Nascimento"         value={isoParaBR(c.data_nasc_beneficiario)} />
            <InfoItem label="Sexo do Beneficiário"       value="FEMININO" />
            <InfoItem label="% Continuação"              value={c.percentual_continuacao ?? ""} />
          </div>
        </div>
      )}

      {/* Payload enviado */}
      <details className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none">
          Parâmetros enviados à API
        </summary>
        <pre className="mt-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </details>

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

          {/* Parâmetros enviados à API */}
          <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-red-100 bg-red-50">
              <p className="text-sm font-semibold text-red-700">Parâmetros enviados à API (diagnóstico)</p>
              <p className="text-xs text-red-500 mt-0.5">Verifique se algum campo está vazio ou com formato incorreto</p>
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

          {/* Dados brutos do banco (antes da conversão) */}
          <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-orange-100 bg-orange-50">
              <p className="text-sm font-semibold text-orange-700">Dados brutos do banco (antes da conversão)</p>
              <p className="text-xs text-orange-500 mt-0.5">Valores originais salvos no Supabase — compare com os parâmetros acima</p>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {([
                  ["data_nascimento (banco)",      c.data_nascimento],
                  ["data_concessao (banco)",        c.data_concessao],
                  ["sexo (banco)",                  c.sexo],
                  ["percentual_continuacao (banco)",c.percentual_continuacao],
                  ["data_nasc_beneficiario (banco)",c.data_nasc_beneficiario],
                ] as [string, string | null][]).map(([label, val]) => (
                  <tr key={label} className={!val ? "bg-amber-50" : "hover:bg-gray-50"}>
                    <td className="px-5 py-3 font-medium text-gray-500 w-64 font-mono text-xs">{label}</td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {!val
                        ? <span className="text-amber-600 font-semibold">⚠ NULL no banco</span>
                        : <span className="text-gray-900">{val}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="space-y-5">
          {/* axy_final em destaque */}
          {resultado.axy_final !== undefined && (
            <div className="bg-blue-600 text-white rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium">Resultado — axy_final</p>
                <p className="text-4xl font-bold mt-1 tabular-nums">
                  {Number(resultado.axy_final).toLocaleString("pt-BR", { maximumFractionDigits: 6 })}
                </p>
              </div>
              <Calculator className="w-12 h-12 text-blue-300 flex-shrink-0" />
            </div>
          )}

          {/* Tabela de cálculos */}
          {linhasCalculo.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Detalhamento dos Cálculos</h2>
              </div>
              <TabelaCalculos linhas={linhasCalculo} />
            </div>
          )}

          {/* Fórmula final */}
          {resultado.formula && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Fórmula Aplicada</h2>
              <p className="text-sm font-mono bg-gray-50 rounded-lg px-4 py-3 text-gray-800 break-all">
                {String(resultado.formula)}
              </p>
            </div>
          )}

          {/* Outros campos da API */}
          {linhasExibicao.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Outros campos da API</h2>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {linhasExibicao.map(({ label, valor }) => (
                    <tr key={label} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-500 w-48">{label}</td>
                      <td className="px-5 py-3 text-gray-900 tabular-nums font-mono text-xs">
                        {typeof valor === "number"
                          ? valor.toLocaleString("pt-BR", { maximumFractionDigits: 6 })
                          : String(valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
