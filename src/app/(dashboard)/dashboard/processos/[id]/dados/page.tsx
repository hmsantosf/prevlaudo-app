import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calculator, FileText, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dados do Relatório | PrevLaudo",
};

function isoParaBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{value || "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">{children}</div>
    </div>
  );
}

export default async function DadosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const { data: processo } = await supabaseAdmin()
    .from("processos")
    .select(
      `id, tipo, status, pdf_url, cliente_id,
       clientes(
         name, cpf, data_nascimento, sexo,
         matricula_aerus, matricula_funcional,
         data_concessao, tipo_beneficio, tipo_renda,
         percentual_continuacao, data_relatorio,
         valor_cota, montante_concessao, anuidade_concessao,
         indenizacao_concessao, indice_correcao, indenizacao_atualizada,
         nome_beneficiario, cpf_beneficiario, data_nasc_beneficiario
       )`
    )
    .eq("id", id)
    .eq("user_id", session!.user!.id)
    .single();

  if (!processo) notFound();

  const c = (Array.isArray(processo.clientes) ? processo.clientes[0] : processo.clientes) as Record<string, string | null> | null;
  if (!c) notFound();

  const clienteId = processo.cliente_id as string;

  let pdfSignedUrl: string | null = null;
  if (processo.pdf_url) {
    const { data: signedData } = await supabaseAdmin()
      .storage
      .from("processos")
      .createSignedUrl(processo.pdf_url, 3600);
    pdfSignedUrl = signedData?.signedUrl ?? null;
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* Voltar */}
      <Link
        href={`/dashboard/clientes/${clienteId}/processos`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar para processos
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dados do Relatório</h1>
            <p className="text-sm text-gray-500">{c.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pdfSignedUrl && (
            <a
              href={pdfSignedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition"
            >
              <ExternalLink className="w-4 h-4" />
              Ver PDF
            </a>
          )}
          <Link
            href={`/dashboard/processos/${id}/calcular`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
          >
            <Calculator className="w-4 h-4" />
            Calcular
          </Link>
        </div>
      </div>

      {/* Dados do Credor */}
      <Section title="Dados do Credor">
        <Field label="Nome" value={c.name} />
        <Field label="CPF" value={c.cpf} />
        <Field label="Data de Nascimento" value={isoParaBR(c.data_nascimento)} />
        <Field label="Sexo" value={c.sexo} />
        <Field label="Matrícula AERUS" value={c.matricula_aerus} />
        <Field label="Matrícula Funcional" value={c.matricula_funcional} />
      </Section>

      {/* Dados do Benefício */}
      <Section title="Dados do Benefício">
        <Field label="Data de Concessão" value={isoParaBR(c.data_concessao)} />
        <Field label="Tipo de Benefício" value={c.tipo_beneficio} />
        <Field label="Tipo de Renda" value={c.tipo_renda} />
        <Field label="% Continuação" value={c.percentual_continuacao} />
        <Field label="Data do Relatório" value={c.data_relatorio} />
      </Section>

      {/* Valores Financeiros */}
      <Section title="Valores Financeiros">
        <Field label="Valor da Cota" value={c.valor_cota} />
        <Field label="Montante de Concessão" value={c.montante_concessao} />
        <Field label="Anuidade de Concessão" value={c.anuidade_concessao} />
        <Field label="Indenização de Concessão" value={c.indenizacao_concessao} />
        <Field label="Índice de Correção" value={c.indice_correcao} />
        <Field label="Indenização Atualizada" value={c.indenizacao_atualizada} />
      </Section>

      {/* Dados do Beneficiário */}
      <Section title="Dados do Beneficiário">
        <Field label="Nome" value={c.nome_beneficiario} />
        <Field label="CPF" value={c.cpf_beneficiario} />
        <Field label="Data de Nascimento" value={isoParaBR(c.data_nasc_beneficiario)} />
      </Section>
    </div>
  );
}
