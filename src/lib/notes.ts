/**
 * The backend Project has a single free-text `notes` field. The UI splits it
 * into "Observações" + "Links de arquivos" using a stable delimiter so both
 * round-trip without data loss.
 */
const DELIM = "\n\n— Links —\n";

export function splitNotes(notes: string | null | undefined): { text: string; links: string } {
  if (!notes) return { text: "", links: "" };
  const idx = notes.indexOf(DELIM);
  if (idx === -1) return { text: notes, links: "" };
  return { text: notes.slice(0, idx), links: notes.slice(idx + DELIM.length) };
}

export function joinNotes(text: string, links: string): string | undefined {
  const t = text.trim();
  const l = links.trim();
  if (!t && !l) return undefined;
  if (!l) return t;
  return `${t}${DELIM}${l}`;
}

const URL_RE = /(https?:\/\/[^\s]+)/g;

export function extractLinks(notes: string | null | undefined): string[] {
  if (!notes) return [];
  return Array.from(new Set(notes.match(URL_RE) ?? []));
}
