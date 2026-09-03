/**
 * Date helpers. The app reasons about "reference months" (month + year)
 * for billing. All boundaries are computed in UTC to stay deterministic
 * across server timezones.
 */

export interface MonthRef {
  month: number; // 1-12
  year: number;
}

export function nowRef(date = new Date()): MonthRef {
  return { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
}

/** First instant of the given reference month (UTC). */
export function startOfMonth({ month, year }: MonthRef): Date {
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

/** First instant of the following month (exclusive upper bound). */
export function startOfNextMonth({ month, year }: MonthRef): Date {
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}

/** Last instant of the given reference month (UTC). */
export function endOfMonth(ref: MonthRef): Date {
  return new Date(startOfNextMonth(ref).getTime() - 1);
}

/**
 * Returns the last N reference months up to and including `end`, oldest first.
 * e.g. lastNMonths(6, {month: 9, year: 2026}) → Apr..Sep 2026
 */
export function lastNMonths(n: number, end = nowRef()): MonthRef[] {
  const out: MonthRef[] = [];
  let { month, year } = end;
  for (let i = 0; i < n; i++) {
    out.unshift({ month, year });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return out;
}

const MONTH_LABELS_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function monthLabel({ month, year }: MonthRef): string {
  return `${MONTH_LABELS_PT[month - 1]}/${String(year).slice(2)}`;
}

export function monthKey({ month, year }: MonthRef): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
