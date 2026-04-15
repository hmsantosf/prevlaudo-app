"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";

type Profile = {
  id: string;
  name: string;
  email: string;
  categoria: string;
  creditos: number;
};

type EditState = {
  categoria: "super" | "liper";
  creditos: number;
};

export default function TabelaUsuarios({ usuarios }: { usuarios: Profile[] }) {
  const [linhas, setLinhas] = useState<Profile[]>(usuarios);
  const [editando, setEditando] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState>({ categoria: "super", creditos: 0 });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const abrirEdicao = (u: Profile) => {
    setEditando(u.id);
    setEdit({
      categoria: u.categoria === "liper" ? "liper" : "super",
      creditos: u.creditos ?? 0,
    });
    setErro("");
  };

  const cancelar = () => {
    setEditando(null);
    setErro("");
  };

  const salvar = async (id: string) => {
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...edit }),
      });
      if (!res.ok) {
        const json = await res.json();
        setErro(json.error ?? "Erro ao salvar");
        return;
      }
      setLinhas((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...edit } : u))
      );
      setEditando(null);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
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
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Email</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Categoria</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Créditos</th>
              <th className="px-5 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {linhas.map((u) =>
              editando === u.id ? (
                <tr key={u.id} className="bg-blue-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <select
                      value={edit.categoria}
                      onChange={(e) =>
                        setEdit((v) => ({ ...v, categoria: e.target.value as "super" | "liper" }))
                      }
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="super">super</option>
                      <option value="liper">liper</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="number"
                      min={0}
                      value={edit.creditos}
                      onChange={(e) =>
                        setEdit((v) => ({ ...v, creditos: Math.max(0, parseInt(e.target.value) || 0) }))
                      }
                      className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => salvar(u.id)}
                        disabled={salvando}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Salvar
                      </button>
                      <button
                        onClick={cancelar}
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
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">{u.name}</td>
                  <td className="px-5 py-4 text-gray-600">{u.email}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        u.categoria === "liper"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {u.categoria ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-700 tabular-nums">{u.creditos ?? 0}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => abrirEdicao(u)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
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
