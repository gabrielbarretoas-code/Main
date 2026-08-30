import { Repeat } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export default function RecurringPage() {
  return (
    <ComingSoon
      icon={Repeat}
      title="Recorrências"
      description="Cadastre despesas e receitas recorrentes (aluguel, assinaturas, salário, mensalidades) para acompanhar contas a pagar e a receber previstas. Em breve."
    />
  );
}
