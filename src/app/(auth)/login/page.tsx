import LoginForm from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | PrevLaudo",
};

export default function LoginPage() {
  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Bem-vindo de volta</h2>
      <p className="text-sm text-gray-500 mb-6">Entre com suas credenciais</p>
      <LoginForm />
    </>
  );
}
