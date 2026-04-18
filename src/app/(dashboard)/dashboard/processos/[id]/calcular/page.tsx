import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calculator } from "lucide-react";
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

function fmt6(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
}


function calcularIdade(dataNasc: string | null, dataRefIso: string | null): number | null {
  if (!dataNasc || !dataRefIso) return null;
  const nasc = new Date(dataNasc);
  const ref = new Date(dataRefIso);
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

type ChamadaAPI = {
  axy?: number;
  [key: string]: unknown;
};

type ResultadoAPI = {
  axy_final?: number;
  chamada_1?: ChamadaAPI;
  chamada_2?: ChamadaAPI;
  chamada_3?: ChamadaAPI;
  [key: string]: unknown;
};

type Bloco = {
  label: string;
  idadePart: number | null;
  idadeBen: number | null;
  diffIdade: number | null;
  ax: number | null;
  ay: number | null;
  axy: number | null;
  anuidade: number | null;
  anuidadeMensal: number | null;
  raw: ResultadoAPI | null;
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

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-mono tabular-nums ${bold ? "font-bold text-gray-900" : "text-gray-700"}`}>
        {value}
      </span>
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
  const percentual = parsePorcentagem(c.percentual_continuacao);

  // 3 datas de referência (ISO para calcularIdade, BR para a API)
  const datasRef = [
    { label: "Data de concessão",   iso: c.data_concessao,  br: isoParaBR(c.data_concessao) },
    { label: "Revisão 19/09/2014",  iso: "2014-09-19",       br: "19/09/2014" },
    { label: "Revisão 07/07/2020",  iso: "2020-07-07",       br: "07/07/2020" },
  ];

  const payloadBase = {
    data_nascimento_participante: isoParaBR(c.data_nascimento),
    sexo_participante:            sexoPart,
    percentual_continuacao:       percentual,
    ...(temBeneficiario && {
      data_nascimento_beneficiario: isoParaBR(c.data_nasc_beneficiario),
      sexo_beneficiario:            "FEMININO",
    }),
  };

  console.log("[calcular] payloadBase:", JSON.stringify(payloadBase, null, 2));

  // ── 3 chamadas em paralelo ────────────────────────────────────
  const respostasAPI = await Promise.all(
    datasRef.map(({ br }) =>
      fetch("https://prevlaudo-api.onrender.com/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payloadBase, data_concessao: br }),
        cache: "no-store",
      })
        .then((r) => (r.ok ? (r.json() as Promise<ResultadoAPI>) : null))
        .catch(() => null)
    )
  );

  console.log("[calcular] respostas:", JSON.stringify(respostasAPI, null, 2));

  // ── Monta os 3 blocos ─────────────────────────────────────────
  const blocos: Bloco[] = datasRef.map(({ label, iso }, i) => {
    const res = respostasAPI[i] as ResultadoAPI | null;
    const idadePart = calcularIdade(c.data_nascimento, iso);
    const idadeBen  = calcularIdade(c.data_nasc_beneficiario, iso);
    const diffIdade = idadePart !== null && idadeBen !== null ? idadeBen - idadePart : null;
    const ax  = res?.chamada_1?.axy ?? null;
    const ay  = res?.chamada_2?.axy ?? null;
    const axy = res?.chamada_3?.axy ?? null;
    const anuidade = res?.axy_final ?? null;
    const anuidadeMensal = anuidade !== null ? anuidade / 12 : null;
    return { label, idadePart, idadeBen, diffIdade, ax, ay, axy, anuidade, anuidadeMensal, raw: res };
  });

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-6">
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
                <InfoItem label="% Continuação"      value={c.percentual_continuacao ?? ""} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3 blocos lado a lado */}
      <div className="grid grid-cols-3 gap-4">
        {blocos.map((bloco) => (
          <div key={bloco.label} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <h3 className="text-sm font-semibold text-blue-700">{bloco.label}</h3>
            </div>

            <div className="divide-y divide-gray-100">
              <Row label="Idade participante" value={bloco.idadePart !== null ? `${bloco.idadePart} anos` : "—"} />

              {temBeneficiario && (
                <>
                  <Row label="Idade beneficiário" value={bloco.idadeBen !== null ? `${bloco.idadeBen} anos` : "—"} />
                  <Row label="Diferença de idade" value={bloco.diffIdade !== null ? `${bloco.diffIdade} anos` : "—"} />
                </>
              )}

              <Row label="ax"  value={fmt6(bloco.ax)} />

              {temBeneficiario && (
                <>
                  <Row label="ay"  value={fmt6(bloco.ay)} />
                  <Row label="axy" value={fmt6(bloco.axy)} />
                </>
              )}

              <div className="border-t border-gray-200 bg-gray-50 divide-y divide-gray-100">
                <Row label="Anuidade"        value={fmt6(bloco.anuidade)}        bold />
                <Row label="Anuidade mensal" value={fmt6(bloco.anuidadeMensal)} bold />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Debug */}
      <details className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none">
          Debug — respostas da API
        </summary>
        <pre className="mt-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(respostasAPI, null, 2)}
        </pre>
      </details>
    </div>
  );
}
