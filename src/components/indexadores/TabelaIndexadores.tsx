"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Check, X, Table, Loader2 } from "lucide-react";
import ModalValoresIndexador from "./ModalValoresIndexador";

type Indexador = {
  id: string;
  nome: string;
  sigla: string;
  ativo: boolean;
  casas_decimais: number;
  created_at: string;
};

type FormState = {
  nome: string;
  sigla: string;
  ativo: boolean;
  casas_decimais: number;
};

const FORM_VAZIO: FormState = { nome: "", sigla: "", ativo: true, casas_decimais: 2 };

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
          placeholder="Nome do indexador"
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
      <td className="px-3 py-2">
        <input
          type="number"
          value={f.casas_decimais}
          min={0}
          max={6}
          onChange={(e) => onChange({ casas_decimais: Math.min(6, Math.max(0, parseInt(e.target.value) || 0)) })}
          className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
        />
      </td>
    </>
  );
}

export default function TabelaIndexadores({ indexadoresIniciais }: { indexadoresIniciais: Indexador[] }) {
  const [indexadores, setIndexadores] = useState<Indexador[]>(indexadoresIniciais);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoForm, setNovoForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [indexadorValores, setIndexadorValores] = useState<Indexador | null>(null);

  const abrirEdicao = (ix: Indexador) => {
    setEditandoId(ix.id);
    setForm({ nome: ix.nome, sigla: ix.sigla, ativo: ix.ativo, casas_decimais: ix.casas_decimais });
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
      const res = await fetch(`/api/admin/indexadores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.error ?? "Erro ao salvar"); return; }
      setIndexadores((prev) => prev.map((ix) => (ix.id === id ? (json as Indexador) : ix)));
      setEditandoId(null);
    } finally {
      setSalvando(false);
    }
  };

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
      const res = await fetch("/api/admin/indexadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoForm),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.error ?? "Erro ao criar indexador"); return; }
      setIndexadores((prev) => [json as Indexador, ...prev]);
      setNovoAberto(false);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (ix: Indexador) => {
    if (!confirm(`Excluir o indexador "${ix.nome}"? Esta ação não pode ser desfeita.`)) return;
    setErro("");
    const res = await fetch(`/api/admin/indexadores/${ix.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      setErro(json.error ?? "Erro ao excluir");
      return;
    }
    setIndexadores((prev) => prev.filter((x) => x.id !== ix.id));
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
      {indexadorValores && (
        <ModalValoresIndexador
          indexadorId={indexadorValores.id}
          indexadorNome={indexadorValores.nome}
          indexadorSigla={indexadorValores.sigla}
          casasDecimais={indexadorValores.casas_decimais}
          onFechar={() => setIndexadorValores(null)}
        />
      )}

      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Novo indexador
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
                <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide text-center">Decimais</th>
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

              {indexadores.length === 0 && !novoAberto && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                    Nenhum indexador cadastrado.
                  </td>
                </tr>
              )}

              {indexadores.map((ix) =>
                editandoId === ix.id ? (
                  <tr key={ix.id} className="bg-blue-50">
                    <CamposForm f={form} onChange={(p) => setForm((v) => ({ ...v, ...p }))} />
                    <BotoesForm onSalvar={() => salvarEdicao(ix.id)} onCancelar={cancelarEdicao} />
                  </tr>
                ) : (
                  <tr key={ix.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900">{ix.nome}</td>
                    <td className="px-5 py-4 font-mono text-gray-700">{ix.sigla}</td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          ix.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {ix.ativo ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-gray-700 font-mono text-sm">
                      {ix.casas_decimais}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIndexadorValores(ix)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition"
                        >
                          <Table className="w-3.5 h-3.5" />
                          Preencher valores
                        </button>
                        <button
                          onClick={() => abrirEdicao(ix)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => excluir(ix)}
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
