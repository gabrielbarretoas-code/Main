import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finanças",
  description: "Controle financeiro pessoal e comercial",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
