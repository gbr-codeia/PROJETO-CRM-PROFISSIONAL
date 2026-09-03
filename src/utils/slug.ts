const COMBINING_MARKS = /\p{Diacritic}/gu;

/** Deterministic, URL-safe slug from an arbitrary label. */
export function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(COMBINING_MARKS, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "coluna"
  );
}

/** Ensure a slug is unique within a set of taken slugs by appending -2, -3, ... */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const slug = slugify(base);
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}
