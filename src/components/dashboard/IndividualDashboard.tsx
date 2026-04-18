"use client";

import Link from "next/link";
import { Clock, CheckCircle, Users, ChevronRight, UserPlus, FolderOpen, Coins } from "lucide-react";

type ClienteRecente = {
  id: string;
  name: string;
  cpf: string | null;
  data_relatorio: string | null;
  created_at: string;
};

interface Props {
  userName: string;
  clientesRecentes: ClienteRecente[];
  creditos: number;
  totalClientes: number;
}

export default function Dashboard({ userName, clientesRecentes, creditos, totalClientes }: Props) {
  const firstName = userName.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {firstName}!
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie seus clientes e processos de revisão previdenciária
          </p>
        </div>
        <Link
          href="/dashboard/creditos/comprar"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          <Coins className="w-4 h-4" />
          Comprar créditos
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalClientes}</p>
            <p className="text-sm text-gray-500">Clientes</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-500">Em análise</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-500">Concluídos</p>
          </div>
        </div>

        <Link
          href="/dashboard/creditos/historico"
          className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:border-amber-300 hover:shadow-sm transition"
        >
          <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
            <Coins className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{creditos}</p>
            <p className="text-sm text-gray-500">Créditos disponíveis</p>
          </div>
        </Link>
      </div>

      {/* CTA novo cliente */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">Criar novo cliente</h3>
            <p className="text-blue-100 text-sm mt-1 max-w-xs">
              Cadastre um novo cliente para iniciar a revisão do benefício
            </p>
          </div>
          <UserPlus className="w-8 h-8 text-blue-200 flex-shrink-0" />
        </div>
        <Link
          href="/dashboard/processos/novo"
          className="mt-4 inline-flex bg-white text-blue-600 font-semibold text-sm px-5 py-2 rounded-lg hover:bg-blue-50 transition items-center gap-1"
        >
          Novo cliente <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Clientes recentes */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Clientes recentes</h2>
          <Link href="/dashboard/clientes" className="text-sm text-blue-600 hover:underline">
            Ver todos
          </Link>
        </div>

        {clientesRecentes.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhum cliente cadastrado ainda.</p>
            <p className="text-gray-400 text-xs mt-1">
              Cadastre um cliente para começar.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {clientesRecentes.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  {c.cpf && (
                    <p className="text-xs text-gray-400 mt-0.5">{c.cpf}</p>
                  )}
                </div>
                <Link
                  href={`/dashboard/clientes/${c.id}/processos`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Processos
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
