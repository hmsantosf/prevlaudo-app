import Link from "next/link";
import { FileText, Clock, CheckCircle, Users, ChevronRight, UserPlus } from "lucide-react";

interface Props {
  userName: string;
}

export default function Dashboard({ userName }: Props) {
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
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
          <UserPlus className="w-4 h-4" />
          Novo cliente
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">0</p>
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
      </div>

      {/* CTA novo processo */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">Iniciar novo processo</h3>
            <p className="text-blue-100 text-sm mt-1 max-w-xs">
              Cadastre um cliente e abra uma solicitação de revisão de benefício do INSS
            </p>
          </div>
          <FileText className="w-8 h-8 text-blue-200 flex-shrink-0" />
        </div>
        <Link
          href="/dashboard/processos/novo"
          className="mt-4 inline-flex bg-white text-blue-600 font-semibold text-sm px-5 py-2 rounded-lg hover:bg-blue-50 transition items-center gap-1"
        >
          Novo processo <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Lista de processos vazia */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Processos recentes</h2>
          <button className="text-sm text-blue-600 hover:underline">Ver todos</button>
        </div>
        <div className="p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhum processo aberto ainda.</p>
          <p className="text-gray-400 text-xs mt-1">
            Cadastre um cliente para começar.
          </p>
        </div>
      </div>
    </div>
  );
}
