import LoginForm from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | prevAERUS",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; senha_alterada?: string }>;
}) {
  const params = await searchParams;
  const verified = params.verified === "1";
  const senhaAlterada = params.senha_alterada === "1";

  return (
    <>
      {verified && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 text-center">
            E-mail confirmado! Faça login para acessar.
          </p>
        </div>
      )}
      {senhaAlterada && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 text-center">
            Senha alterada com sucesso! Faça login com sua nova senha.
          </p>
        </div>
      )}
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Bem-vindo de volta</h2>
      <p className="text-sm text-gray-500 mb-6">Entre com suas credenciais</p>
      <LoginForm />
    </>
  );
}
