"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type SignupState } from "./actions";

const initialState: SignupState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-950/20 p-8">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Criar conta</h1>
      <p className="text-sm text-slate-500 mb-6">
        14 dias grátis, sem cartão de crédito.
      </p>

      <form action={formAction} className="space-y-4">
        <Field label="Nome da empresa / você">
          <input
            name="organizationName"
            required
            placeholder="Ex: Padaria do João, ou seu nome"
            className="input"
          />
        </Field>
        <Field label="Seu nome">
          <input name="name" required className="input" />
        </Field>
        <Field label="E-mail">
          <input name="email" type="email" required className="input" />
        </Field>
        <Field label="Senha">
          <input name="password" type="password" required minLength={6} className="input" />
        </Field>

        {state.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          disabled={pending}
          className="w-full bg-indigo-600 text-white rounded-lg py-2.5 font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Criando..." : "Criar conta"}
        </button>
      </form>

      <p className="text-sm text-slate-500 mt-6 text-center">
        Já tem conta?{" "}
        <Link href="/login" className="text-indigo-600 font-medium">
          Entrar
        </Link>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
