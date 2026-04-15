"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Coins,
  Plus,
  Minus,
  Tag,
  CheckCircle2,
  XCircle,
  ShoppingCart,
} from "lucide-react";

const VALOR_UNITARIO = 1000;

type Cupom = {
  id: string;
  nome: string;
  desconto: number;
  tipo: "real" | "percentual";
};

export default function ComprarCreditosPage() {
  const [quantidade, setQuantidade] = useState(1);
  const [codigoCupom, setCodigoCupom] = useState("");
  const [cupom, setCupom] = useState<Cupom | null>(null);
  const [erroCupom, setErroCupom] = useState("");
  const [validandoCupom, setValidandoCupom] = useState(false);

  // ── Quantidade ────────────────────────────────────────────────

  const alterar = (valor: number) => {
    setQuantidade(Math.min(100, Math.max(1, valor)));
  };

  // ── Cupom ─────────────────────────────────────────────────────

  const aplicarCupom = async () => {
    if (!codigoCupom.trim()) return;
    setValidandoCupom(true);
    setErroCupom("");
    setCupom(null);

    try {
      const res = await fetch("/api/cupons/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoCupom }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErroCupom(json.error ?? "Cupom inválido");
        return;
      }
      setCupom(json);
    } finally {
      setValidandoCupom(false);
    }
  };

  const removerCupom = () => {
    setCupom(null);
    setCodigoCupom("");
    setErroCupom("");
  };

  // ── Cálculo ───────────────────────────────────────────────────

  const subtotal = quantidade * VALOR_UNITARIO;

  const desconto = (() => {
    if (!cupom) return 0;
    if (cupom.tipo === "real") return cupom.desconto;
    return Math.round((subtotal * cupom.desconto) / 100);
  })();

  const total = Math.max(0, subtotal - desconto);

  // ── Formatação ────────────────────────────────────────────────

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const descontoLabel = cupom
    ? cupom.tipo === "real"
      ? `- R$ ${cupom.desconto.toLocaleString("pt-BR")}`
      : `- ${cupom.desconto}% (${fmt(desconto)})`
    : null;

  return (
    <div className="space-y-6 max-w-lg">
      {/* Voltar */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar ao dashboard
      </Link>

      {/* Título */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Coins className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comprar créditos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Cada crédito vale {fmt(VALOR_UNITARIO)}
          </p>
        </div>
      </div>

      {/* Card principal */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">

        {/* Seletor de quantidade */}
        <div className="p-6">
          <p className="text-sm font-medium text-gray-700 mb-4">Quantidade de créditos</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => alterar(quantidade - 1)}
              disabled={quantidade <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              min={1}
              max={100}
              value={quantidade}
              onChange={(e) => alterar(parseInt(e.target.value) || 1)}
              className="w-20 text-center text-xl font-bold text-gray-900 border border-gray-300 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => alterar(quantidade + 1)}
              disabled={quantidade >= 100}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500">crédito{quantidade !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Cupom */}
        <div className="p-6">
          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
            <Tag className="w-4 h-4" />
            Cupom de desconto
          </p>

          {cupom ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700">{cupom.nome}</p>
                  <p className="text-xs text-green-600">Cupom aplicado: {descontoLabel}</p>
                </div>
              </div>
              <button
                onClick={removerCupom}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codigoCupom}
                  onChange={(e) => {
                    setCodigoCupom(e.target.value.toUpperCase());
                    setErroCupom("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && aplicarCupom()}
                  placeholder="Digite o código"
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase placeholder:normal-case"
                />
                <button
                  onClick={aplicarCupom}
                  disabled={validandoCupom || !codigoCupom.trim()}
                  className="px-4 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {validandoCupom ? "..." : "Aplicar"}
                </button>
              </div>
              {erroCupom && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  {erroCupom}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="p-6 space-y-3">
          <p className="text-sm font-medium text-gray-700 mb-1">Resumo do pedido</p>

          <div className="flex justify-between text-sm text-gray-600">
            <span>
              {quantidade} crédito{quantidade !== 1 ? "s" : ""} × {fmt(VALOR_UNITARIO)}
            </span>
            <span className="tabular-nums">{fmt(subtotal)}</span>
          </div>

          {desconto > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-medium">
              <span>Desconto ({cupom?.nome})</span>
              <span className="tabular-nums">- {fmt(desconto)}</span>
            </div>
          )}

          <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
            <span className="text-base font-semibold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-green-600 tabular-nums">
              {fmt(total)}
            </span>
          </div>
        </div>

        {/* Botão finalizar */}
        <div className="p-6">
          <button
            onClick={() => alert("Integração com Asaas em breve!")}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Finalizar compra
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            O pagamento será processado de forma segura via Asaas.
          </p>
        </div>
      </div>
    </div>
  );
}
