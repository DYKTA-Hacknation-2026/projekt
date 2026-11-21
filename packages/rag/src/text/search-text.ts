/**
 * Deterministic text representations used for keyword search.
 *
 * PostgreSQL ships no Polish stemmer, so the index stores two app-computed
 * columns that are tokenised with the `simple` configuration:
 *
 *   search_text — lower-cased, diacritic-free words. Codes such as "Z-3a" or
 *                 "e-ZLA" keep their hyphen, so "Z-3" never matches "Z-3a".
 *   stem_text   — the same tokens reduced by a light Polish suffix stripper,
 *                 so "urlopu rodzicielskiego" matches "urlop rodzicielski".
 *
 * Index time and query time use exactly these functions.
 */

const POLISH_STOPWORDS = new Set([
  "a",
  "aby",
  "albo",
  "ale",
  "az",
  "bo",
  "by",
  "byc",
  "co",
  "czy",
  "dla",
  "dlaczego",
  "do",
  "gdzie",
  "gdy",
  "i",
  "ich",
  "ile",
  "jak",
  "jaki",
  "jaka",
  "jakie",
  "jest",
  "jestem",
  "kogo",
  "komu",
  "kto",
  "juz",
  "kiedy",
  "ktora",
  "ktore",
  "ktory",
  "lub",
  "ma",
  "mam",
  "mi",
  "mnie",
  "moge",
  "na",
  "nie",
  "o",
  "od",
  "oraz",
  "po",
  "pod",
  "przez",
  "przy",
  "sie",
  "sa",
  "tak",
  "takze",
  "ten",
  "to",
  "tym",
  "u",
  "w",
  "we",
  "z",
  "za",
  "ze",
  "zeby",
])

const SUFFIXES = [
  "iego",
  "iemu",
  "owie",
  "ami",
  "ach",
  "ego",
  "emu",
  "ich",
  "ych",
  "imi",
  "ymi",
  "iej",
  "owi",
  "om",
  "em",
  "ym",
  "im",
  "ej",
  "ia",
  "ie",
  "iu",
  "ow",
  "a",
  "e",
  "i",
  "o",
  "u",
  "y",
] as const

const MIN_STEM_LENGTH = 3
const STEM_PREFIX_LENGTH = 7

/**
 * Strips diacritics, including "ł", which NFD does not decompose. NFKD also
 * turns superscripts into digits, so "art. 182¹a" is searchable as "1821a",
 * the way it is usually typed and cited inline.
 */
export function foldDiacritics(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
}

/**
 * Lower-cased, diacritic-free text with only `[a-z0-9-]` tokens. A hyphen
 * survives only between two alphanumerics, so "Z-3a" stays one code.
 */
export function toSearchText(text: string): string {
  return foldDiacritics(text.toLocaleLowerCase("pl-PL"))
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[^a-z0-9-]+/g, " ")
    .replace(/(^|[^a-z0-9])-+|-+(?=[^a-z0-9]|$)/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim()
}

export function searchTokens(text: string): string[] {
  const normalized = toSearchText(text)
  return normalized ? normalized.split(" ") : []
}

export function isStopword(token: string): boolean {
  return POLISH_STOPWORDS.has(token)
}

/** Light, deterministic Polish stemmer (suffix stripping, no dictionary). */
export function polishStem(token: string): string {
  if (/[0-9-]/.test(token) || token.length <= MIN_STEM_LENGTH) return token

  let stem = token
  for (const suffix of SUFFIXES) {
    if (
      stem.endsWith(suffix) &&
      stem.length - suffix.length >= MIN_STEM_LENGTH
    ) {
      stem = stem.slice(0, -suffix.length)
      break
    }
  }

  // Mobile "e": zasiłek / zasiłku, wniosek / wniosku.
  if (/[^aeiouy]ek$/.test(stem) && stem.length > MIN_STEM_LENGTH + 1) {
    stem = `${stem.slice(0, -2)}k`
  }
  // Consonant alternation before -e/-ie: wymiar / wymiarze, poród / porodzie.
  if (stem.length > MIN_STEM_LENGTH + 1 && /(rz|dz)$/.test(stem)) {
    stem = stem.slice(0, -1)
  }
  // Prefix stemming covers verb and derivational forms the suffix list
  // misses: wykorzystać / wykorzystany, przedawnia / przedawnienie.
  if (stem.length > STEM_PREFIX_LENGTH) stem = stem.slice(0, STEM_PREFIX_LENGTH)

  return stem
}

export function toStemText(text: string): string {
  return searchTokens(text).map(polishStem).join(" ")
}

/** Content tokens (no stopwords), stemmed and de-duplicated in order. */
export function queryStems(text: string): string[] {
  const seen = new Set<string>()
  const stems: string[] = []
  for (const token of searchTokens(text)) {
    if (isStopword(token)) continue
    const stem = polishStem(token)
    if (stem.length < 2 || seen.has(stem)) continue
    seen.add(stem)
    stems.push(stem)
  }
  return stems
}

/**
 * Builds a `to_tsquery('simple', …)` expression that ORs the query stems.
 * Natural-language questions rarely contain every word of the answer, so
 * ranking (ts_rank_cd) rather than an AND filter decides the order.
 * A quoted hyphenated code ('z-3') is expanded by the `simple` parser into
 * 'z-3' <-> 'z' <-> '3', which matches "Z-3" but not "Z-3a".
 */
export function buildOrTsQuery(stems: string[]): string | null {
  const parts = stems
    .map((stem) => stem.replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, ""))
    .filter((stem) => stem.length > 0)
    .map((stem) => `'${stem}'`)
  return parts.length > 0 ? parts.join(" | ") : null
}

/** Phrase query over `stem_tsv` for a multi-word exact term. */
export function buildPhraseTsQuery(term: string): string | null {
  const stems = searchTokens(term).map(polishStem)
  if (stems.length === 0) return null
  return stems.map((stem) => `'${stem}'`).join(" <-> ")
}
