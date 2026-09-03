import { format as fnsFormat, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const BRL_COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatBRL(value: number | null | undefined): string {
  return BRL.format(Number(value ?? 0));
}

export function formatBRLCompact(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return Math.abs(n) >= 10_000 ? BRL_COMPACT.format(n) : BRL.format(n);
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR").format(Number(value ?? 0));
}

export function formatPercent(value: number | null | undefined, withSign = true): string {
  const n = Number(value ?? 0);
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1).replace(".", ",")}%`;
}

function toDate(input: string | number | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : typeof input === "string" ? parseISO(input) : new Date(input);
  return isValid(d) ? d : null;
}

export function formatDate(input: string | number | Date | null | undefined, pattern = "dd MMM yyyy"): string {
  const d = toDate(input);
  return d ? fnsFormat(d, pattern, { locale: ptBR }) : "—";
}

export function formatDateShort(input: string | number | Date | null | undefined): string {
  const d = toDate(input);
  return d ? fnsFormat(d, "dd/MM/yyyy", { locale: ptBR }) : "—";
}

export function formatRelative(input: string | number | Date | null | undefined): string {
  const d = toDate(input);
  return d ? formatDistanceToNow(d, { locale: ptBR, addSuffix: true }) : "—";
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function monthName(month: number): string {
  return MONTHS_PT[Math.min(11, Math.max(0, month - 1))];
}

export function monthLabel(month: number, year: number): string {
  return `${monthName(month)} de ${year}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "");
}

/** Digits-only phone for wa.me links. */
export function waLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}
