"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function ExcluirClienteButton({
  clienteId,
  clienteNome,
}: {
  clienteId: string;
  clienteNome: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExcluir = async () => {
    const confirmado = window.confirm(
      `Tem certeza que deseja excluir "${clienteNome}" e todos os seus processos?`
    );
    if (!confirmado) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error ?? "Erro ao excluir cliente");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExcluir}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition disabled:opacity-50"
    >
      <Trash2 className="w-3.5 h-3.5" />
      Excluir
    </button>
  );
}
