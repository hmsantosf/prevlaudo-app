"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ChevronLeft, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import type { DadosAerus } from "@/lib/gemini-extract";
import type { DadosTutela } from "@/lib/gemini-extract-tutela";

// ── Schema do Relatório de Concessão ────────────────────────────────────────
const concessaoSchema = z.object({
  nomeCredor:           z.string().min(1, "Campo obrigatório"),
  cpfCredor:            z.string(),
  dataNascimentoCredor: z.string(),
  matriculaAerus:       z.string(),
  matriculaFuncional:   z.string(),
  sexoCredor:           z.string(),
  dataConcessao:        z.string(),
  tipoBeneficio:        z.string(),
  tipoRenda:            z.string(),
  valorCota:            z.string(),
  montanteConcessao:    z.string(),
  anuidadeConcessao:    z.string(),
  indenizacaoConcessao: z.string(),
  indiceCorrecao:       z.string(),
  indenizacaoAtualizada:z.string(),
  nomeBeneficiario:     z.string(),
  cpfBeneficiario:      z.string(),
  dataNascBeneficiario: z.string(),
  dataRelatorio:        z.string(),
  percentualContinuacao:z.string(),
});

// ── Schema do Histórico de Tutela ────────────────────────────────────────────
const tutelaSchema = z.object({
  nomePlano:                    z.string(),
  cnpb:                         z.string(),
  isonomiaPlano:                z.string(),
  nomeCredor:                   z.string(),
  cpfCredor:                    z.string(),
  matriculaAerus:               z.string(),
  isonomiaIndividual:           z.string(),
  provisaoMatematicaIndividual: z.string(),
  iip:                          z.string(),
  totalPago:                    z.string(),
  provisaoMatematicaPrincipal:  z.string(),
  correcaoMonetariaProvisao:    z.string(),
  jurosProvisaoMatematica:      z.string(),
  correcaoMonetariaJuros:       z.string(),
  dataDocumento:                z.string(),
});

type ConcessaoFormData = z.infer<typeof concessaoSchema>;
type TutelaFormData = z.infer<typeof tutelaSchema>;

interface Props {
  dadosConcessao: DadosAerus;
  dadosTutela: DadosTutela;
  onVoltar: () => void;
  onSalvar: (dadosConcessao: DadosAerus, dadosTutela: DadosTutela) => Promise<void>;
  onCampoFoco?: (valor: string) => void;
}

interface CampoProps {
  label: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: (...args: any[]) => any;
  erro?: string;
  destaque?: boolean;
  colSpan?: 1 | 2 | 3;
  onCampoFoco?: (valor: string) => void;
}

function Campo({ label, name, register, erro, destaque, colSpan, onCampoFoco }: CampoProps) {
  const span =
    colSpan === 2 ? "sm:col-span-2" :
    colSpan === 3 ? "sm:col-span-2 lg:col-span-3" : "";

  return (
    <div className={span}>
      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
        {label}
      </label>
      <input
        {...register(name)}
        onFocus={(e: React.FocusEvent<HTMLInputElement>) => onCampoFoco?.(e.target.value)}
        className={[
          "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition",
          destaque ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white",
          erro    ? "border-red-300" : "",
        ].join(" ")}
      />
      {erro && <p className="mt-1 text-xs text-red-500">{erro}</p>}
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
        {titulo}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Step2Confirmacao({ dadosConcessao, dadosTutela, onVoltar, onSalvar, onCampoFoco }: Props) {
  const camposVaziosConcessao = Object.entries(dadosConcessao)
    .filter(([k, v]) => k !== "pdf_url" && !v)
    .length;

  const concessaoForm = useForm<ConcessaoFormData>({
    resolver: zodResolver(concessaoSchema),
    defaultValues: dadosConcessao,
  });

  const tutelaForm = useForm<TutelaFormData>({
    defaultValues: {
      nomePlano:                    dadosTutela.nomePlano,
      cnpb:                         dadosTutela.cnpb,
      isonomiaPlano:                dadosTutela.isonomiaPlano,
      nomeCredor:                   dadosTutela.nomeCredor,
      cpfCredor:                    dadosTutela.cpfCredor,
      matriculaAerus:               dadosTutela.matriculaAerus,
      isonomiaIndividual:           dadosTutela.isonomiaIndividual,
      provisaoMatematicaIndividual: dadosTutela.provisaoMatematicaIndividual,
      iip:                          dadosTutela.iip,
      totalPago:                    dadosTutela.totalPago,
      provisaoMatematicaPrincipal:  dadosTutela.provisaoMatematicaPrincipal,
      correcaoMonetariaProvisao:    dadosTutela.correcaoMonetariaProvisao,
      jurosProvisaoMatematica:      dadosTutela.jurosProvisaoMatematica,
      correcaoMonetariaJuros:       dadosTutela.correcaoMonetariaJuros,
      dataDocumento:                dadosTutela.dataDocumento,
    },
  });

  const { formState: { errors: errorsConcessao, isSubmitting } } = concessaoForm;

  const onSubmit = concessaoForm.handleSubmit(async (concessaoData) => {
    const tutelaFormValues = tutelaForm.getValues();
    const dadosTutelaFinal: DadosTutela = {
      ...tutelaFormValues,
      pagamentos: dadosTutela.pagamentos,
    };
    await onSalvar(concessaoData, dadosTutelaFinal);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Confirmar dados extraídos</h2>
        <p className="text-sm text-gray-500 mt-1">
          Revise os campos abaixo e corrija o que for necessário antes de salvar.
        </p>
      </div>

      {camposVaziosConcessao > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {camposVaziosConcessao} {camposVaziosConcessao === 1 ? "campo não foi extraído" : "campos não foram extraídos"}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Campos destacados em amarelo não foram encontrados — preencha manualmente.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 1 — RELATÓRIO DE CONCESSÃO                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 pb-1 border-b-2 border-blue-100">
          <FileText className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-semibold text-blue-700">Relatório de Concessão da Indenização</h3>
        </div>

        <Secao titulo="Dados do Credor">
          <Campo colSpan={2} label="Nome do Credor"     name="nomeCredor"           register={concessaoForm.register} erro={errorsConcessao.nomeCredor?.message} destaque={!dadosConcessao.nomeCredor} onCampoFoco={onCampoFoco} />
          <Campo             label="CPF"                name="cpfCredor"            register={concessaoForm.register} destaque={!dadosConcessao.cpfCredor} onCampoFoco={onCampoFoco} />
          <Campo             label="Data de Nascimento" name="dataNascimentoCredor" register={concessaoForm.register} destaque={!dadosConcessao.dataNascimentoCredor} onCampoFoco={onCampoFoco} />
          <Campo             label="Matrícula AERUS"    name="matriculaAerus"       register={concessaoForm.register} destaque={!dadosConcessao.matriculaAerus} onCampoFoco={onCampoFoco} />
          <Campo             label="Matrícula Funcional"name="matriculaFuncional"   register={concessaoForm.register} destaque={!dadosConcessao.matriculaFuncional} onCampoFoco={onCampoFoco} />
          <Campo             label="Sexo"               name="sexoCredor"           register={concessaoForm.register} destaque={!dadosConcessao.sexoCredor} onCampoFoco={onCampoFoco} />
        </Secao>

        <Secao titulo="Dados do Benefício">
          <Campo             label="Data de Concessão" name="dataConcessao"  register={concessaoForm.register} destaque={!dadosConcessao.dataConcessao} onCampoFoco={onCampoFoco} />
          <Campo             label="Data do Relatório" name="dataRelatorio"  register={concessaoForm.register} destaque={!dadosConcessao.dataRelatorio} onCampoFoco={onCampoFoco} />
          <Campo colSpan={2} label="Tipo de Benefício" name="tipoBeneficio"  register={concessaoForm.register} destaque={!dadosConcessao.tipoBeneficio} onCampoFoco={onCampoFoco} />
          <Campo colSpan={2} label="Tipo de Renda"     name="tipoRenda"      register={concessaoForm.register} destaque={!dadosConcessao.tipoRenda} onCampoFoco={onCampoFoco} />
        </Secao>

        <Secao titulo="Valores Financeiros">
          <Campo label="Valor da Cota"              name="valorCota"              register={concessaoForm.register} destaque={!dadosConcessao.valorCota} onCampoFoco={onCampoFoco} />
          <Campo label="Montante p/ Concessão"      name="montanteConcessao"      register={concessaoForm.register} destaque={!dadosConcessao.montanteConcessao} onCampoFoco={onCampoFoco} />
          <Campo label="Anuidade p/ Concessão"      name="anuidadeConcessao"      register={concessaoForm.register} destaque={!dadosConcessao.anuidadeConcessao} onCampoFoco={onCampoFoco} />
          <Campo label="Indenização na Concessão"   name="indenizacaoConcessao"   register={concessaoForm.register} destaque={!dadosConcessao.indenizacaoConcessao} onCampoFoco={onCampoFoco} />
          <Campo label="Índice de Correção"         name="indiceCorrecao"         register={concessaoForm.register} destaque={!dadosConcessao.indiceCorrecao} onCampoFoco={onCampoFoco} />
          <Campo label="Indenização Atualizada"     name="indenizacaoAtualizada"  register={concessaoForm.register} destaque={!dadosConcessao.indenizacaoAtualizada} onCampoFoco={onCampoFoco} />
          <Campo label="% Continuação"              name="percentualContinuacao"  register={concessaoForm.register} destaque={!dadosConcessao.percentualContinuacao} onCampoFoco={onCampoFoco} />
        </Secao>

        <Secao titulo="Dados do Beneficiário">
          <Campo colSpan={2} label="Nome do Beneficiário"    name="nomeBeneficiario"     register={concessaoForm.register} destaque={!dadosConcessao.nomeBeneficiario} onCampoFoco={onCampoFoco} />
          <Campo             label="CPF do Beneficiário"     name="cpfBeneficiario"      register={concessaoForm.register} destaque={!dadosConcessao.cpfBeneficiario} onCampoFoco={onCampoFoco} />
          <Campo             label="Data de Nascimento"      name="dataNascBeneficiario" register={concessaoForm.register} destaque={!dadosConcessao.dataNascBeneficiario} onCampoFoco={onCampoFoco} />
        </Secao>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 2 — HISTÓRICO DE TUTELA ANTECIPADA                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 pb-1 border-b-2 border-purple-100">
          <FileText className="w-4 h-4 text-purple-600" />
          <h3 className="text-base font-semibold text-purple-700">Histórico de Tutela Antecipada</h3>
        </div>

        <Secao titulo="Identificação do Plano">
          <Campo colSpan={2} label="Nome do Plano"   name="nomePlano"   register={tutelaForm.register} destaque={!dadosTutela.nomePlano} />
          <Campo             label="CNPB"             name="cnpb"        register={tutelaForm.register} destaque={!dadosTutela.cnpb} />
          <Campo             label="Isonomia do Plano" name="isonomiaPlano" register={tutelaForm.register} destaque={!dadosTutela.isonomiaPlano} />
        </Secao>

        <Secao titulo="Dados do Participante">
          <Campo colSpan={2} label="Nome do Credor"      name="nomeCredor"   register={tutelaForm.register} destaque={!dadosTutela.nomeCredor} />
          <Campo             label="CPF"                 name="cpfCredor"    register={tutelaForm.register} destaque={!dadosTutela.cpfCredor} />
          <Campo             label="Matrícula AERUS"     name="matriculaAerus" register={tutelaForm.register} destaque={!dadosTutela.matriculaAerus} />
          <Campo             label="Isonomia Individual" name="isonomiaIndividual" register={tutelaForm.register} destaque={!dadosTutela.isonomiaIndividual} />
          <Campo             label="IIP"                 name="iip"          register={tutelaForm.register} destaque={!dadosTutela.iip} />
        </Secao>

        <Secao titulo="Valores">
          <Campo label="Provisão Mat. Individual" name="provisaoMatematicaIndividual" register={tutelaForm.register} destaque={!dadosTutela.provisaoMatematicaIndividual} />
          <Campo label="Total Pago"               name="totalPago"                    register={tutelaForm.register} destaque={!dadosTutela.totalPago} />
          <Campo label="Provisão Mat. Principal"  name="provisaoMatematicaPrincipal"  register={tutelaForm.register} destaque={!dadosTutela.provisaoMatematicaPrincipal} />
          <Campo label="Correção Mon. Provisão"   name="correcaoMonetariaProvisao"    register={tutelaForm.register} destaque={!dadosTutela.correcaoMonetariaProvisao} />
          <Campo label="Juros s/ Provisão Mat."   name="jurosProvisaoMatematica"      register={tutelaForm.register} destaque={!dadosTutela.jurosProvisaoMatematica} />
          <Campo label="Correção Mon. Juros"      name="correcaoMonetariaJuros"       register={tutelaForm.register} destaque={!dadosTutela.correcaoMonetariaJuros} />
          <Campo label="Data do Documento"        name="dataDocumento"                register={tutelaForm.register} destaque={!dadosTutela.dataDocumento} />
        </Secao>

        {/* Tabela de pagamentos — somente leitura */}
        {dadosTutela.pagamentos.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
              Histórico de Pagamentos ({dadosTutela.pagamentos.length} registro{dadosTutela.pagamentos.length !== 1 ? "s" : ""})
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-2.5 font-medium text-gray-500 uppercase text-xs tracking-wide">Referência</th>
                    <th className="px-4 py-2.5 font-medium text-gray-500 uppercase text-xs tracking-wide text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dadosTutela.pagamentos.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700 font-mono text-xs">{p.referencia || "—"}</td>
                      <td className="px-4 py-2 text-gray-900 text-right tabular-nums">{formatBRL(p.valor)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900 tabular-nums">
                      {formatBRL(dadosTutela.pagamentos.reduce((s, p) => s + p.valor, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Ações ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onVoltar}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl transition"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando processo...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Confirmar e salvar
            </>
          )}
        </button>
      </div>
    </form>
  );
}
