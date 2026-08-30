"use client";

import { useTransition } from "react";
import { Clock } from "lucide-react";
import { registerInstallment } from "./actions";

export default function RegisterInstallmentButton({
  loanId,
  dateIso,
}: {
  loanId: string;
  dateIso: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => registerInstallment(loanId, dateIso))}
      className="flex items-center gap-1.5 text-xs bg-brand-navy text-white px-2.5 py-1.5 rounded-full font-medium hover:bg-brand-navy-light disabled:opacity-40 whitespace-nowrap"
    >
      <Clock size={13} />
      Registrar parcela
    </button>
  );
}
