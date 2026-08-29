"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Tags,
  Wallet,
  LogOut,
  ClipboardCheck,
  Building2,
} from "lucide-react";
import { logout } from "@/app/(app)/actions";

const MAIN_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reconciliation", label: "Conciliação", icon: ClipboardCheck },
  { href: "/transactions", label: "Lançamentos", icon: ArrowLeftRight },
  { href: "/budget", label: "Orçamento", icon: Target },
  { href: "/categories", label: "Categorias", icon: Tags },
];

const SECONDARY_LINKS = [
  { href: "/accounts", label: "Contas", icon: Wallet },
  { href: "/costcenters", label: "Centros de Custo", icon: Building2 },
];

export default function Sidebar({
  organizationName,
  userName,
}: {
  organizationName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const entity = searchParams.get("entity") === "BUSINESS" ? "BUSINESS" : "PERSONAL";

  function withEntity(href: string) {
    return `${href}?entity=${entity}`;
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-slate-950 text-slate-300 h-screen sticky top-0">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-slate-800">
          <span className="text-xl">💰</span>
          <div className="min-w-0">
            <p className="text-white font-semibold leading-tight truncate">Finanças</p>
            <p className="text-xs text-slate-500 truncate">{organizationName}</p>
          </div>
        </div>

        <div className="px-3 py-4">
          <EntitySwitch entity={entity} pathname={pathname} />
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {MAIN_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={withEntity(link.href)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {link.label}
              </Link>
            );
          })}

          <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Cadastros
          </p>
          {SECONDARY_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={withEntity(link.href)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm text-white truncate">{userName}</p>
          </div>
          <form action={logout}>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-900 hover:text-white">
              <LogOut size={18} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-20 bg-slate-950 text-white px-4 py-3 flex items-center justify-between">
        <span className="font-semibold flex items-center gap-2">💰 Finanças</span>
        <EntitySwitch entity={entity} pathname={pathname} compact />
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-slate-950 border-t border-slate-800 flex justify-around py-1.5">
        {MAIN_LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={withEntity(link.href)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium ${
                active ? "text-indigo-400" : "text-slate-500"
              }`}
            >
              <Icon size={20} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function EntitySwitch({
  entity,
  pathname,
  compact,
}: {
  entity: string;
  pathname: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex rounded-lg border border-slate-800 overflow-hidden text-xs ${compact ? "" : "w-full"}`}
    >
      <Link
        href={`${pathname}?entity=PERSONAL`}
        className={`flex-1 text-center px-3 py-1.5 font-medium ${
          entity === "PERSONAL" ? "bg-indigo-600 text-white" : "text-slate-400"
        }`}
      >
        Pessoal
      </Link>
      <Link
        href={`${pathname}?entity=BUSINESS`}
        className={`flex-1 text-center px-3 py-1.5 font-medium ${
          entity === "BUSINESS" ? "bg-indigo-600 text-white" : "text-slate-400"
        }`}
      >
        Comercial
      </Link>
    </div>
  );
}
