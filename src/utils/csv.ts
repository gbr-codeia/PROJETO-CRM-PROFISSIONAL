/**
 * Minimal, dependency-free CSV writer (RFC 4180).
 * The report/export architecture is designed so XLSX / PDF writers can be
 * added later behind the same `Exporter` shape (see src/services/report.service.ts).
 */
export type CsvValue = string | number | boolean | null | undefined | Date;

export interface CsvColumn<Row> {
  header: string;
  value: (row: Row) => CsvValue;
}

const UTF8_BOM = String.fromCharCode(0xfeff);

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);

  if (/["\n\r;,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<Row>(
  rows: Row[],
  columns: CsvColumn<Row>[],
  opts: { delimiter?: string; bom?: boolean } = {},
): string {
  const delimiter = opts.delimiter ?? ",";
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeCell(c.header)).join(delimiter));
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(c.value(row))).join(delimiter));
  }
  const body = lines.join("\r\n");
  return (opts.bom ? UTF8_BOM : "") + body;
}
