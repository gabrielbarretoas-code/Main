import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { requireOrganizationId } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { createReminder, toggleReminderDone, deleteReminder } from "./actions";

export const dynamic = "force-dynamic";

export default async function RemindersPage({
  searchParams,
}: PageProps<"/reminders">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const reminders = await prisma.reminder.findMany({
    where: { organizationId, entity },
    orderBy: [{ done: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  const pending = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);
  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Lembretes — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
        </h1>
        <p className="text-sm text-slate-500">
          Registre lembretes de tarefas, compromissos ou cobranças.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-medium mb-3">Novo lembrete</h2>
        <form action={createReminder} className="flex flex-wrap gap-3 items-end">
          <input type="hidden" name="entity" value={entity} />
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-500 mb-1">Título</label>
            <input name="title" required placeholder="Ex: Cobrar João pelo aluguel" className="input w-full" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Data (opcional)</label>
            <input name="dueDate" type="date" className="input" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-500 mb-1">Observação (opcional)</label>
            <input name="note" className="input w-full" />
          </div>
          <button className="bg-brand-navy text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-brand-navy-light">
            Adicionar
          </button>
        </form>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Pendentes ({pending.length})</h2>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {pending.length === 0 && (
            <div className="p-8 flex flex-col items-center text-center gap-2">
              <span className="w-12 h-12 rounded-full bg-brand-gold-light text-brand-navy flex items-center justify-center">
                <Bell size={20} />
              </span>
              <p className="text-sm text-slate-500">Nenhum lembrete pendente.</p>
            </div>
          )}
          {pending.map((r) => {
            const overdue = r.dueDate && r.dueDate < now;
            return (
              <div key={r.id} className="flex items-center gap-3 p-3.5">
                <form action={toggleReminderDone.bind(null, r.id, true)}>
                  <button
                    type="submit"
                    className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-brand-navy shrink-0"
                    title="Marcar como concluído"
                  />
                </form>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">{r.title}</p>
                  {r.note && <p className="text-xs text-slate-400 truncate">{r.note}</p>}
                </div>
                {r.dueDate && (
                  <span className={`text-xs whitespace-nowrap ${overdue ? "text-red-600 font-medium" : "text-slate-400"}`}>
                    {overdue ? "Venceu em " : ""}
                    {formatDate(r.dueDate)}
                  </span>
                )}
                <form action={deleteReminder.bind(null, r.id)}>
                  <button className="text-xs text-red-500 hover:underline whitespace-nowrap">Remover</button>
                </form>
              </div>
            );
          })}
        </div>
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Concluídos ({done.length})</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {done.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3.5">
                <form action={toggleReminderDone.bind(null, r.id, false)}>
                  <button
                    type="submit"
                    className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 text-white text-[10px]"
                    title="Marcar como pendente"
                  >
                    ✓
                  </button>
                </form>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-400 line-through truncate">{r.title}</p>
                </div>
                <form action={deleteReminder.bind(null, r.id)}>
                  <button className="text-xs text-red-500 hover:underline whitespace-nowrap">Remover</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
