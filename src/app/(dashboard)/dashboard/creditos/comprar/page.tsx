"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, Coins, Plus, Minus, Tag, CheckCircle2, XCircle,
  ShoppingCart, QrCode, Barcode, CreditCard, Copy, Check,
  ExternalLink, Loader2,
} from "lucide-react";

const VALOR_UNITARIO = 1000;

type MetodoPagamento = "PIX" | "BOLETO" | "CREDIT_CARD";

type Cupom = { id: string; nome: string; desconto: number; tipo_desconto: "real" | "percentual" };

type DadosCartao = {
  numero: string; nome: string; validade: string; cvv: string; cpf: string; cep: string;
};

type ResultadoPagamento =
  | { tipo: "PIX"; paymentId: string; qrCode: string; copiaCola: string; expiracao: string }
  | { tipo: "BOLETO"; paymentId: string; boletoUrl: string | null; invoiceUrl: string | null; nossoNumero: string | null }
  | { tipo: "CREDIT_CARD"; paymentId: string; status: string };

const METODOS: { id: MetodoPagamento; label: string; sub: string; icon: React.ReactNode }[] = [
  { id: "PIX", label: "PIX", sub: "Aprovação instantânea", icon: <QrCode className="w-5 h-5" /> },
  { id: "BOLETO", label: "Boleto", sub: "Vence em 3 dias úteis", icon: <Barcode className="w-5 h-5" /> },
  { id: "CREDIT_CARD", label: "Cartão de crédito", sub: "Aprovação imediata", icon: <CreditCard className="w-5 h-5" /> },
];

const CARTAO_VAZIO: DadosCartao = { numero: "", nome: "", validade: "", cvv: "", cpf: "", cep: "" };

function mascaraCartao(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function mascaraValidade(v: string) {
  return v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");
}
function mascaraCpf(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function mascaraCep(v: string) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

export default function ComprarCreditosPage() {
  const [quantidade, setQuantidade] = useState(1);
  const [codigoCupom, setCodigoCupom] = useState("");
  const [cupom, setCupom] = useState<Cupom | null>(null);
  const [erroCupom, setErroCupom] = useState("");
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [metodo, setMetodo] = useState<MetodoPagamento>("PIX");
  const [cartao, setCartao] = useState<DadosCartao>(CARTAO_VAZIO);
  const [processando, setProcessando] = useState(false);
  const [erroCheckout, setErroCheckout] = useState("");
  const [resultado, setResultado] = useState<ResultadoPagamento | null>(null);
  const [copiado, setCopiado] = useState(false);

  // ── Quantidade ─────────────────────────────────────────────────
  const alterar = (v: number) => setQuantidade(Math.min(100, Math.max(1, v)));

  // ── Cupom ──────────────────────────────────────────────────────
  const aplicarCupom = async () => {
    if (!codigoCupom.trim()) return;
    setValidandoCupom(true); setErroCupom(""); setCupom(null);
    try {
      const res = await fetch("/api/cupons/validar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoCupom }),
      });
      const json = await res.json();
      if (!res.ok) { setErroCupom(json.error ?? "Cupom inválido"); return; }
      setCupom(json);
    } finally { setValidandoCupom(false); }
  };

  const removerCupom = () => { setCupom(null); setCodigoCupom(""); setErroCupom(""); };

  // ── Cálculo ────────────────────────────────────────────────────
  const subtotal = quantidade * VALOR_UNITARIO;
  const desconto = !cupom ? 0
    : cupom.tipo_desconto === "real" ? cupom.desconto
    : Math.round((subtotal * cupom.desconto) / 100);
  const total = Math.max(0, subtotal - desconto);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ── Finalizar compra ───────────────────────────────────────────
  const finalizar = async () => {
    setProcessando(true); setErroCheckout("");
    try {
      const body: Record<string, unknown> = {
        quantidade, valorTotal: total,
        cupomId: cupom?.id ?? null,
        metodoPagamento: metodo,
      };
      if (metodo === "CREDIT_CARD") body.cartao = cartao;

      const res = await fetch("/api/pagamento/criar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setErroCheckout(json.error ?? "Erro ao processar pagamento"); return; }
      setResultado(json as ResultadoPagamento);
    } finally { setProcessando(false); }
  };

  // ── Copiar copia-e-cola ────────────────────────────────────────
  const copiar = async (texto: string) => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // ── Resultado ──────────────────────────────────────────────────
  if (resultado) {
    return (
      <div className="space-y-6 max-w-lg">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition">
          <ChevronLeft className="w-4 h-4" /> Voltar ao dashboard
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
          {resultado.tipo === "PIX" && (
            <>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Pague via PIX</h2>
                <p className="text-sm text-gray-500">Escaneie o QR code ou use o copia-e-cola</p>
              </div>
              {resultado.qrCode && (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${resultado.qrCode}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 border border-gray-200 rounded-xl"
                  />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Copia e cola</p>
                <div className="flex gap-2">
                  <input
                    readOnly value={resultado.copiaCola}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 font-mono truncate"
                  />
                  <button
                    onClick={() => copiar(resultado.copiaCola)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition"
                  >
                    {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiado ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-center text-gray-400">
                Os créditos serão adicionados automaticamente após a confirmação do pagamento.
              </p>
            </>
          )}

          {resultado.tipo === "BOLETO" && (
            <>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Barcode className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Boleto gerado</h2>
                <p className="text-sm text-gray-500">Pague até a data de vencimento</p>
              </div>
              {resultado.nossoNumero && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Linha digitável</p>
                  <div className="flex gap-2">
                    <input
                      readOnly value={resultado.nossoNumero}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 font-mono truncate"
                    />
                    <button
                      onClick={() => copiar(resultado.nossoNumero!)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition"
                    >
                      {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiado ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {resultado.boletoUrl && (
                  <a href={resultado.boletoUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition text-sm">
                    <ExternalLink className="w-4 h-4" /> Baixar boleto
                  </a>
                )}
                {resultado.invoiceUrl && (
                  <a href={resultado.invoiceUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl transition text-sm">
                    <ExternalLink className="w-4 h-4" /> Ver fatura
                  </a>
                )}
              </div>
            </>
          )}

          {resultado.tipo === "CREDIT_CARD" && (
            <>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {resultado.status === "CONFIRMED" ? "Pagamento confirmado!" : "Pagamento enviado"}
                </h2>
                <p className="text-sm text-gray-500">
                  {resultado.status === "CONFIRMED"
                    ? "Seus créditos serão adicionados em instantes."
                    : "Aguardando confirmação da operadora."}
                </p>
              </div>
            </>
          )}

          <Link href="/dashboard"
            className="block text-center text-sm text-blue-600 hover:underline">
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Formulário de checkout ─────────────────────────────────────
  return (
    <div className="space-y-6 max-w-lg">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition">
        <ChevronLeft className="w-4 h-4" /> Voltar ao dashboard
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Coins className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comprar créditos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cada crédito vale {fmt(VALOR_UNITARIO)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">

        {/* Quantidade */}
        <div className="p-6">
          <p className="text-sm font-medium text-gray-700 mb-4">Quantidade de créditos</p>
          <div className="flex items-center gap-4">
            <button onClick={() => alterar(quantidade - 1)} disabled={quantidade <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
              <Minus className="w-4 h-4" />
            </button>
            <input type="number" min={1} max={100} value={quantidade}
              onChange={(e) => alterar(parseInt(e.target.value) || 1)}
              className="w-20 text-center text-xl font-bold text-gray-900 border border-gray-300 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => alterar(quantidade + 1)} disabled={quantidade >= 100}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500">crédito{quantidade !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Método de pagamento */}
        <div className="p-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Método de pagamento</p>
          <div className="grid grid-cols-3 gap-2">
            {METODOS.map((m) => (
              <button key={m.id} onClick={() => setMetodo(m.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition ${
                  metodo === m.id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                }`}>
                {m.icon}
                <span className="text-xs font-semibold leading-tight">{m.label}</span>
                <span className="text-[10px] text-gray-400 leading-tight">{m.sub}</span>
              </button>
            ))}
          </div>

          {/* Campos do cartão */}
          {metodo === "CREDIT_CARD" && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Número do cartão</label>
                <input type="text" placeholder="0000 0000 0000 0000" value={cartao.numero}
                  onChange={(e) => setCartao((v) => ({ ...v, numero: mascaraCartao(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome no cartão</label>
                <input type="text" placeholder="NOME SOBRENOME" value={cartao.nome}
                  onChange={(e) => setCartao((v) => ({ ...v, nome: e.target.value.toUpperCase() }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Validade (MM/AA)</label>
                  <input type="text" placeholder="MM/AA" value={cartao.validade}
                    onChange={(e) => setCartao((v) => ({ ...v, validade: mascaraValidade(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CVV</label>
                  <input type="text" placeholder="000" value={cartao.cvv} maxLength={4}
                    onChange={(e) => setCartao((v) => ({ ...v, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CPF do titular</label>
                  <input type="text" placeholder="000.000.000-00" value={cartao.cpf}
                    onChange={(e) => setCartao((v) => ({ ...v, cpf: mascaraCpf(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CEP</label>
                  <input type="text" placeholder="00000-000" value={cartao.cep}
                    onChange={(e) => setCartao((v) => ({ ...v, cep: mascaraCep(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cupom */}
        <div className="p-6">
          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
            <Tag className="w-4 h-4" /> Cupom de desconto
          </p>
          {cupom ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700">{cupom.nome}</p>
                  <p className="text-xs text-green-600">
                    {cupom.tipo_desconto === "real" ? `- R$ ${cupom.desconto.toLocaleString("pt-BR")}` : `- ${cupom.desconto}% (${fmt(desconto)})`}
                  </p>
                </div>
              </div>
              <button onClick={removerCupom} className="text-gray-400 hover:text-gray-600 transition">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type="text" value={codigoCupom}
                  onChange={(e) => { setCodigoCupom(e.target.value.toUpperCase()); setErroCupom(""); }}
                  onKeyDown={(e) => e.key === "Enter" && aplicarCupom()}
                  placeholder="Digite o código"
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase placeholder:normal-case" />
                <button onClick={aplicarCupom} disabled={validandoCupom || !codigoCupom.trim()}
                  className="px-4 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed">
                  {validandoCupom ? "..." : "Aplicar"}
                </button>
              </div>
              {erroCupom && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> {erroCupom}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="p-6 space-y-3">
          <p className="text-sm font-medium text-gray-700 mb-1">Resumo do pedido</p>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{quantidade} crédito{quantidade !== 1 ? "s" : ""} × {fmt(VALOR_UNITARIO)}</span>
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
            <span className="text-2xl font-bold text-green-600 tabular-nums">{fmt(total)}</span>
          </div>
        </div>

        {/* Botão finalizar */}
        <div className="p-6 space-y-3">
          {erroCheckout && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{erroCheckout}</p>
            </div>
          )}
          <button onClick={finalizar} disabled={processando}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-xl transition text-sm">
            {processando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
              : <><ShoppingCart className="w-4 h-4" /> Finalizar compra</>}
          </button>
          <p className="text-xs text-gray-400 text-center">
            Pagamento processado com segurança via Asaas.
          </p>
        </div>
      </div>
    </div>
  );
}
