import {
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  ChevronRight,
  UserPlus,
} from "lucide-react";

interface Props {
  userName: string;
}

export default function EscritorioDashboard({ userName }: Props) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{userName}</h1>
          <p className="text-gray-500 mt-1">Painel do escritório</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
          <UserPlus className="w-4 h-4" />
          Novo cliente
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-500">Clientes</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-500">Processos</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-500">Em análise</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-500">Concluídos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plano atual */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-6 h-6 text-indigo-200" />
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
              Plano Básico
            </span>
          </div>
          <h3 className="font-semibold text-lg">Expanda sua capacidade</h3>
          <p className="text-indigo-100 text-sm mt-1">
            Gerencie mais clientes e processos com planos avançados
          </p>
          <button className="mt-4 bg-white text-indigo-600 font-semibold text-sm px-5 py-2 rounded-lg hover:bg-indigo-50 transition flex items-center gap-1">
            Ver planos <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Atividade recente */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Clientes recentes</h2>
            <button className="text-sm text-blue-600 hover:underline">Ver todos</button>
          </div>
          <div className="p-10 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhum cliente cadastrado ainda.</p>
            <p className="text-gray-400 text-xs mt-1">
              Adicione seu primeiro cliente para começar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
