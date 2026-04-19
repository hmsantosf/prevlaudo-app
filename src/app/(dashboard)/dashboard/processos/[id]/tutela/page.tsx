"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Upload,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { DadosTutela, PagamentoTutela } from "@/lib/gemini-extract-tutela";

function formatBRL(valor: string): string {
  const n = parseFloat(valor);
  if (isNaN(n)) return valor || "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function TabelaPagamentos({ pagamentos }: { pagamentos: PagamentoTutela[] }) {
  if (pagamentos.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        Nenhum pagamento encontrado no documento.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left">
            <th className="px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Competência</th>
            <th className="px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Data Pagamento</th>
            <th className="px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide text-right">Valor Bruto</th>
            <th className="px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide text-right">IR Retido</th>
            <th className="px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide text-right">Valor Líquido</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pagamentos.map((p, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-700 font-mono text-xs">{p.competencia || "—"}</td>
              <td className="px-4 py-3 text-gray-700 font-mono text-xs">{p.dataPagamento || "—"}</td>
              <td className="px-4 py-3 text-gray-900 text-right tabular-nums">{formatBRL(p.valorBruto)}</td>
              <td className="px-4 py-3 text-gray-500 text-right tabular-nums">{formatBRL(p.valorIr)}</td>
              <td className="px-4 py-3 text-green-700 font-medium text-right tabular-nums">{formatBRL(p.valorLiquido)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TutelaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [dados, setDados] = useState<DadosTutela | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      setErro("Envie um arquivo PDF.");
      return;
    }

    setEnviando(true);
    setErro("");
    setSucesso(false);

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch(`/api/processos/${id}/tutela`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setErro(json.error ?? "Erro ao processar o PDF.");
        return;
      }

      setDados(json.dados_tutela);
      setSucesso(true);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* Voltar */}
      <Link
        href={`/dashboard/processos/${id}/dados`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar para dados do processo
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tutela Antecipada</h1>
          <p className="text-sm text-gray-500">
            Histórico de Pagamento de Rateio de Crédito / Tutela Antecipada União
          </p>
        </div>
      </div>

      {/* Upload */}
      {!dados && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          {enviando ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Processando PDF com IA...</p>
              <p className="text-xs text-gray-400">Isso pode levar alguns segundos</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Clique ou arraste o PDF da Tutela Antecipada
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF até 20 MB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}

      {/* Resultado */}
      {dados && (
        <div className="space-y-4">
          {sucesso && (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">Dados extraídos e salvos com sucesso.</p>
            </div>
          )}

          {/* Identificação */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Identificação</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Nome</p>
                <p className="text-sm text-gray-900">{dados.nomeCredor || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">CPF</p>
                <p className="text-sm text-gray-900">{dados.cpfCredor || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Matrícula AERUS</p>
                <p className="text-sm text-gray-900">{dados.matriculaAerus || "—"}</p>
              </div>
              {dados.dataDocumento && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Data do Documento</p>
                  <p className="text-sm text-gray-900">{dados.dataDocumento}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pagamentos */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                Histórico de Pagamentos
                <span className="ml-2 text-gray-400 font-normal normal-case">
                  ({dados.pagamentos.length} registro{dados.pagamentos.length !== 1 ? "s" : ""})
                </span>
              </h2>
            </div>
            <TabelaPagamentos pagamentos={dados.pagamentos} />
          </div>

          {/* Totais */}
          {(dados.totalBruto || dados.totalLiquido) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-4">Totais</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {dados.totalBruto && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Total Bruto</p>
                    <p className="text-sm font-medium text-gray-900">{formatBRL(dados.totalBruto)}</p>
                  </div>
                )}
                {dados.totalIr && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Total IR Retido</p>
                    <p className="text-sm text-gray-500">{formatBRL(dados.totalIr)}</p>
                  </div>
                )}
                {dados.totalLiquido && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Total Líquido</p>
                    <p className="text-sm font-semibold text-green-700">{formatBRL(dados.totalLiquido)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Novo upload */}
          <div className="flex justify-center pt-2">
            <button
              onClick={() => { setDados(null); setSucesso(false); setErro(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 transition underline"
            >
              Enviar outro PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
