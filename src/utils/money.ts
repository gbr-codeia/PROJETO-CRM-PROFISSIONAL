import { Prisma } from "@prisma/client";

export type Decimalish = Prisma.Decimal | number | string;

/** Build a Prisma.Decimal from any numeric-ish input. */
export function toDecimal(value: Decimalish): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/** Convert a Prisma.Decimal (or number/string) to a plain JS number with 2-decimal precision. */
export function toNumber(value: Decimalish | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const d = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  return Number(d.toFixed(2));
}

/** Sum a list of decimal-ish values, returns Prisma.Decimal. */
export function sumDecimals(values: Decimalish[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (acc, v) => acc.plus(v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v)),
    new Prisma.Decimal(0),
  );
}

/** Round half-up to 2 decimals. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
