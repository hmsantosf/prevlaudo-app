"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  processoId: string;
  creditosDisponiveis: number;
  jaRevelado: boolean;
}

export default function TarjaDetalhes({ processoId, creditosDisponiveis, jaRevelado }: Props) {
  const [estado, setEstado] = useState<"tarja" | "confirmando" | "revelado" | "sem_creditos">(
    jaRevelado ? "revelado" : "tarja"
  );
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  if (estado === "revelado") return null;

  const handleClicar = () => {
    if (creditosDisponiveis < 1) {
      setEstado("sem_creditos");
      return;
    }
    setEstado("confirmando");
  };

  const handleConfirmar = async () => {
    setCarregando(true);
    setErro("");
    try {
      const res = await fetch(`/api/processos/${processoId}/revelar`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setErro(json.error ?? "Erro ao processar");
        setCarregando(false);
        return;
      }
      setEstado("revelado");
    } catch {
      setErro("Erro de conexão");
      setCarregando(false);
    }
  };

  if (estado === "sem_creditos") {
    return (
      <div className="absolute inset-0 bg-[#1a6b8a] bg-opacity-95 rounded-xl flex flex-col items-center justify-center gap-3 z-10">
        <p className="text-white font-semibold text-lg">Você não tem créditos disponíveis</p>
        <p className="text-blue-200 text-sm">Adquira créditos para ver os detalhes do cálculo</p>
        <a
          href="/dashboard/creditos/comprar"
          className="bg-white text-blue-700 font-semibold px-5 py-2 rounded-lg text-sm hover:bg-blue-50 transition"
        >
          Comprar créditos
        </a>
        <button onClick={() => setEstado("tarja")} className="text-blue-300 text-xs underline mt-1">
          Voltar
        </button>
      </div>
    );
  }

  if (estado === "confirmando") {
    return (
      <div className="absolute inset-0 bg-[#1a6b8a] bg-opacity-95 rounded-xl flex flex-col items-center justify-center gap-4 z-10">
        <p className="text-white font-semibold text-lg text-center px-6">
          Exibir os detalhes irá consumir <strong>1 crédito</strong>
        </p>
        <p className="text-blue-200 text-sm">
          Você tem {creditosDisponiveis} crédito{creditosDisponiveis !== 1 ? "s" : ""} disponível
          {creditosDisponiveis !== 1 ? "is" : ""}
        </p>
        {erro && <p className="text-red-300 text-sm">{erro}</p>}
        <div className="flex gap-3">
          <button
            onClick={handleConfirmar}
            disabled={carregando}
            className="bg-white text-blue-700 font-semibold px-6 py-2 rounded-lg text-sm hover:bg-blue-50 transition disabled:opacity-70 flex items-center gap-2"
          >
            {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar
          </button>
          <button
            onClick={() => setEstado("tarja")}
            disabled={carregando}
            className="border border-white text-white font-semibold px-6 py-2 rounded-lg text-sm hover:bg-white/10 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClicar}
      className="absolute inset-0 bg-[#1a6b8a] bg-opacity-90 rounded-xl flex items-center justify-center cursor-pointer hover:bg-opacity-95 transition z-10"
      style={{ fontFamily: "monospace" }}
    >
      <p className="text-white text-xl font-bold tracking-widest">Clique Aqui para ver os detalhes</p>
    </div>
  );
}
