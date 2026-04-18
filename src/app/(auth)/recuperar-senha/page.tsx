"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/auth/recuperar-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    // Always show success regardless of whether email exists
    setLoading(false);
    setEnviado(true);
  };

  if (enviado) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Verifique seu e-mail</h2>
        <p className="text-sm text-gray-500">
          Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Recuperar senha</h2>
      <p className="text-sm text-gray-500 mb-6">
        Informe seu e-mail para receber o link de recuperação.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-mail
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="seu@email.com"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-lg transition"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Mail className="w-4 h-4" />
          )}
          {loading ? "Enviando..." : "Enviar link de recuperação"}
        </button>

        <p className="text-center text-sm text-gray-600">
          <Link href="/login" className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao login
          </Link>
        </p>
      </form>
    </>
  );
}
