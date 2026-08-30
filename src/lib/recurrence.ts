/** Último dia válido de um mês (ex: dia 31 num fevereiro vira o dia 28/29). */
function clampToMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/**
 * Datas em que uma recorrência mensal cai dentro de [from, to] (inclusive),
 * respeitando startDate/endDate. `dayOfMonth` além do tamanho do mês (ex: 31
 * em fevereiro) cai no último dia do mês.
 */
export function computeMonthlyOccurrences(
  recurring: { dayOfMonth: number; startDate: Date; endDate: Date | null },
  from: Date,
  to: Date
): Date[] {
  const occurrences: Date[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);

  while (cursor <= end) {
    const occurrence = clampToMonth(cursor.getFullYear(), cursor.getMonth(), recurring.dayOfMonth);
    if (
      occurrence >= from &&
      occurrence <= to &&
      occurrence >= startOfDay(recurring.startDate) &&
      (!recurring.endDate || occurrence <= endOfDay(recurring.endDate))
    ) {
      occurrences.push(occurrence);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return occurrences;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * Datas das N parcelas de um empréstimo, uma por mês, começando no mês
 * seguinte à data de início (a data de início em si é o lançamento do
 * principal, não uma parcela).
 */
export function computeLoanInstallments(loan: {
  startDate: Date;
  installmentCount: number;
  installmentDay: number;
}): Date[] {
  const dates: Date[] = [];
  const base = new Date(loan.startDate.getFullYear(), loan.startDate.getMonth(), 1);
  for (let i = 1; i <= loan.installmentCount; i++) {
    const month = new Date(base.getFullYear(), base.getMonth() + i, 1);
    dates.push(clampToMonth(month.getFullYear(), month.getMonth(), loan.installmentDay));
  }
  return dates;
}
