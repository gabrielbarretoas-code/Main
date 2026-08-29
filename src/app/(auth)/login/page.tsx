"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-950/20 p-8">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Entrar</h1>
      <p className="text-sm text-slate-500 mb-6">Acesse sua conta.</p>

      <form action={formAction} className="space-y-4">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">E-mail</span>
          <input name="email" type="email" required className="input" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Senha</span>
          <input name="password" type="password" required className="input" />
        </label>

        {state.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          disabled={pending}
          className="w-full bg-indigo-600 text-white rounded-lg py-2.5 font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="text-sm text-slate-500 mt-6 text-center">
        Ainda não tem conta?{" "}
        <Link href="/signup" className="text-indigo-600 font-medium">
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}
