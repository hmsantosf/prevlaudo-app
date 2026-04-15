"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";

type Cupom = {
  id: string;
  nome: string;
  desconto: number;
  tipo: "real" | "percentual";
  validade: string | null;
  ativo: boolean;
};

type FormState = {
  nome: string;
  desconto: string;
  tipo: "real" | "percentual";
  validade: string;
  ativo: boolean;
};

const FORM_VAZIO: FormState = {
  nome: "",
  desconto: "",
  tipo: "real",
  validade: "",
  ativo: true,
};

function formParaCupom(f: FormState) {
  return {
    nome: f.nome.trim(),
    desconto: parseInt(f.desconto) || 0,
    tipo: f.tipo,
    validade: f.validade || null,
    ativo: f.ativo,
  };
}

function formatDesconto(cupom: Cupom) {
  return cupom.tipo === "real"
    ? `R$ ${cupom.desconto}`
    : `${cupom.desconto}%`;
}

function formatValidade(v: string | null) {
  if (!v) return "—";
  const [ano, mes, dia] = v.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function TabelaCupons({ cuponsIniciais }: { cuponsIniciais: Cupom[] }) {
  const [cupons, setCupons] = useState<Cupom[]>(cuponsIniciais);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoForm, setNovoForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // ── Edição inline ──────────────────────────────────────────────

  const abrirEdicao = (c: Cupom) => {
    setEditandoId(c.id);
    setForm({
      nome: c.nome,
      desconto: String(c.desconto),
      tipo: c.tipo,
      validade: c.validade ?? "",
      ativo: c.ativo,
    });
    setErro("");
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setErro("");
  };

  const salvarEdicao = async (id: string) => {
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/admin/cupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formParaCupom(form)),
      });
      if (!res.ok) {
        const json = await res.json();
        setErro(json.error ?? "Erro ao salvar");
        return;
      }
      const atualizado: Cupom = await res.json();
      setCupons((prev) => prev.map((c) => (c.id === id ? atualizado : c)));
      setEditandoId(null);
    } finally {
      setSalvando(false);
    }
  };

  // ── Novo cupom ─────────────────────────────────────────────────

  const abrirNovo = () => {
    setNovoForm(FORM_VAZIO);
    setNovoAberto(true);
    setErro("");
  };

  const cancelarNovo = () => {
    setNovoAberto(false);
    setErro("");
  };

  const salvarNovo = async () => {
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/admin/cupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formParaCupom(novoForm)),
      });
      if (!res.ok) {
        const json = await res.json();
        setErro(json.error ?? "Erro ao criar cupom");
        return;
      }
      const criado: Cupom = await res.json();
      setCupons((prev) => [criado, ...prev]);
      setNovoAberto(false);
    } finally {
      setSalvando(false);
    }
  };

  // ── Exclusão ───────────────────────────────────────────────────

  const excluir = async (c: Cupom) => {
    if (!confirm(`Excluir o cupom "${c.nome}"? Esta ação não pode ser desfeita.`)) return;
    setErro("");
    const res = await fetch(`/api/admin/cupons/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      setErro(json.error ?? "Erro ao excluir");
      return;
    }
    setCupons((prev) => prev.filter((x) => x.id !== c.id));
  };

  // ── Campos de formulário reutilizáveis ─────────────────────────

  const CamposForm = ({
    f,
    onChange,
  }: {
    f: FormState;
    onChange: (patch: Partial<FormState>) => void;
  }) => (
    <>
      <td className="px-3 py-2">
        <input
          type="text"
          value={f.nome}
          onChange={(e) => onChange({ nome: e.target.value })}
          placeholder="Nome do cupom"
          maxLength={12}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          step={1}
          max={f.tipo === "percentual" ? 100 : 1000}
          value={f.desconto}
          onChange={(e) => onChange({ desconto: e.target.value })}
          placeholder="0"
          className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={f.tipo}
          onChange={(e) => onChange({ tipo: e.target.value as "real" | "percentual" })}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="real">Real (R$)</option>
          <option value="percentual">Percentual (%)</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          type="date"
          value={f.validade}
          onChange={(e) => onChange({ validade: e.target.value })}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={f.ativo}
          onChange={(e) => onChange({ ativo: e.target.checked })}
          className="w-4 h-4 accent-blue-600"
        />
      </td>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Novo cupom
        </button>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{erro}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Nome</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Desconto</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Tipo</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Validade</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide text-center">Ativo</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Linha de novo cupom */}
            {novoAberto && (
              <tr className="bg-blue-50">
                <CamposForm f={novoForm} onChange={(p) => setNovoForm((v) => ({ ...v, ...p }))} />
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={salvarNovo}
                      disabled={salvando}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Salvar
                    </button>
                    <button
                      onClick={cancelarNovo}
                      disabled={salvando}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancelar
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Linhas existentes */}
            {cupons.length === 0 && !novoAberto && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                  Nenhum cupom cadastrado.
                </td>
              </tr>
            )}

            {cupons.map((c) =>
              editandoId === c.id ? (
                <tr key={c.id} className="bg-blue-50">
                  <CamposForm f={form} onChange={(p) => setForm((v) => ({ ...v, ...p }))} />
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => salvarEdicao(c.id)}
                        disabled={salvando}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Salvar
                      </button>
                      <button
                        onClick={cancelarEdicao}
                        disabled={salvando}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">{c.nome}</td>
                  <td className="px-5 py-4 text-gray-700 tabular-nums">{formatDesconto(c)}</td>
                  <td className="px-5 py-4 text-gray-600">
                    {c.tipo === "real" ? "Real (R$)" : "Percentual (%)"}
                  </td>
                  <td className="px-5 py-4 text-gray-600 tabular-nums">{formatValidade(c.validade)}</td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        c.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {c.ativo ? "Sim" : "Não"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEdicao(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => excluir(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
