const DIACRITICS: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
  Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ó: "O", Ś: "S", Ź: "Z", Ż: "Z",
}

/**
 * Matching form: diacritics folded, upper case, single spaces, Unicode dashes
 * as "-". Lines are kept. Regexes in this package run on this form, so a
 * PDF with or without Polish glyphs (or with OCR noise in diacritics) matches.
 */
export function foldText(text: string): string {
  return text
    .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (char) => DIACRITICS[char] ?? char)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‐-―−]/g, "-")
    .toUpperCase()
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
}

/** AcroForm names: "topmostSubform[0].Page1[0].Podstawa_Wymiaru[0]" → "PODSTAWAWYMIARU". */
export function foldFieldName(name: string): string {
  const last = name.split(".").pop() ?? name
  return foldText(last.replace(/\[\d+\]/g, "")).replace(/[^A-Z0-9]/g, "")
}
