"use client";

import { Calculator } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  processoId: string;
}

export default function CalcularButton({ processoId }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/dashboard/processos/${processoId}/calcular`)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
    >
      <Calculator className="w-3.5 h-3.5" />
      Calcular
    </button>
  );
}
