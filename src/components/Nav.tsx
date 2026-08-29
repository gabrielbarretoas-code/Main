"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Lançamentos" },
  { href: "/budget", label: "Orçamento" },
  { href: "/categories", label: "Categorias" },
  { href: "/accounts", label: "Contas" },
];

export default function Nav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const entity = searchParams.get("entity") === "BUSINESS" ? "BUSINESS" : "PERSONAL";

  function withEntity(href: string, e: string) {
    return `${href}?entity=${e}`;
  }

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-6 flex-wrap">
          <span className="font-semibold text-lg text-indigo-600">
            💰 Finanças
          </span>
          <nav className="flex gap-1 flex-wrap">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={withEntity(link.href, entity)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex rounded-md border border-slate-300 overflow-hidden text-sm">
          <Link
            href={withEntity(pathname, "PERSONAL")}
            className={`px-3 py-1.5 font-medium ${
              entity === "PERSONAL"
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Pessoal
          </Link>
          <Link
            href={withEntity(pathname, "BUSINESS")}
            className={`px-3 py-1.5 font-medium ${
              entity === "BUSINESS"
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Comercial
          </Link>
        </div>
      </div>
    </header>
  );
}
