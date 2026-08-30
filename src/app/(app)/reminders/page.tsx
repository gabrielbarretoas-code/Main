import { Bell } from "lucide-react";
import ComingSoon from "@/components/ComingSoon";

export default function RemindersPage() {
  return (
    <ComingSoon
      icon={Bell}
      title="Lembretes"
      description="Registre lembretes de tarefas, compromissos ou cobranças. Em breve."
    />
  );
}
