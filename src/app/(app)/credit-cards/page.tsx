import { CreditCard } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export default function CreditCardsPage() {
  return (
    <ComingSoon
      icon={CreditCard}
      title="Cartões de Crédito e Faturas"
      description="Cadastre seus cartões e suba a fatura para conciliação, no mesmo formato do extrato bancário. Em breve."
    />
  );
}
