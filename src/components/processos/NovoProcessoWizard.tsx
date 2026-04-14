"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Step1Upload from "./Step1Upload";
import Step2Confirmacao from "./Step2Confirmacao";
import type { DadosAerus } from "@/lib/gemini-extract";

type Etapa = 1 | 2;

const etapas = [
  { numero: 1, label: "Upload do documento" },
  { numero: 2, label: "Confirmar dados" },
];

export default function NovoProcessoWizard() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [dados, setDados] = useState<DadosAerus | null>(null);
  const [erroGlobal, setErroGlobal] = useState("");
  const [isDuplicata, setIsDuplicata] = useState(false);

  const extrairDados = async (arquivo: File) => {
    setErroGlobal("");
    const form = new FormData();
    form.append("pdf", arquivo);

    const res = await fetch("/api/processos/extrair", {
      method: "POST",
      body: form,
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error ?? "Erro ao extrair dados do PDF");
    }

    setDados(json.dados as DadosAerus);
    setEtapa(2);
  };

  const salvar = async (dadosForm: DadosAerus) => {
    setErroGlobal("");
    setIsDuplicata(false);

    const res = await fetch("/api/processos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosForm),
    });

    const json = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        setIsDuplicata(true);
        setErroGlobal(
          json.error ??
            "Este relatório já foi cadastrado. CPF e data do relatório já constam no sistema."
        );
      } else {
        setErroGlobal(json.error ?? "Erro ao salvar processo");
      }
      return;
    }

    router.push("/dashboard/processos");
    router.refresh();
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Indicador de etapas */}
      <div className="flex items-center gap-0 mb-10">
        {etapas.map((e, idx) => (
          <div key={e.numero} className="flex items-center flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all flex-shrink-0
                  ${etapa === e.numero
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : etapa > e.numero
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-400"
                  }
                `}
              >
                {etapa > e.numero ? "✓" : e.numero}
              </div>
              <span
                className={`text-sm font-medium hidden sm:block ${
                  etapa === e.numero ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {e.label}
              </span>
            </div>
            {idx < etapas.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 transition-colors ${etapa > e.numero ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Conteúdo da etapa */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        {erroGlobal && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">{erroGlobal}</p>
              {isDuplicata && (
                <Link
                  href="/dashboard/processos"
                  className="mt-1 inline-block text-xs text-red-600 underline underline-offset-2 hover:text-red-800"
                >
                  Ver lista de processos
                </Link>
              )}
            </div>
          </div>
        )}

        {etapa === 1 && (
          <Step1Upload onExtrair={extrairDados} />
        )}

        {etapa === 2 && dados && (
          <Step2Confirmacao
            dados={dados}
            onVoltar={() => setEtapa(1)}
            onSalvar={salvar}
          />
        )}
      </div>
    </div>
  );
}
