"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, ChevronLeft, ChevronRight,
  FileText, Loader2, AlertCircle, X,
} from "lucide-react";
import Step1Upload from "./Step1Upload";
import Step2Confirmacao from "./Step2Confirmacao";
import Step3TutelaForm from "./Step3TutelaForm";
import PdfViewer from "./PdfViewer";
import type { DadosAerus } from "@/lib/gemini-extract";
import type { DadosTutela } from "@/lib/gemini-extract-tutela";

type Etapa = 1 | 2 | 3;

const etapas = [
  { numero: 1, label: "Upload dos documentos" },
  { numero: 2, label: "Relatório de Concessão" },
  { numero: 3, label: "Tutela Antecipada" },
];

function StepIndicador({ etapa, className }: { etapa: Etapa; className?: string }) {
  return (
    <div className={`flex items-center gap-0 ${className ?? ""}`}>
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
  );
}

interface Props {
  returnTo?: string;
}

export default function NovoProcessoWizard({ returnTo }: Props) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [erroGlobal, setErroGlobal] = useState("");
  const [isDuplicata, setIsDuplicata] = useState(false);

  // ── Arquivos ──────────────────────────────────────────────────────
  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null);
  const [arquivoTutela, setArquivoTutela] = useState<File | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [pdfTutelaObjectUrl, setPdfTutelaObjectUrl] = useState<string | null>(null);

  // ── Etapa 2: extração do Relatório de Concessão ───────────────────
  const [dadosConcessao, setDadosConcessao] = useState<DadosAerus | null>(null);
  const [extraindoConcessao, setExtraindoConcessao] = useState(false);
  const [erroConcessao, setErroConcessao] = useState("");
  const [termoBusca, setTermoBusca] = useState("");

  // Dados confirmados na etapa 2 (mantidos ao avançar para etapa 3)
  const [dadosConcessaoConfirmados, setDadosConcessaoConfirmados] = useState<DadosAerus | null>(null);

  // ── Etapa 3: extração do Histórico de Tutela ─────────────────────
  const [dadosTutela, setDadosTutela] = useState<DadosTutela | null>(null);
  const [extraindoTutela, setExtraindoTutela] = useState(false);
  const [erroTutela, setErroTutela] = useState("");

  // ── Split panel ───────────────────────────────────────────────────
  const [leftPct, setLeftPct] = useState(45);
  const [collapsed, setCollapsed] = useState(false);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!arquivoPdf) { setPdfObjectUrl(null); return; }
    const url = URL.createObjectURL(arquivoPdf);
    setPdfObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivoPdf]);

  useEffect(() => {
    if (!arquivoTutela) { setPdfTutelaObjectUrl(null); return; }
    const url = URL.createObjectURL(arquivoTutela);
    setPdfTutelaObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivoTutela]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(80, Math.max(15, newPct)));
    };
    const onMouseUp = () => { draggingRef.current = false; };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────

  const extrairConcessao = async (arquivo: File) => {
    setExtraindoConcessao(true);
    setErroConcessao("");
    const form = new FormData();
    form.append("pdf", arquivo);
    try {
      const res = await fetch("/api/processos/extrair", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao extrair dados do PDF");
      setDadosConcessao(json.dados as DadosAerus);
    } catch (e) {
      setErroConcessao(e instanceof Error ? e.message : "Erro ao processar o PDF. Tente novamente.");
    } finally {
      setExtraindoConcessao(false);
    }
  };

  const extrairTutela = async (arquivo: File) => {
    setExtraindoTutela(true);
    setErroTutela("");
    const form = new FormData();
    form.append("pdf", arquivo);
    try {
      const res = await fetch("/api/processos/extrair-tutela", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao extrair dados do PDF");
      setDadosTutela(json.dados as DadosTutela);
    } catch (e) {
      setErroTutela(e instanceof Error ? e.message : "Erro ao processar o PDF. Tente novamente.");
    } finally {
      setExtraindoTutela(false);
    }
  };

  const aoReceberArquivos = (arquivoConcessao: File, arquivoTut: File) => {
    setArquivoPdf(arquivoConcessao);
    setArquivoTutela(arquivoTut);
    setDadosConcessao(null);
    setDadosTutela(null);
    setDadosConcessaoConfirmados(null);
    setErroConcessao("");
    setErroTutela("");
    setErroGlobal("");
    setTermoBusca("");
    setEtapa(2);
    extrairConcessao(arquivoConcessao);
  };

  const confirmarConcessao = (dados: DadosAerus) => {
    setDadosConcessaoConfirmados(dados);
    setDadosTutela(null);
    setErroTutela("");
    setErroGlobal("");
    setTermoBusca("");
    setEtapa(3);
    if (arquivoTutela) extrairTutela(arquivoTutela);
  };

  const salvar = async (dadosTutelaForm: DadosTutela) => {
    if (!dadosConcessaoConfirmados) return;
    setErroGlobal("");
    setIsDuplicata(false);

    let pdfUrl: string | undefined;
    let pdfTutelaUrl: string | undefined;

    const uploads: Promise<void>[] = [];

    if (arquivoPdf) {
      const form = new FormData();
      form.append("pdf", arquivoPdf);
      form.append("cpfCredor", dadosConcessaoConfirmados.cpfCredor ?? "");
      form.append("dataRelatorio", dadosConcessaoConfirmados.dataRelatorio ?? "");
      uploads.push(
        fetch("/api/processos/upload-pdf", { method: "POST", body: form })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data?.path) pdfUrl = data.path as string; })
      );
    }

    if (arquivoTutela) {
      const form = new FormData();
      form.append("pdf", arquivoTutela);
      form.append("cpfCredor", dadosConcessaoConfirmados.cpfCredor ?? "");
      form.append("dataRelatorio", dadosConcessaoConfirmados.dataRelatorio ?? "");
      form.append("tipo", "tutela");
      uploads.push(
        fetch("/api/processos/upload-pdf", { method: "POST", body: form })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data?.path) pdfTutelaUrl = data.path as string; })
      );
    }

    await Promise.all(uploads);

    const res = await fetch("/api/processos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...dadosConcessaoConfirmados,
        pdf_url:        pdfUrl,
        pdf_tutela_url: pdfTutelaUrl,
        dados_tutela:   dadosTutelaForm,
      }),
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

    router.push(returnTo ?? "/dashboard/clientes");
    router.refresh();
  };

  // ── Etapa 1: upload ───────────────────────────────────────────────
  if (etapa === 1) {
    return (
      <div className="max-w-3xl mx-auto">
        <StepIndicador etapa={etapa} className="mb-10" />
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <Step1Upload onContinuar={aoReceberArquivos} />
        </div>
      </div>
    );
  }

  // ── Etapas 2 e 3: layout split ────────────────────────────────────
  const pdfAtual = etapa === 2 ? pdfObjectUrl : pdfTutelaObjectUrl;
  const tituloEtapa = etapa === 2 ? "Relatório de Concessão" : "Tutela Antecipada";
  const arquivoAtual = etapa === 2 ? arquivoPdf : arquivoTutela;

  return (
    <div className="w-full flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      {/* Barra superior */}
      <div className="w-full px-4 pt-2 pb-2 flex-shrink-0 space-y-2">
        <StepIndicador etapa={etapa} />
        {erroGlobal && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">{erroGlobal}</p>
              {isDuplicata && (
                <Link
                  href={returnTo ?? "/dashboard/clientes"}
                  className="mt-1 inline-block text-xs text-red-600 underline underline-offset-2 hover:text-red-800"
                >
                  Ver lista de processos
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Split panels */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden border-t border-gray-200 w-full">

        {/* Painel esquerdo: visualizador de PDF */}
        {!collapsed && (
          <div style={{ width: `${leftPct}%` }} className="flex-shrink-0 overflow-hidden flex flex-col">
            {/* Rótulo do PDF */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border-b border-gray-700 flex-shrink-0">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-300 font-medium">{tituloEtapa}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              {pdfAtual ? (
                <PdfViewer
                  file={pdfAtual}
                  termoBusca={termoBusca}
                />
              ) : (
                <div
                  className="flex items-center justify-center h-full text-gray-400 text-sm"
                  style={{ background: "#2b2b2b" }}
                >
                  Carregando PDF…
                </div>
              )}
            </div>
          </div>
        )}

        {/* Barra divisória */}
        <div className="relative flex-shrink-0 flex items-center select-none">
          <div
            className="w-1.5 h-full bg-gray-200 hover:bg-blue-300 cursor-col-resize transition-colors"
            onMouseDown={(e) => { e.preventDefault(); draggingRef.current = true; }}
          />
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="absolute z-10 w-6 h-10 bg-white border border-gray-200 rounded-md shadow-sm flex items-center justify-center hover:bg-gray-50 transition"
            style={{ left: "50%", transform: "translateX(-50%)" }}
            title={collapsed ? "Expandir painel PDF" : "Ocultar painel PDF"}
          >
            {collapsed
              ? <ChevronRight className="w-3 h-3 text-gray-500" />
              : <ChevronLeft  className="w-3 h-3 text-gray-500" />
            }
          </button>
        </div>

        {/* Painel direito: conteúdo da etapa */}
        <div className="flex-1 overflow-y-auto bg-white">
          {etapa === 2 ? (
            dadosConcessao ? (
              /* Formulário de confirmação do Relatório de Concessão */
              <div className="p-6">
                <Step2Confirmacao
                  dados={dadosConcessao}
                  onVoltar={() => { setDadosConcessao(null); if (arquivoPdf) extrairConcessao(arquivoPdf); }}
                  onSalvar={confirmarConcessao}
                  onCampoFoco={(valor) => setTermoBusca(valor)}
                  onCampoBlur={() => setTermoBusca("")}
                />
              </div>
            ) : (
              /* Tela de extração do Relatório de Concessão */
              <PainelExtracao
                arquivo={arquivoAtual}
                extraindo={extraindoConcessao}
                erro={erroConcessao}
                onExtrair={() => arquivoPdf && extrairConcessao(arquivoPdf)}
                onVoltar={() => setEtapa(1)}
                labelVoltar="← Voltar ao upload"
              />
            )
          ) : (
            dadosTutela ? (
              /* Formulário de confirmação da Tutela */
              <div className="p-6">
                <Step3TutelaForm
                  dados={dadosTutela}
                  onVoltar={() => { setDadosTutela(null); if (arquivoTutela) extrairTutela(arquivoTutela); }}
                  onSalvar={salvar}
                  onCampoFoco={(valor) => setTermoBusca(valor)}
                  onCampoBlur={() => setTermoBusca("")}
                />
              </div>
            ) : (
              /* Tela de extração da Tutela */
              <PainelExtracao
                arquivo={arquivoAtual}
                extraindo={extraindoTutela}
                erro={erroTutela}
                onExtrair={() => arquivoTutela && extrairTutela(arquivoTutela)}
                onVoltar={() => setEtapa(2)}
                labelVoltar="← Voltar ao Relatório de Concessão"
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Painel de extração (antes de mostrar o formulário) ────────────────────────
interface PainelExtracaoProps {
  arquivo: File | null;
  extraindo: boolean;
  erro: string;
  onExtrair: () => void;
  onVoltar: () => void;
  labelVoltar: string;
}

function PainelExtracao({ arquivo, extraindo, erro, onExtrair, onVoltar, labelVoltar }: PainelExtracaoProps) {
  return (
    <div className="p-6 space-y-4">
      {/* Card do arquivo */}
      {arquivo && (
        <div className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
          <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{arquivo.name}</p>
            <p className="text-xs text-gray-400">{(arquivo.size / 1024 / 1024).toFixed(2)} MB · PDF</p>
          </div>
        </div>
      )}

      {/* Extraindo */}
      {extraindo && (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Extraindo dados com IA...</p>
        </div>
      )}

      {/* Erro */}
      {erro && !extraindo && (
        <>
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{erro}</p>
          </div>
          <button
            onClick={onExtrair}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-3 rounded-xl transition"
          >
            Tentar novamente
          </button>
        </>
      )}

      {/* Voltar */}
      <button
        onClick={onVoltar}
        disabled={extraindo}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 transition py-1"
      >
        <X className="w-3 h-3" />
        {labelVoltar}
      </button>
    </div>
  );
}
