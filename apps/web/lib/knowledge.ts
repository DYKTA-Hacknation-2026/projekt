/** Helpers shared by the Centrum wiedzy pages and components. */

const PL_MAP: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
}

export function slugifyHeading(value: string): string {
  return value
    .toLocaleLowerCase("pl")
    .replace(/[ąćęłńóśźż]/g, (char) => PL_MAP[char] ?? char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function headingId(value: string, index: number): string {
  const slug = slugifyHeading(value)
  return slug.length > 0 ? `${slug}-${index}` : `sekcja-${index}`
}

export function readingLabel(minutes: number): string {
  return `${minutes} min czytania`
}
