"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react";
import type { DadosTutela } from "@/lib/gemini-extract-tutela";

const schema = z.object({
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

type FormData = z.infer<typeof schema>;

interface Props {
  dados: DadosTutela;
  onVoltar: () => void;
  onSalvar: (dados: DadosTutela) => Promise<void>;
  onCampoFoco?: (valor: string) => void;
}

interface CampoProps {
  label: string;
  name: keyof FormData;
  register: ReturnType<typeof useForm<FormData>>["register"];
  destaque?: boolean;
  colSpan?: 1 | 2 | 3;
  onCampoFoco?: (valor: string) => void;
}

function Campo({ label, name, register, destaque, colSpan, onCampoFoco }: CampoProps) {
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
          "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition",
          destaque ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white",
        ].join(" ")}
      />
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

export default function Step3TutelaForm({ dados, onVoltar, onSalvar, onCampoFoco }: Props) {
  const camposVazios = [
    dados.nomePlano, dados.cnpb, dados.isonomiaPlano, dados.nomeCredor,
    dados.matriculaAerus, dados.isonomiaIndividual, dados.provisaoMatematicaIndividual,
    dados.iip, dados.totalPago,
  ].filter((v) => !v).length;

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nomePlano:                    dados.nomePlano,
      cnpb:                         dados.cnpb,
      isonomiaPlano:                dados.isonomiaPlano,
      nomeCredor:                   dados.nomeCredor,
      cpfCredor:                    dados.cpfCredor,
      matriculaAerus:               dados.matriculaAerus,
      isonomiaIndividual:           dados.isonomiaIndividual,
      provisaoMatematicaIndividual: dados.provisaoMatematicaIndividual,
      iip:                          dados.iip,
      totalPago:                    dados.totalPago,
      provisaoMatematicaPrincipal:  dados.provisaoMatematicaPrincipal,
      correcaoMonetariaProvisao:    dados.correcaoMonetariaProvisao,
      jurosProvisaoMatematica:      dados.jurosProvisaoMatematica,
      correcaoMonetariaJuros:       dados.correcaoMonetariaJuros,
      dataDocumento:                dados.dataDocumento,
    },
  });

  const onSubmit = handleSubmit(async (formValues) => {
    await onSalvar({ ...formValues, pagamentos: dados.pagamentos });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Tutela Antecipada</h2>
        <p className="text-sm text-gray-500 mt-1">
          Revise os campos abaixo e corrija o que for necessário antes de salvar.
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

      <Secao titulo="Identificação do Plano">
        <Campo colSpan={2} label="Nome do Plano"      name="nomePlano"      register={register} destaque={!dados.nomePlano}      onCampoFoco={onCampoFoco} />
        <Campo             label="CNPB"               name="cnpb"           register={register} destaque={!dados.cnpb}           onCampoFoco={onCampoFoco} />
        <Campo             label="Isonomia do Plano"  name="isonomiaPlano"  register={register} destaque={!dados.isonomiaPlano}  onCampoFoco={onCampoFoco} />
      </Secao>

      <Secao titulo="Dados do Participante">
        <Campo colSpan={2} label="Nome do Credor"      name="nomeCredor"           register={register} destaque={!dados.nomeCredor}           onCampoFoco={onCampoFoco} />
        <Campo             label="CPF"                 name="cpfCredor"            register={register} destaque={!dados.cpfCredor}            onCampoFoco={onCampoFoco} />
        <Campo             label="Matrícula AERUS"     name="matriculaAerus"       register={register} destaque={!dados.matriculaAerus}       onCampoFoco={onCampoFoco} />
        <Campo             label="Isonomia Individual" name="isonomiaIndividual"   register={register} destaque={!dados.isonomiaIndividual}   onCampoFoco={onCampoFoco} />
        <Campo             label="IIP"                 name="iip"                  register={register} destaque={!dados.iip}                  onCampoFoco={onCampoFoco} />
        <Campo             label="Data do Documento"   name="dataDocumento"        register={register} destaque={!dados.dataDocumento}        onCampoFoco={onCampoFoco} />
      </Secao>

      <Secao titulo="Valores">
        <Campo label="Provisão Mat. Individual" name="provisaoMatematicaIndividual" register={register} destaque={!dados.provisaoMatematicaIndividual} onCampoFoco={onCampoFoco} />
        <Campo label="Total Pago"               name="totalPago"                   register={register} destaque={!dados.totalPago}                   onCampoFoco={onCampoFoco} />
        <Campo label="Provisão Mat. Principal"  name="provisaoMatematicaPrincipal" register={register} destaque={!dados.provisaoMatematicaPrincipal} onCampoFoco={onCampoFoco} />
        <Campo label="Correção Mon. Provisão"   name="correcaoMonetariaProvisao"   register={register} destaque={!dados.correcaoMonetariaProvisao}   onCampoFoco={onCampoFoco} />
        <Campo label="Juros s/ Provisão Mat."   name="jurosProvisaoMatematica"     register={register} destaque={!dados.jurosProvisaoMatematica}     onCampoFoco={onCampoFoco} />
        <Campo label="Correção Mon. Juros"      name="correcaoMonetariaJuros"      register={register} destaque={!dados.correcaoMonetariaJuros}      onCampoFoco={onCampoFoco} />
      </Secao>

      {dados.pagamentos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
            Histórico de Pagamentos ({dados.pagamentos.length} registro{dados.pagamentos.length !== 1 ? "s" : ""})
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
                {dados.pagamentos.map((p, i) => (
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
                    {formatBRL(dados.pagamentos.reduce((s, p) => s + p.valor, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onVoltar}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl transition disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Reextrair
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
