import CadastroForm from "@/components/auth/CadastroForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastro | PrevLaudo",
};

export default function CadastroPage() {
  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Criar conta</h2>
      <p className="text-sm text-gray-500 mb-6">Junte-se à plataforma PrevLaudo</p>
      <CadastroForm />
    </>
  );
}
