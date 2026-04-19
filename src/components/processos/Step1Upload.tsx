"use client";

import { useRef, useState, useCallback } from "react";
import { UploadCloud, FileText, X, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  onExtrair: (arquivoConcessao: File, arquivoTutela: File) => Promise<void>;
}

interface ZonaProps {
  numero: 1 | 2;
  titulo: string;
  descricao: string;
  arquivo: File | null;
  onArquivo: (file: File | null) => void;
  disabled: boolean;
}

function ZonaUpload({ numero, titulo, descricao, arquivo, onArquivo, disabled }: ZonaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState("");

  const validar = (file: File): boolean => {
    if (file.type !== "application/pdf") {
      setErro("Apenas arquivos PDF são aceitos.");
      return false;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErro("O arquivo deve ter no máximo 20 MB.");
      return false;
    }
    return true;
  };

  const selecionar = (file: File) => {
    setErro("");
    if (validar(file)) onArquivo(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    const file = e.dataTransfer.files[0];
    if (file) selecionar(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remover = () => {
    onArquivo(null);
    setErro("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${arquivo ? "bg-green-500 text-white" : "bg-blue-100 text-blue-700"}`}>
          {arquivo ? <CheckCircle2 className="w-3.5 h-3.5" /> : numero}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-800">{titulo}</p>
          <p className="text-xs text-gray-500 mt-0.5">{descricao}</p>
        </div>
      </div>

      {!arquivo ? (
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onClick={() => { if (!disabled) inputRef.current?.click(); }}
          className={`
            relative flex flex-col items-center justify-center gap-3
            border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            ${arrastando
              ? "border-blue-500 bg-blue-50 scale-[1.01]"
              : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40"
            }
          `}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${arrastando ? "bg-blue-100" : "bg-white shadow-sm"}`}>
            <UploadCloud className={`w-6 h-6 transition-colors ${arrastando ? "text-blue-600" : "text-gray-400"}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {arrastando ? "Solte o arquivo aqui" : "Arraste e solte o PDF"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">ou</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!disabled) inputRef.current?.click(); }}
            disabled={disabled}
            className="bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-600 font-medium text-xs px-4 py-1.5 rounded-lg transition shadow-sm disabled:opacity-50"
          >
            Escolher arquivo
          </button>
          <p className="text-xs text-gray-400">Somente PDF · máx. 20 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) selecionar(f); }}
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 border border-green-200 bg-green-50 rounded-xl p-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <FileText className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{arquivo.name}</p>
            <p className="text-xs text-gray-500">{(arquivo.size / 1024 / 1024).toFixed(2)} MB · PDF</p>
          </div>
          <button
            onClick={remover}
            disabled={disabled}
            className="p-1.5 hover:bg-green-100 rounded-lg transition flex-shrink-0 disabled:opacity-50"
            title="Remover arquivo"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {erro && <p className="text-xs text-red-500">{erro}</p>}
    </div>
  );
}

export default function Step1Upload({ onExtrair }: Props) {
  const [arquivoConcessao, setArquivoConcessao] = useState<File | null>(null);
  const [arquivoTutela, setArquivoTutela] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const podeContinuar = !!arquivoConcessao && !!arquivoTutela && !carregando;

  const continuar = async () => {
    if (!arquivoConcessao || !arquivoTutela) return;
    setCarregando(true);
    setErro("");
    try {
      await onExtrair(arquivoConcessao, arquivoTutela);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao processar os PDFs. Verifique os arquivos e tente novamente.");
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Carregar documentos</h2>
        <p className="text-sm text-gray-500 mt-1">
          Envie os dois PDFs abaixo. Os dados serão extraídos automaticamente via IA.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ZonaUpload
          numero={1}
          titulo="Relatório de Concessão da Indenização"
          descricao="PDF emitido pela fundação de previdência (ex.: AERUS)"
          arquivo={arquivoConcessao}
          onArquivo={setArquivoConcessao}
          disabled={carregando}
        />
        <ZonaUpload
          numero={2}
          titulo="Histórico de Pagamento de Tutela Antecipada"
          descricao="Histórico de Pagamento de Rateio de Crédito / Tutela Antecipada União"
          arquivo={arquivoTutela}
          onArquivo={setArquivoTutela}
          disabled={carregando}
        />
      </div>

      {erro && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{erro}</p>
        </div>
      )}

      <button
        onClick={continuar}
        disabled={!podeContinuar}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
      >
        {carregando ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Extraindo dados dos PDFs com IA...
          </>
        ) : (
          "Continuar"
        )}
      </button>
    </div>
  );
}
