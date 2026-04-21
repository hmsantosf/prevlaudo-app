"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  FileText,
  X,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import PdfViewer from "@/components/processos/PdfViewer";
import Step3TutelaForm from "@/components/processos/Step3TutelaForm";
import type { DadosTutela, PagamentoTutela } from "@/lib/gemini-extract-tutela";

function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function TabelaPagamentos({ pagamentos }: { pagamentos: PagamentoTutela[] }) {
  if (pagamentos.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        Nenhum pagamento encontrado no documento.
      </p>
    );
  }

  const total = pagamentos.reduce((s, p) => s + p.valor, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left">
            <th className="px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Referência</th>
            <th className="px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide text-right">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pagamentos.map((p, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2.5 text-gray-700 font-mono text-xs">{p.referencia || "—"}</td>
              <td className="px-4 py-2.5 text-gray-900 text-right tabular-nums">{formatBRL(p.valor)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50">
            <td className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Total ({pagamentos.length} parcela{pagamentos.length !== 1 ? "s" : ""})
            </td>
            <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">{formatBRL(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function TutelaPage() {
  const { id } = useParams<{ id: string }>();

  // Initial load from server
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [pdfSignedUrl, setPdfSignedUrl] = useState<string | null>(null);

  // Data & view mode
  const [dados, setDados] = useState<DadosTutela | null>(null);
  const [modoSplit, setModoSplit] = useState(false); // true = split panel after fresh extraction

  // Upload
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Split panel
  const [termoBusca, setTermoBusca] = useState("");
  const [leftPct, setLeftPct] = useState(45);
  const [collapsed, setCollapsed] = useState(false);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    fetch(`/api/processos/${id}/tutela`)
      .then((r) => r.json())
      .then((json) => {
        if (json.dados_tutela) {
          setDados(json.dados_tutela as DadosTutela);
          setPdfSignedUrl(json.pdf_signed_url ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setCarregandoInicial(false));
  }, [id]);

  // Object URL for uploaded file
  useEffect(() => {
    if (!arquivo) { setPdfObjectUrl(null); return; }
    const url = URL.createObjectURL(arquivo);
    setPdfObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  // Split panel drag
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

  const selecionarArquivo = (file: File) => {
    if (file.type !== "application/pdf") { setErro("Envie um arquivo PDF."); return; }
    if (file.size > 20 * 1024 * 1024) { setErro("O arquivo deve ter no máximo 20 MB."); return; }
    setErro("");
    setArquivo(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    const file = e.dataTransfer.files[0];
    if (file) selecionarArquivo(file);
  };

  const extrairDados = async () => {
    if (!arquivo) return;
    setEnviando(true);
    setErro("");

    const formData = new FormData();
    formData.append("pdf", arquivo);

    try {
      const res = await fetch(`/api/processos/${id}/tutela`, { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) { setErro(json.error ?? "Erro ao processar o PDF."); return; }
      setDados(json.dados_tutela as DadosTutela);
      setPdfSignedUrl(null);
      setModoSplit(true);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const salvarEdicao = useCallback(async (dadosEditados: DadosTutela) => {
    const res = await fetch(`/api/processos/${id}/tutela`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dados_tutela: dadosEditados }),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "Erro ao salvar");
    }
    setDados(dadosEditados);
    setModoSplit(false);
    setArquivo(null);
    setTermoBusca("");
  }, [id]);

  // ── Carregando estado inicial ──────────────────────────────────────
  if (carregandoInicial) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // ── Split panel: após extração fresca via upload ───────────────────
  if (dados && modoSplit) {
    return (
      <div className="w-full flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
        {/* Barra superior */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={() => { setDados(null); setModoSplit(false); setArquivo(null); setErro(""); setTermoBusca(""); }}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-900">Tutela Antecipada</span>
          </div>
        </div>

        {/* Split panels */}
        <div ref={containerRef} className="flex flex-1 overflow-hidden">

          {/* Painel esquerdo: PDF */}
          {!collapsed && (
            <div style={{ width: `${leftPct}%` }} className="flex-shrink-0 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-300 font-medium">Tutela Antecipada</span>
              </div>
              <div className="flex-1 overflow-hidden">
                {pdfObjectUrl ? (
                  <PdfViewer file={pdfObjectUrl} termoBusca={termoBusca} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm" style={{ background: "#2b2b2b" }}>
                    Carregando PDF…
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Divisor arrastável */}
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

          {/* Painel direito: formulário */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="p-6">
              <Step3TutelaForm
                dados={dados}
                onVoltar={() => { setDados(null); setModoSplit(false); setArquivo(null); setErro(""); setTermoBusca(""); }}
                onSalvar={salvarEdicao}
                onCampoFoco={(valor) => setTermoBusca(valor)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Visualização estática dos dados salvos ─────────────────────────
  if (dados) {
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <Link
          href={`/dashboard/processos/${id}/dados`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar para dados do processo
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tutela Antecipada</h1>
              <p className="text-sm text-gray-500">{dados.nomeCredor || "—"}</p>
            </div>
          </div>
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
        </div>

        <Section title="Dados do Plano">
          <Field label="Nome do Plano"     value={dados.nomePlano} />
          <Field label="CNPB"              value={dados.cnpb} />
          <Field label="Isonomia do Plano" value={dados.isonomiaPlano} />
        </Section>

        <Section title="Dados do Credor">
          <Field label="Nome"                value={dados.nomeCredor} />
          <Field label="CPF"                 value={dados.cpfCredor} />
          <Field label="Matrícula AERUS"     value={dados.matriculaAerus} />
          <Field label="Isonomia Individual" value={dados.isonomiaIndividual} />
          <Field label="IIP"                 value={dados.iip} />
          <Field label="Data do Documento"   value={dados.dataDocumento} />
        </Section>

        <Section title="Valores">
          <Field label="Provisão Mat. Individual" value={dados.provisaoMatematicaIndividual} />
          <Field label="Total Pago"               value={dados.totalPago} />
          <Field label="Provisão Mat. Principal"  value={dados.provisaoMatematicaPrincipal} />
          <Field label="Correção Mon. Provisão"   value={dados.correcaoMonetariaProvisao} />
          <Field label="Juros s/ Provisão Mat."   value={dados.jurosProvisaoMatematica} />
          <Field label="Correção Mon. Juros"      value={dados.correcaoMonetariaJuros} />
        </Section>

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
      </div>
    );
  }

  // ── Tela de upload ─────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <Link
        href={`/dashboard/processos/${id}/dados`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar para dados do processo
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tutela Antecipada</h1>
          <p className="text-sm text-gray-500">
            Histórico de Pagamento de Rateio de Crédito / Tutela Antecipada União
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) selecionarArquivo(f); }}
      />

      {!arquivo ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
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
                {arrastando ? "Solte o arquivo aqui" : "Arraste e solte o PDF da Tutela Antecipada"}
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
          </div>

          {erro && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{erro}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{arquivo.name}</p>
              <p className="text-xs text-gray-400">{(arquivo.size / 1024 / 1024).toFixed(2)} MB · PDF</p>
            </div>
            <button
              onClick={() => { setArquivo(null); setErro(""); }}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition flex-shrink-0"
              title="Trocar arquivo"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {erro && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{erro}</p>
            </div>
          )}

          <button
            onClick={extrairDados}
            disabled={enviando}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm py-3 rounded-xl transition"
          >
            {enviando ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Extraindo dados com IA...</>
            ) : (
              "Extrair dados"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
