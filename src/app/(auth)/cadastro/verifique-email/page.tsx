import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verifique seu e-mail | prevAERUS",
};

export default function VerifiqueEmailPage() {
  return (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-2">
        <svg
          className="w-7 h-7 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-gray-900">
        Verifique seu e-mail
      </h2>

      <p className="text-sm text-gray-600">
        Enviamos um link de confirmação para o seu e-mail.
        <br />
        Clique no link para ativar sua conta.
      </p>

      <p className="text-xs text-gray-400">
        Não recebeu? Verifique a pasta de spam.
      </p>

      <Link
        href="/login"
        className="block text-sm text-blue-600 hover:underline font-medium pt-2"
      >
        Voltar para o login
      </Link>
    </div>
  );
}
