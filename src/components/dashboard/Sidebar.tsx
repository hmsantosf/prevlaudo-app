"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  UserCog,
  Tag,
  Table2,
  TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";

interface Props {
  userName: string;
  userEmail: string;
  userCategoria: string;
}

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
];

const configSubmenu = [
  { href: "/dashboard/configuracoes/usuarios", label: "Usuários", icon: UserCog },
  { href: "/dashboard/configuracoes/cupons", label: "Cupons", icon: Tag },
  { href: "/dashboard/configuracoes/tabuas", label: "Tábuas", icon: Table2 },
  { href: "/dashboard/configuracoes/indexadores", label: "Indexadores", icon: TrendingUp },
];

export default function Sidebar({ userName, userEmail, userCategoria }: Props) {
  const pathname = usePathname();
  const [configAberto, setConfigAberto] = useState(false);
  const isLiper = userCategoria === "liper";

  const configAtivo = pathname === "/dashboard/configuracoes" ||
    pathname.startsWith("/dashboard/configuracoes/");

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <img src="/prevaerus_logo_transparente.png" alt="prevAERUS" style={{ width: '80%', display: 'block', margin: '0 auto' }} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
              pathname === href
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        {/* Configurações */}
        {isLiper ? (
          <div>
            <button
              onClick={() => setConfigAberto((v) => !v)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                configAtivo
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">Configurações</span>
              {configAberto
                ? <ChevronDown className="w-4 h-4 flex-shrink-0" />
                : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
            </button>

            {configAberto && (
              <div className="mt-1 ml-4 space-y-1 border-l border-gray-200 pl-3">
                {configSubmenu.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition",
                      pathname === href.split("#")[0] && !href.includes("#")
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/dashboard/configuracoes"
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
              configAtivo
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            Configurações
          </Link>
        )}
      </nav>

      {/* User + logout */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 uppercase flex-shrink-0">
            {userName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-400 truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
