"use client";

import { useRef, useState, useCallback } from "react";
import { UploadCloud, FileText, X, Loader2 } from "lucide-react";

interface Props {
  onExtrair: (arquivo: File) => Promise<void>;
}

export default function Step1Upload({ onExtrair }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

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
    if (validar(file)) setArquivo(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    const file = e.dataTransfer.files[0];
    if (file) selecionar(file);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(true);
  };

  const onDragLeave = () => setArrastando(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selecionar(file);
  };

  const continuar = async () => {
    if (!arquivo) return;
    setCarregando(true);
    setErro("");
    try {
      await onExtrair(arquivo);
    } catch {
      setErro("Erro ao processar o PDF. Verifique o arquivo e tente novamente.");
      setCarregando(false);
    }
  };

  const remover = () => {
    setArquivo(null);
    setErro("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Carregar Relatório de Concessão da Indenização
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Envie o PDF emitido pela fundação de previdência (ex.: AERUS).
          Os dados serão extraídos automaticamente.
        </p>
      </div>

      {/* Área de upload */}
      {!arquivo ? (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-4
            border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all
            ${arrastando
              ? "border-blue-500 bg-blue-50 scale-[1.01]"
              : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40"
            }
          `}
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${arrastando ? "bg-blue-100" : "bg-white shadow-sm"}`}>
            <UploadCloud className={`w-8 h-8 transition-colors ${arrastando ? "text-blue-600" : "text-gray-400"}`} />
          </div>

          <div className="text-center">
            <p className="font-medium text-gray-700">
              {arrastando ? "Solte o arquivo aqui" : "Arraste e solte o PDF aqui"}
            </p>
            <p className="text-sm text-gray-400 mt-1">ou</p>
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-600 font-medium text-sm px-5 py-2 rounded-lg transition shadow-sm"
          >
            Escolher arquivo
          </button>

          <p className="text-xs text-gray-400">Somente PDF · máx. 20 MB</p>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      ) : (
        /* Preview do arquivo selecionado */
        <div className="flex items-center gap-4 border border-gray-200 bg-white rounded-xl p-4 shadow-sm">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{arquivo.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {(arquivo.size / 1024 / 1024).toFixed(2)} MB · PDF
            </p>
          </div>
          <button
            onClick={remover}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
            title="Remover arquivo"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {erro && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{erro}</p>
        </div>
      )}

      {/* Botão continuar */}
      <button
        onClick={continuar}
        disabled={!arquivo || carregando}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
      >
        {carregando ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Extraindo dados do PDF...
          </>
        ) : (
          "Continuar"
        )}
      </button>
    </div>
  );
}
