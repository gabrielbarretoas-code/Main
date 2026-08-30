import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = ["/login", "/signup"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (req.auth && isPublic) {
    const dashboardUrl = new URL("/dashboard?entity=PERSONAL", req.nextUrl.origin);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Exclui rotas de auth, o webhook do WhatsApp (chamado pela própria Meta,
  // sem sessão — se autentica por assinatura própria, não por login),
  // assets internos do Next e qualquer arquivo estático de public/
  // (identificado por ter um "." no caminho, ex: logo.jpeg, manifest.json,
  // favicon.ico) — sem isso, pedir a própria logo sem estar logado cai no
  // redirecionamento pra /login em vez de servir a imagem.
  matcher: ["/((?!api/auth|api/whatsapp|_next/static|_next/image|.*\\..*).*)"],
};
