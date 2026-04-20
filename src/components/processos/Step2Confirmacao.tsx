"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ArrowRight, AlertCircle } from "lucide-react";
import type { DadosAerus } from "@/lib/gemini-extract";

const schema = z.object({
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

type FormData = z.infer<typeof schema>;

interface Props {
  dados: DadosAerus;
  onVoltar: () => void;
  onSalvar: (dados: FormData) => void;
  onCampoFoco?: (valor: string) => void;
}

interface CampoProps {
  label: string;
  name: keyof FormData;
  register: ReturnType<typeof useForm<FormData>>["register"];
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
        onFocus={(e) => onCampoFoco?.(e.target.value)}
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

export default function Step2Confirmacao({ dados, onVoltar, onSalvar, onCampoFoco }: Props) {
  const camposVazios = Object.values(dados).filter((v) => !v).length;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: dados,
  });

  return (
    <form onSubmit={handleSubmit(onSalvar)} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Relatório de Concessão</h2>
        <p className="text-sm text-gray-500 mt-1">
          Revise os campos abaixo e corrija o que for necessário antes de continuar.
        </p>
      </div>

      {camposVazios > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {camposVazios} {camposVazios === 1 ? "campo não foi extraído" : "campos não foram extraídos"}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Campos destacados em amarelo não foram encontrados — preencha manualmente.
            </p>
          </div>
        </div>
      )}

      <Secao titulo="Dados do Credor">
        <Campo colSpan={2} label="Nome do Credor"     name="nomeCredor"           register={register} erro={errors.nomeCredor?.message} destaque={!dados.nomeCredor} onCampoFoco={onCampoFoco} />
        <Campo             label="CPF"                name="cpfCredor"            register={register} destaque={!dados.cpfCredor} onCampoFoco={onCampoFoco} />
        <Campo             label="Data de Nascimento" name="dataNascimentoCredor" register={register} destaque={!dados.dataNascimentoCredor} onCampoFoco={onCampoFoco} />
        <Campo             label="Matrícula AERUS"    name="matriculaAerus"       register={register} destaque={!dados.matriculaAerus} onCampoFoco={onCampoFoco} />
        <Campo             label="Matrícula Funcional"name="matriculaFuncional"   register={register} destaque={!dados.matriculaFuncional} onCampoFoco={onCampoFoco} />
        <Campo             label="Sexo"               name="sexoCredor"           register={register} destaque={!dados.sexoCredor} onCampoFoco={onCampoFoco} />
      </Secao>

      <Secao titulo="Dados do Benefício">
        <Campo             label="Data de Concessão" name="dataConcessao"  register={register} destaque={!dados.dataConcessao} onCampoFoco={onCampoFoco} />
        <Campo             label="Data do Relatório" name="dataRelatorio"  register={register} destaque={!dados.dataRelatorio} onCampoFoco={onCampoFoco} />
        <Campo colSpan={2} label="Tipo de Benefício" name="tipoBeneficio"  register={register} destaque={!dados.tipoBeneficio} onCampoFoco={onCampoFoco} />
        <Campo colSpan={2} label="Tipo de Renda"     name="tipoRenda"      register={register} destaque={!dados.tipoRenda} onCampoFoco={onCampoFoco} />
      </Secao>

      <Secao titulo="Valores Financeiros">
        <Campo label="Valor da Cota"              name="valorCota"              register={register} destaque={!dados.valorCota} onCampoFoco={onCampoFoco} />
        <Campo label="Montante p/ Concessão"      name="montanteConcessao"      register={register} destaque={!dados.montanteConcessao} onCampoFoco={onCampoFoco} />
        <Campo label="Anuidade p/ Concessão"      name="anuidadeConcessao"      register={register} destaque={!dados.anuidadeConcessao} onCampoFoco={onCampoFoco} />
        <Campo label="Indenização na Concessão"   name="indenizacaoConcessao"   register={register} destaque={!dados.indenizacaoConcessao} onCampoFoco={onCampoFoco} />
        <Campo label="Índice de Correção"         name="indiceCorrecao"         register={register} destaque={!dados.indiceCorrecao} onCampoFoco={onCampoFoco} />
        <Campo label="Indenização Atualizada"     name="indenizacaoAtualizada"  register={register} destaque={!dados.indenizacaoAtualizada} onCampoFoco={onCampoFoco} />
        <Campo label="% Continuação"              name="percentualContinuacao"  register={register} destaque={!dados.percentualContinuacao} onCampoFoco={onCampoFoco} />
      </Secao>

      <Secao titulo="Dados do Beneficiário">
        <Campo colSpan={2} label="Nome do Beneficiário"    name="nomeBeneficiario"     register={register} destaque={!dados.nomeBeneficiario} onCampoFoco={onCampoFoco} />
        <Campo             label="CPF do Beneficiário"     name="cpfBeneficiario"      register={register} destaque={!dados.cpfBeneficiario} onCampoFoco={onCampoFoco} />
        <Campo             label="Data de Nascimento"      name="dataNascBeneficiario" register={register} destaque={!dados.dataNascBeneficiario} onCampoFoco={onCampoFoco} />
      </Secao>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onVoltar}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Reextrair
        </button>

        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition"
        >
          Confirmar e continuar
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
