"use client";

import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Plus, Check, X, Table, Loader2, Copy } from "lucide-react";

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
const N_IDADES = 120;

function valoresVazios(): ValorTabua[] {
  return Array.from({ length: N_IDADES }, (_, i) => ({ idade: i, qx: 0 }));
}

function rawVazios(): string[] {
  return Array(N_IDADES).fill("0");
}

function parseQx(s: string): number {
  const v = parseFloat(s.trim().replace(",", "."));
  return isNaN(v) ? 0 : Math.min(1, Math.max(0, v));
}

// ── Campos de edição/criação da tábua ────────────────────────────────────────

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

// ── Modal de valores (grid estilo Excel) ─────────────────────────────────────

interface ModalValoresProps {
  tabua: Tabua;
  onFechar: () => void;
}

function ModalValores({ tabua, onFechar }: ModalValoresProps) {
  // valores numéricos (fonte da verdade para salvar)
  const [valores, setValores] = useState<ValorTabua[]>(valoresVazios);
  // raw strings para display nos inputs (evita reset durante digitação)
  const [raw, setRaw] = useState<string[]>(rawVazios);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Carregar valores existentes ao montar
  useEffect(() => {
    fetch(`/api/admin/tabuas/${tabua.id}/valores`)
      .then((r) => r.json())
      .then((data: ValorTabua[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapa = new Map(data.map((v) => [v.idade, v.qx]));
          const novosValores = valoresVazios().map((v) => ({
            ...v,
            qx: mapa.get(v.idade) ?? 0,
          }));
          setValores(novosValores);
          setRaw(novosValores.map(({ qx }) => (qx === 0 ? "0" : String(qx))));
        }
      })
      .catch(() => setErro("Erro ao carregar valores existentes."))
      .finally(() => setCarregando(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza o raw string durante digitação
  const handleRawChange = (idx: number, s: string) => {
    setRaw((prev) => {
      const next = [...prev];
      next[idx] = s;
      return next;
    });
  };

  // Commita o valor numérico ao sair da célula
  const handleBlur = (idx: number) => {
    const qx = parseQx(raw[idx]);
    setValores((prev) => prev.map((v) => (v.idade === idx ? { ...v, qx } : v)));
    // Normaliza o display
    setRaw((prev) => {
      const next = [...prev];
      next[idx] = qx === 0 ? "0" : String(qx);
      return next;
    });
  };

  // ── Colar (Ctrl+V) ────────────────────────────────────────────────
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const texto = e.clipboardData.getData("text");
    const linhas = texto.split(/\r?\n/);

    const novosValores = [...valores];
    const novosRaw = [...raw];

    let idx = 0;
    for (const linha of linhas) {
      if (idx >= N_IDADES) break;
      const qx = parseQx(linha);
      novosValores[idx] = { ...novosValores[idx], qx };
      novosRaw[idx] = linha.trim() === "" ? "0" : linha.trim().replace(",", ".");
      idx++;
    }

    setValores(novosValores);
    setRaw(novosRaw);
  }, [valores, raw]);

  // ── Copiar tudo ───────────────────────────────────────────────────
  const copiarTudo = async () => {
    const texto = valores.map((v) => String(v.qx)).join("\n");
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // ── Salvar ────────────────────────────────────────────────────────
  const salvar = async () => {
    // Commita qualquer raw ainda não parseado
    const valoresFinais = valores.map((v, i) => ({
      ...v,
      qx: parseQx(raw[i]),
    }));

    setSalvando(true);
    setErro("");
    setSucesso(false);
    try {
      const res = await fetch(`/api/admin/tabuas/${tabua.id}/valores`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores: valoresFinais }),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.error ?? "Erro ao salvar"); return; }
      setValores(valoresFinais);
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
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-sm max-h-[90vh]">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Valores da tábua</h2>
            <p className="text-xs text-gray-500 mt-0.5">{tabua.nome} · {tabua.sigla}</p>
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
            Cole uma coluna do Excel com <kbd className="px-1 py-0.5 bg-blue-100 rounded text-blue-800 font-mono text-[10px]">Ctrl+V</kbd> para preencher todos os valores de uma vez.
          </p>
        </div>

        {/* Grid estilo planilha */}
        <div
          className="flex-1 overflow-y-auto"
          onPaste={handlePaste}
        >
          {carregando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <table className="w-full border-collapse text-xs font-mono">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-center text-gray-600 font-semibold w-14 select-none">
                    Idade
                  </th>
                  <th className="border border-gray-300 bg-gray-100 px-2 py-1.5 text-center text-gray-600 font-semibold">
                    qx
                  </th>
                </tr>
              </thead>
              <tbody>
                {valores.map(({ idade }, idx) => (
                  <tr key={idade} className="group">
                    <td className="border border-gray-200 px-2 py-0 text-center text-gray-400 bg-gray-50 select-none leading-none">
                      <span className="block py-[3px]">{idade}</span>
                    </td>
                    <td className="border border-gray-200 p-0">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={raw[idx]}
                        onChange={(e) => handleRawChange(idx, e.target.value)}
                        onBlur={() => handleBlur(idx)}
                        className="w-full px-2 py-[3px] bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 group-hover:bg-gray-50 focus:group-hover:bg-blue-50 tabular-nums"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-gray-200 space-y-2">
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          {sucesso && <p className="text-xs text-green-600">Valores salvos com sucesso!</p>}
          <div className="flex gap-2 justify-between">
            <button
              onClick={copiarTudo}
              disabled={carregando}
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
