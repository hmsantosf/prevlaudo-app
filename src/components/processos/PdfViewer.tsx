"use client";

import { useCallback, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;
const ZOOM_STEP = 0.1;

interface Props {
  file: string;
  termoBusca?: string;
}

export default function PdfViewer({ file, termoBusca }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(0.9);
  const [zoomInput, setZoomInput] = useState("90");

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  const goTo = (page: number) =>
    setCurrentPage(Math.min(numPages, Math.max(1, page)));

  const applyScale = (newScale: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, +newScale.toFixed(2)));
    setScale(clamped);
    setZoomInput(String(Math.round(clamped * 100)));
  };

  const zoomIn  = () => applyScale(scale + ZOOM_STEP);
  const zoomOut = () => applyScale(scale - ZOOM_STEP);

  const commitZoomInput = () => {
    const pct = parseInt(zoomInput, 10);
    if (!isNaN(pct)) {
      applyScale(pct / 100);
    } else {
      setZoomInput(String(Math.round(scale * 100)));
    }
  };

  const handleZoomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitZoomInput();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setZoomInput(String(Math.round(scale * 100)));
      (e.target as HTMLInputElement).blur();
    }
  };

  const customTextRenderer = useCallback(
    ({ str }: { str: string }) => {
      if (termoBusca && str.toLowerCase().includes(termoBusca.toLowerCase())) {
        return `<mark style="background: yellow; opacity: 0.5;">${str}</mark>`;
      }
      return str;
    },
    [termoBusca],
  );

  return (
    <div className="flex flex-col h-full" style={{ background: "#2b2b2b" }}>
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 flex-shrink-0 select-none border-b"
        style={{ background: "#1a1a1a", borderColor: "#333" }}
      >
        {/* Navigation */}
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Página anterior"
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-25 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span
          className="text-xs tabular-nums min-w-[56px] text-center"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
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
          disabled={scale <= MIN_SCALE}
          title="Diminuir zoom"
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-25 transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <input
          type="number"
          value={zoomInput}
          min={Math.round(MIN_SCALE * 100)}
          max={Math.round(MAX_SCALE * 100)}
          onChange={(e) => setZoomInput(e.target.value)}
          onBlur={commitZoomInput}
          onKeyDown={handleZoomKeyDown}
          title="Percentual de zoom (Enter para aplicar)"
          className="w-12 text-xs tabular-nums text-center rounded px-1 py-0.5 border focus:outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.8)",
            borderColor: "rgba(255,255,255,0.2)",
          }}
        />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>%</span>

        <button
          onClick={zoomIn}
          disabled={scale >= MAX_SCALE}
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
        <div className="flex-1 overflow-auto flex justify-center py-4 px-2">
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderAnnotationLayer={false}
            renderTextLayer
            customTextRenderer={customTextRenderer}
          />
        </div>
      </Document>
    </div>
  );
}
