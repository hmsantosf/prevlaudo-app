"use client";

import { useCallback, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Columns, ZoomIn, ZoomOut } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  file: string;
}

export default function PdfViewer({ file }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [thumbsVisible, setThumbsVisible] = useState(true);

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  const goTo = (page: number) =>
    setCurrentPage(Math.min(numPages, Math.max(1, page)));

  const zoomIn = () => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.25, +(s - 0.25).toFixed(2)));

  return (
    <div className="flex flex-col h-full" style={{ background: "#2b2b2b" }}>
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 flex-shrink-0 select-none border-b"
        style={{ background: "#1a1a1a", borderColor: "#333" }}
      >
        {/* Toggle thumbnails */}
        <button
          onClick={() => setThumbsVisible((v) => !v)}
          title={thumbsVisible ? "Ocultar miniaturas" : "Mostrar miniaturas"}
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-white/60 hover:text-white transition"
        >
          <Columns className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-white/15 mx-1" />

        {/* Navigation */}
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Página anterior"
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-25 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-xs tabular-nums min-w-[56px] text-center" style={{ color: "rgba(255,255,255,0.55)" }}>
          {numPages ? `${currentPage} / ${numPages}` : "—"}
        </span>

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage >= numPages}
          title="Próxima página"
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-25 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-white/15 mx-1" />

        {/* Zoom */}
        <button
          onClick={zoomOut}
          disabled={scale <= 0.25}
          title="Diminuir zoom"
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-25 transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="text-xs tabular-nums min-w-[38px] text-center" style={{ color: "rgba(255,255,255,0.55)" }}>
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={zoomIn}
          disabled={scale >= 3}
          title="Aumentar zoom"
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-25 transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <Document
        file={file}
        onLoadSuccess={onLoadSuccess}
        className="flex flex-1 min-h-0 overflow-hidden"
        loading={
          <div className="flex flex-1 items-center justify-center text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Carregando PDF…
          </div>
        }
        error={
          <div className="flex flex-1 items-center justify-center text-sm" style={{ color: "rgba(255,100,100,0.7)" }}>
            Erro ao carregar PDF.
          </div>
        }
      >
        {/* Painel de miniaturas */}
        {thumbsVisible && numPages > 0 && (
          <div
            className="flex-shrink-0 overflow-y-auto flex flex-col gap-2 py-3 px-1.5"
            style={{ width: 104, background: "#1a1a1a", borderRight: "1px solid #333" }}
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`flex flex-col items-center gap-1 rounded p-1 transition ${
                  page === currentPage
                    ? "ring-2 ring-blue-400 bg-blue-900/20"
                    : "hover:bg-white/10"
                }`}
              >
                <Page
                  pageNumber={page}
                  width={82}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {page}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Área principal */}
        <div className="flex-1 overflow-auto flex justify-center py-4 px-2">
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        </div>
      </Document>
    </div>
  );
}
