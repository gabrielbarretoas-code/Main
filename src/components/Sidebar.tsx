"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  FileText,
  Repeat,
  HandCoins,
  CreditCard,
  Home,
  BarChart3,
  Bell,
  Menu,
  X,
  Settings,
} from "lucide-react";
import { logout } from "@/app/(app)/actions";

const MAIN_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Lançamentos", icon: ArrowLeftRight },
  { href: "/reconciliation", label: "Conciliação", icon: ClipboardCheck },
  { href: "/documents", label: "Documentos Fiscais", icon: FileText },
  { href: "/categories", label: "Categorias", icon: Tags },
  { href: "/budget", label: "Orçamento", icon: Target },
  { href: "/recurring", label: "Recorrências", icon: Repeat },
  { href: "/loans", label: "Empréstimos", icon: HandCoins },
];

const SECONDARY_LINKS = [
  { href: "/accounts", label: "Contas Bancárias", icon: Wallet },
  { href: "/costcenters", label: "Centros de Custo", icon: Building2 },
  { href: "/credit-cards", label: "Cartões de Crédito e Faturas", icon: CreditCard },
  { href: "/assets", label: "Imóveis e Automóveis", icon: Home },
  { href: "/analytics", label: "Análises", icon: BarChart3 },
  { href: "/reminders", label: "Lembretes", icon: Bell },
  { href: "/settings", label: "Configurações", icon: Settings },
];

type NavLinkDef = { href: string; label: string; icon: typeof LayoutDashboard };

function NavLink({
  link,
  active,
  withEntity,
  onClick,
}: {
  link: NavLinkDef;
  active: boolean;
  withEntity: (href: string) => string;
  onClick?: () => void;
}) {
  const Icon = link.icon;
  return (
    <Link
      href={withEntity(link.href)}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-brand-gold text-brand-navy" : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon size={18} strokeWidth={2} />
      {link.label}
    </Link>
  );
}

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  function withEntity(href: string) {
    return `${href}?entity=${entity}`;
  }

  const navContent = (onLinkClick?: () => void) => (
    <>
      <div className="px-3 py-4">
        <EntitySwitch entity={entity} pathname={pathname} />
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {MAIN_LINKS.map((link) => (
          <NavLink
            key={link.href}
            link={link}
            active={pathname.startsWith(link.href)}
            withEntity={withEntity}
            onClick={onLinkClick}
          />
        ))}

        <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Cadastros
        </p>
        {SECONDARY_LINKS.map((link) => (
          <NavLink
            key={link.href}
            link={link}
            active={pathname.startsWith(link.href)}
            withEntity={withEntity}
            onClick={onLinkClick}
          />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm text-white truncate">{userName}</p>
        </div>
        <form action={logout}>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white">
            <LogOut size={18} />
            Sair
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-brand-navy text-slate-300 h-screen sticky top-0">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
          <span className="bg-white rounded-md p-1 shrink-0">
            <Image src="/logo-oportuno-icon.png" alt="Oportuno" width={28} height={28} className="rounded-sm" />
          </span>
          <div className="min-w-0">
            <p className="text-white font-semibold leading-tight truncate">
              Oportuno <span className="text-brand-gold">Finanças</span>
            </p>
            <p className="text-xs text-slate-400 truncate">{organizationName}</p>
          </div>
        </div>
        {navContent()}
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-20 bg-brand-navy text-white px-4 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menu"
          className="p-1 -ml-1 text-white"
        >
          <Menu size={24} />
        </button>
        <span className="font-semibold flex items-center gap-2 flex-1 min-w-0 truncate">
          <span className="bg-white rounded-md p-0.5 shrink-0">
            <Image src="/logo-oportuno-icon.png" alt="Oportuno" width={20} height={20} className="rounded-sm" />
          </span>
          <span className="truncate">
            Oportuno <span className="text-brand-gold">Finanças</span>
          </span>
        </span>
        <EntitySwitch entity={entity} pathname={pathname} compact />
      </header>

      {/* Mobile side drawer */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setDrawerOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/50"
        />
      )}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-brand-navy text-slate-300 flex flex-col transition-transform duration-200 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
          <span className="bg-white rounded-md p-1 shrink-0">
            <Image src="/logo-oportuno-icon.png" alt="Oportuno" width={28} height={28} className="rounded-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold leading-tight truncate">
              Oportuno <span className="text-brand-gold">Finanças</span>
            </p>
            <p className="text-xs text-slate-400 truncate">{organizationName}</p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Fechar menu"
            className="p-1 text-slate-300"
          >
            <X size={22} />
          </button>
        </div>
        {navContent(() => setDrawerOpen(false))}
      </aside>
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
      className={`flex rounded-lg border border-white/10 overflow-hidden text-xs ${compact ? "" : "w-full"}`}
    >
      <Link
        href={`${pathname}?entity=PERSONAL`}
        className={`flex-1 text-center px-3 py-1.5 font-medium ${
          entity === "PERSONAL" ? "bg-brand-gold text-brand-navy" : "text-slate-400"
        }`}
      >
        Pessoal
      </Link>
      <Link
        href={`${pathname}?entity=BUSINESS`}
        className={`flex-1 text-center px-3 py-1.5 font-medium ${
          entity === "BUSINESS" ? "bg-brand-gold text-brand-navy" : "text-slate-400"
        }`}
      >
        Comercial
      </Link>
    </div>
  );
}
