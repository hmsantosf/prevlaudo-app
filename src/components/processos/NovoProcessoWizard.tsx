"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import Step1Upload from "./Step1Upload";
import Step2Confirmacao from "./Step2Confirmacao";
import PdfViewer from "./PdfViewer";
import type { DadosAerus } from "@/lib/gemini-extract";
import type { DadosTutela } from "@/lib/gemini-extract-tutela";

type Etapa = 1 | 2;
type PdfAtivo = "concessao" | "tutela";

const etapas = [
  { numero: 1, label: "Upload dos documentos" },
  { numero: 2, label: "Confirmar dados" },
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
  const [dados, setDados] = useState<DadosAerus | null>(null);
  const [dadosTutela, setDadosTutela] = useState<DadosTutela | null>(null);
  const [erroGlobal, setErroGlobal] = useState("");
  const [isDuplicata, setIsDuplicata] = useState(false);

  // PDF state — concessão
  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [termoBusca, setTermoBusca] = useState("");

  // PDF state — tutela
  const [arquivoTutela, setArquivoTutela] = useState<File | null>(null);
  const [pdfTutelaObjectUrl, setPdfTutelaObjectUrl] = useState<string | null>(null);

  // Qual PDF está ativo no painel esquerdo
  const [pdfAtivo, setPdfAtivo] = useState<PdfAtivo>("concessao");

  // Split panel state
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

  const extrairDados = async (arquivoConcessao: File, arquivoTut: File) => {
    setErroGlobal("");
    setArquivoPdf(arquivoConcessao);
    setArquivoTutela(arquivoTut);

    const formConcessao = new FormData();
    formConcessao.append("pdf", arquivoConcessao);

    const formTut = new FormData();
    formTut.append("pdf", arquivoTut);

    const [resConcessao, resTutela] = await Promise.all([
      fetch("/api/processos/extrair", { method: "POST", body: formConcessao }),
      fetch("/api/processos/extrair-tutela", { method: "POST", body: formTut }),
    ]);

    const [jsonConcessao, jsonTutela] = await Promise.all([
      resConcessao.json(),
      resTutela.json(),
    ]);

    if (!resConcessao.ok) {
      throw new Error(jsonConcessao.error ?? "Erro ao extrair Relatório de Concessão");
    }
    if (!resTutela.ok) {
      throw new Error(jsonTutela.error ?? "Erro ao extrair Histórico de Tutela");
    }

    setDados(jsonConcessao.dados as DadosAerus);
    setDadosTutela(jsonTutela.dados as DadosTutela);
    setEtapa(2);
  };

  const salvar = async (dadosConcessao: DadosAerus, dadosTutelaForm: DadosTutela) => {
    setErroGlobal("");
    setIsDuplicata(false);

    // Upload dos dois PDFs em paralelo
    let pdfUrl: string | undefined;
    let pdfTutelaUrl: string | undefined;

    const uploads: Promise<void>[] = [];

    if (arquivoPdf) {
      const form = new FormData();
      form.append("pdf", arquivoPdf);
      form.append("cpfCredor", dadosConcessao.cpfCredor ?? "");
      form.append("dataRelatorio", dadosConcessao.dataRelatorio ?? "");
      uploads.push(
        fetch("/api/processos/upload-pdf", { method: "POST", body: form })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data?.path) pdfUrl = data.path as string; })
      );
    }

    if (arquivoTutela) {
      const form = new FormData();
      form.append("pdf", arquivoTutela);
      form.append("cpfCredor", dadosConcessao.cpfCredor ?? "");
      form.append("dataRelatorio", dadosConcessao.dataRelatorio ?? "");
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
        ...dadosConcessao,
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

  const urlAtiva = pdfAtivo === "concessao" ? pdfObjectUrl : pdfTutelaObjectUrl;

  // ── Etapa 2: layout split full-width ────────────────────────────────────────
  if (etapa === 2 && dados && dadosTutela) {
    return (
      <div className="w-full flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
        {/* Step indicator + erro */}
        <div className="w-full px-4 pt-2 pb-1">
          <StepIndicador etapa={etapa} className="mb-4" />
          {erroGlobal && (
            <div className="mb-3 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
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

          {/* Painel esquerdo: visualizador de PDF com abas */}
          {!collapsed && (
            <div style={{ width: `${leftPct}%` }} className="flex-shrink-0 overflow-hidden flex flex-col">
              {/* Abas */}
              <div className="flex border-b border-gray-700 bg-gray-800 flex-shrink-0">
                <button
                  onClick={() => setPdfAtivo("concessao")}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${
                    pdfAtivo === "concessao"
                      ? "text-white border-b-2 border-blue-400"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Concessão
                </button>
                <button
                  onClick={() => setPdfAtivo("tutela")}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${
                    pdfAtivo === "tutela"
                      ? "text-white border-b-2 border-blue-400"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Tutela
                </button>
              </div>
              {/* Viewer */}
              <div className="flex-1 overflow-hidden">
                {urlAtiva ? (
                  <PdfViewer
                    file={urlAtiva}
                    termoBusca={pdfAtivo === "concessao" ? termoBusca : ""}
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
              {collapsed ? (
                <ChevronRight className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronLeft className="w-3 h-3 text-gray-500" />
              )}
            </button>
          </div>

          {/* Painel direito: formulário */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <Step2Confirmacao
              dadosConcessao={dados}
              dadosTutela={dadosTutela}
              onVoltar={() => setEtapa(1)}
              onSalvar={salvar}
              onCampoFoco={(valor) => setTermoBusca(valor)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Etapa 1: layout original ─────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      <StepIndicador etapa={etapa} className="mb-10" />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        {erroGlobal && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
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

        <Step1Upload onExtrair={extrairDados} />
      </div>
    </div>
  );
}
