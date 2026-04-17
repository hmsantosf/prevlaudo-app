"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, Plus, Check, X, Table, Loader2 } from "lucide-react";

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

type ValorTabua = { idade: number; qx: number };

const FORM_VAZIO: FormState = { nome: "", sigla: "", ativo: true };

function valoresVazios(): ValorTabua[] {
  return Array.from({ length: 120 }, (_, i) => ({ idade: i, qx: 0 }));
}

// ── Campos de edição/criação ─────────────────────────────────────────────────

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

// ── Modal de valores ─────────────────────────────────────────────────────────

interface ModalValoresProps {
  tabua: Tabua;
  onFechar: () => void;
}

function ModalValores({ tabua, onFechar }: ModalValoresProps) {
  const [valores, setValores] = useState<ValorTabua[]>(valoresVazios);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  // Carregar valores existentes ao montar
  useEffect(() => {
    fetch(`/api/admin/tabuas/${tabua.id}/valores`)
      .then((r) => r.json())
      .then((data: ValorTabua[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setValores((prev) => {
            const mapa = new Map(data.map((v) => [v.idade, v.qx]));
            return prev.map((v) => ({ ...v, qx: mapa.get(v.idade) ?? v.qx }));
          });
        }
      })
      .catch(() => setErro("Erro ao carregar valores existentes."))
      .finally(() => setCarregando(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setQx = (idade: number, raw: string) => {
    const qx = Math.min(1, Math.max(0, parseFloat(raw) || 0));
    setValores((prev) => prev.map((v) => (v.idade === idade ? { ...v, qx } : v)));
  };

  const salvar = async () => {
    setSalvando(true);
    setErro("");
    setSucesso(false);
    try {
      const res = await fetch(`/api/admin/tabuas/${tabua.id}/valores`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores }),
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
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-lg max-h-[90vh]">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Valores da tábua</h2>
            <p className="text-sm text-gray-500 mt-0.5">{tabua.nome}</p>
          </div>
          <button
            onClick={onFechar}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto">
          {carregando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide text-left w-24">Idade</th>
                  <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide text-left">qx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {valores.map(({ idade, qx }) => (
                  <tr key={idade} className="hover:bg-gray-50">
                    <td className="px-5 py-2 text-gray-700 tabular-nums font-medium w-24">{idade}</td>
                    <td className="px-5 py-2">
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.000001}
                        value={qx}
                        onChange={(e) => setQx(idade, e.target.value)}
                        className="w-36 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 tabular-nums font-mono"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 space-y-3">
          {erro && (
            <p className="text-sm text-red-600">{erro}</p>
          )}
          {sucesso && (
            <p className="text-sm text-green-600">Valores salvos com sucesso!</p>
          )}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onFechar}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando || carregando}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded-lg transition"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar tudo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function TabelaTabuas({ tabuasIniciais }: { tabuasIniciais: Tabua[] }) {
  const [tabuas, setTabuas] = useState<Tabua[]>(tabuasIniciais);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoForm, setNovoForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [tabuaValores, setTabuaValores] = useState<Tabua | null>(null);

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
    <>
      {tabuaValores && (
        <ModalValores tabua={tabuaValores} onFechar={() => setTabuaValores(null)} />
      )}

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
                          onClick={() => setTabuaValores(t)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition"
                        >
                          <Table className="w-3.5 h-3.5" />
                          Preencher
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
    </>
  );
}
