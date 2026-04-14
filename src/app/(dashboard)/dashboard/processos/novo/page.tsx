import NovoProcessoWizard from "@/components/processos/NovoProcessoWizard";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Novo Processo | PrevLaudo",
};

export default function NovoProcessoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar ao dashboard
        </Link>
      </div>

      <NovoProcessoWizard />
    </div>
  );
}
