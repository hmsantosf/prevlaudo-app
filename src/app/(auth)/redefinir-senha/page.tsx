"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, KeyRound, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Estado = "carregando" | "pronto" | "salvando" | "sucesso" | "token_invalido";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("carregando");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const tokenHash = searchParams.get("token_hash");
    const type = hashParams.get("type") || searchParams.get("type");

    if (accessToken && refreshToken && type === "recovery") {
      // Formato 1: hash com access_token
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setEstado("token_invalido");
          else setEstado("pronto");
        });
    } else if (tokenHash && type === "recovery") {
      // Formato 2: token_hash via query param
      console.log("[redefinir-senha] token_hash:", tokenHash, "type:", type);
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ error }) => {
          if (error) {
            console.error("[redefinir-senha] verifyOtp error:", error.message);
            setEstado("token_invalido");
          } else {
            setEstado("pronto");
          }
        });
    } else {
      setEstado("token_invalido");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (senha.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não conferem.");
      return;
    }

    setEstado("salvando");

    const { error } = await supabase.auth.updateUser({ password: senha });

    if (error) {
      console.error("[redefinir-senha] Erro ao atualizar senha:", error.message);
      setErro("Não foi possível atualizar a senha. Solicite um novo link de recuperação.");
      setEstado("pronto");
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?senha_alterada=1");
  };

  if (estado === "carregando") {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">Validando link...</p>
      </div>
    );
  }

  if (estado === "token_invalido") {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Link inválido ou expirado</h2>
        <p className="text-sm text-gray-500">
          Este link de recuperação não é mais válido. Solicite um novo.
        </p>
        <Link
          href="/recuperar-senha"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Criar nova senha</h2>
      <p className="text-sm text-gray-500 mb-6">Escolha uma senha com pelo menos 8 caracteres.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
          <div className="relative">
            <input
              type={mostrarSenha ? "text" : "password"}
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
          <div className="relative">
            <input
              type={mostrarConfirmar ? "text" : "password"}
              required
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setMostrarConfirmar((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {mostrarConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {erro && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{erro}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={estado === "salvando"}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-lg transition"
        >
          {estado === "salvando" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          {estado === "salvando" ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </>
  );
}
