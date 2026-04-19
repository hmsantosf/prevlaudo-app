"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Check, Loader2, Copy, Trash2 } from "lucide-react";

type Linha = {
  mes: string;           // AAAA.MM display format
  valorAcumulado: string; // raw string
};

type ValorAPI = {
  mes: string;           // YYYY-MM-DD from API
  valor_acumulado: number;
  taxa_mensal: number | null;
};

interface Props {
  indexadorId: string;
  indexadorNome: string;
  indexadorSigla: string;
  onFechar: () => void;
}

function isoParaMes(iso: string): string {
  // "2025-12-01" -> "2025.12"
  return iso.slice(0, 7).replace("-", ".");
}

function mesParaISO(mes: string): string {
  // "2025.12" -> "2025-12-01"
  return mes.replace(".", "-") + "-01";
}

function parseBRNumber(str: string): number {
  if (!str) return 0;
  const s = str.trim();
  if (s.includes(',')) {
    // Formato BR: ponto = milhar, vírgula = decimal → "2.039,78" → 2039.78
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  } else {
    // Sem vírgula: se tem ponto e exatamente 3 dígitos depois = milhar sem decimal
    // "2.039" → 2039; "2.55" → 2.55
    const parts = s.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      return parseFloat(s.replace(/\./g, '')) || 0;
    }
    return parseFloat(s) || 0;
  }
}

// Calcula taxa_mensal para cada linha (linhas devem estar em ordem ASC)
function calcularTaxas(linhas: Linha[]): (number | null)[] {
  const sorted = linhas
    .map((l, idx) => ({ ...l, idx }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  const taxasOrdenadas: (number | null)[] = sorted.map((l, i) => {
    if (i === 0) return null;
    const atual = parseBRNumber(sorted[i].valorAcumulado);
    const anterior = parseBRNumber(sorted[i - 1].valorAcumulado);
    if (isNaN(atual) || isNaN(anterior) || anterior === 0) return null;
    return (atual / anterior - 1) * 100;
  });

  const result: (number | null)[] = new Array(linhas.length).fill(null);
  sorted.forEach((l, sortedIdx) => {
    result[l.idx] = taxasOrdenadas[sortedIdx];
  });
  return result;
}

function formatarTaxa(taxa: number | null): string {
  if (taxa === null) return "—";
  return taxa.toFixed(4) + "%";
}

export default function ModalValoresIndexador({ indexadorId, indexadorNome, indexadorSigla, onFechar }: Props) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/indexadores/${indexadorId}/valores`)
      .then((r) => r.json())
      .then((data: ValorAPI[]) => {
        if (Array.isArray(data) && data.length > 0) {
          // API returns DESC, reverse to ASC for display
          const novas = [...data].reverse().map((v) => ({
            mes: isoParaMes(v.mes),
            valorAcumulado: String(v.valor_acumulado),
          }));
          setLinhas(novas);
        }
      })
      .catch(() => setErro("Erro ao carregar valores existentes."))
      .finally(() => setCarregando(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const taxas = calcularTaxas(linhas);

  const atualizarLinha = (idx: number, campo: keyof Linha, valor: string) => {
    setLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));
  };

  const adicionarLinha = () => {
    setLinhas((prev) => [...prev, { mes: "", valorAcumulado: "" }]);
  };

  const removerLinha = (idx: number) => {
    setLinhas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const texto = e.clipboardData.getData("text");
    const linhasColadas = texto.split(/\r?\n/).filter((l) => l.trim());

    const novasLinhas: Linha[] = linhasColadas.map((linha) => {
      const partes = linha.split("\t");
      const mes = partes[0]?.trim() ?? "";
      const rawVal = partes[1]?.trim() ?? "";
      // Armazena o valor já normalizado para ponto decimal
      const val = rawVal ? String(parseBRNumber(rawVal)) : "";
      return { mes, valorAcumulado: val };
    });

    if (novasLinhas.length === 0) return;

    // Merge com linhas existentes: substituir se mesmo mês, senão adicionar
    setLinhas((prev) => {
      const mapa = new Map(prev.map((l) => [l.mes, l]));
      for (const nl of novasLinhas) {
        if (nl.mes) mapa.set(nl.mes, nl);
      }
      // Sort ASC by mes
      return Array.from(mapa.values()).sort((a, b) => a.mes.localeCompare(b.mes));
    });
  }, []);

  const copiarTudo = async () => {
    const texto = linhas.map((l) => `${l.mes}\t${l.valorAcumulado}`).join("\n");
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const salvar = async () => {
    const valoresParaSalvar = linhas
      .filter((l) => l.mes.trim() && l.valorAcumulado.trim())
      .map((l) => ({
        mes: mesParaISO(l.mes),
        valor_acumulado: parseBRNumber(l.valorAcumulado),
      }));

    if (valoresParaSalvar.length === 0) {
      setErro("Nenhum valor para salvar.");
      return;
    }

    setSalvando(true);
    setErro("");
    setSucesso(false);
    try {
      const res = await fetch(`/api/admin/indexadores/${indexadorId}/valores`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores: valoresParaSalvar }),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.error ?? "Erro ao salvar"); return; }
      setSucesso(true);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />

      {/* Painel */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[90vh]">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Valores do indexador</h2>
            <p className="text-xs text-gray-500 mt-0.5">{indexadorNome} · {indexadorSigla}</p>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dica */}
        <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex-shrink-0">
          <p className="text-xs text-blue-700">
            Cole dados do IPEADATA com{" "}
            <kbd className="px-1 py-0.5 bg-blue-100 rounded text-blue-800 font-mono text-[10px]">Ctrl+V</kbd>{" "}
            no formato <span className="font-mono">AAAA.MM&nbsp;&nbsp;valor</span> (separado por tab).
          </p>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto" onPaste={handlePaste}>
          {carregando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <table className="w-full border-collapse text-xs font-mono">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-center text-gray-600 font-semibold w-28 select-none">
                    Mês
                  </th>
                  <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-center text-gray-600 font-semibold">
                    Valor Acumulado
                  </th>
                  <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-center text-gray-500 font-semibold w-32 select-none">
                    Taxa Mensal %
                  </th>
                  <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 w-8 select-none" />
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs">
                      Nenhum valor cadastrado. Cole dados do IPEADATA ou clique em &ldquo;+ Adicionar linha&rdquo;.
                    </td>
                  </tr>
                )}
                {linhas.map((linha, idx) => (
                  <tr key={idx} className="group">
                    <td className="border border-gray-200 p-0">
                      <input
                        type="text"
                        inputMode="text"
                        placeholder="2025.01"
                        value={linha.mes}
                        onChange={(e) => atualizarLinha(idx, "mes", e.target.value)}
                        className="w-full px-2 py-[3px] bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 group-hover:bg-gray-50 tabular-nums"
                      />
                    </td>
                    <td className="border border-gray-200 p-0">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.0000"
                        value={linha.valorAcumulado}
                        onChange={(e) => atualizarLinha(idx, "valorAcumulado", e.target.value)}
                        className="w-full px-2 py-[3px] bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 group-hover:bg-gray-50 tabular-nums"
                      />
                    </td>
                    <td className="border border-gray-200 px-2 py-[3px] text-right text-gray-400 bg-gray-50 select-none tabular-nums">
                      {formatarTaxa(taxas[idx])}
                    </td>
                    <td className="border border-gray-200 p-0 text-center">
                      <button
                        onClick={() => removerLinha(idx)}
                        className="p-1 text-gray-300 hover:text-red-500 transition"
                        title="Remover linha"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Botão adicionar linha */}
        {!carregando && (
          <div className="px-5 py-2 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={adicionarLinha}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar linha
            </button>
          </div>
        )}

        {/* Rodapé */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-gray-200 space-y-2">
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          {sucesso && <p className="text-xs text-green-600">Valores salvos com sucesso!</p>}
          <div className="flex gap-2 justify-between">
            <button
              onClick={copiarTudo}
              disabled={carregando || linhas.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-40"
            >
              {copiado ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado ? "Copiado!" : "Copiar tudo"}
            </button>
            <div className="flex gap-2">
              <button
                onClick={onFechar}
                className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando || carregando}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded-lg transition"
              >
                {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Salvar tudo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
