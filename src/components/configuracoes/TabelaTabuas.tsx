"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";

type Tabua = {
  id: string;
  nome: string;
  sigla: string;
  ativo: boolean;
  created_at: string;
};

type FormState = {
  nome: string;
  sigla: string;
  ativo: boolean;
};

const FORM_VAZIO: FormState = { nome: "", sigla: "", ativo: true };

interface CamposFormProps {
  f: FormState;
  onChange: (patch: Partial<FormState>) => void;
}

function CamposForm({ f, onChange }: CamposFormProps) {
  return (
    <>
      <td className="px-3 py-2">
        <input
          type="text"
          value={f.nome}
          onChange={(e) => onChange({ nome: e.target.value })}
          placeholder="Nome da tábua"
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={f.sigla}
          onChange={(e) => onChange({ sigla: e.target.value.toUpperCase().slice(0, 10) })}
          placeholder="SIGLA"
          maxLength={10}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
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
}

export default function TabelaTabuas({ tabuasIniciais }: { tabuasIniciais: Tabua[] }) {
  const [tabuas, setTabuas] = useState<Tabua[]>(tabuasIniciais);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoForm, setNovoForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // ── Edição inline ────────────────────────────────────────────────

  const abrirEdicao = (t: Tabua) => {
    setEditandoId(t.id);
    setForm({ nome: t.nome, sigla: t.sigla, ativo: t.ativo });
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
      const res = await fetch(`/api/admin/tabuas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.error ?? "Erro ao salvar"); return; }
      setTabuas((prev) => prev.map((t) => (t.id === id ? (json as Tabua) : t)));
      setEditandoId(null);
    } finally {
      setSalvando(false);
    }
  };

  // ── Nova tábua ───────────────────────────────────────────────────

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
      const res = await fetch("/api/admin/tabuas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoForm),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.error ?? "Erro ao criar tábua"); return; }
      setTabuas((prev) => [json as Tabua, ...prev]);
      setNovoAberto(false);
    } finally {
      setSalvando(false);
    }
  };

  // ── Exclusão ─────────────────────────────────────────────────────

  const excluir = async (t: Tabua) => {
    if (!confirm(`Excluir a tábua "${t.nome}"? Esta ação não pode ser desfeita.`)) return;
    setErro("");
    const res = await fetch(`/api/admin/tabuas/${t.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      setErro(json.error ?? "Erro ao excluir");
      return;
    }
    setTabuas((prev) => prev.filter((x) => x.id !== t.id));
  };

  const BotoesForm = ({ onSalvar, onCancelar }: { onSalvar: () => void; onCancelar: () => void }) => (
    <td className="px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          onClick={onSalvar}
          disabled={salvando}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          Salvar
        </button>
        <button
          onClick={onCancelar}
          disabled={salvando}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
          Cancelar
        </button>
      </div>
    </td>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Nova tábua
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
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Sigla</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide text-center">Ativo</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">

            {novoAberto && (
              <tr className="bg-blue-50">
                <CamposForm f={novoForm} onChange={(p) => setNovoForm((v) => ({ ...v, ...p }))} />
                <BotoesForm onSalvar={salvarNovo} onCancelar={cancelarNovo} />
              </tr>
            )}

            {tabuas.length === 0 && !novoAberto && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">
                  Nenhuma tábua cadastrada.
                </td>
              </tr>
            )}

            {tabuas.map((t) =>
              editandoId === t.id ? (
                <tr key={t.id} className="bg-blue-50">
                  <CamposForm f={form} onChange={(p) => setForm((v) => ({ ...v, ...p }))} />
                  <BotoesForm onSalvar={() => salvarEdicao(t.id)} onCancelar={cancelarEdicao} />
                </tr>
              ) : (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">{t.nome}</td>
                  <td className="px-5 py-4 font-mono text-gray-700">{t.sigla}</td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        t.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {t.ativo ? "Sim" : "Não"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEdicao(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => excluir(t)}
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
