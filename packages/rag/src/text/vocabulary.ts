import { polishStem, searchTokens, toSearchText } from "./search-text"

export type BenefitTag =
  | "SICKNESS"
  | "MATERNITY"
  | "PARENTAL"
  | "PATERNITY"
  | "SUPPLEMENTARY"
  | "CARE"
  | "CHILDCARE_LEAVE"
  | "ADOPTION"
  | "FOSTER"
  | "LOSS"
  | "ZA_ZYCIEM"
  | "PREGNANCY"
  | "FORMS"
  | "SUPPORT"
  | "CONTRIBUTIONS"

export interface DomainTerm {
  id: string
  /** Canonical spelling shown to users. */
  term: string
  /** Other spellings users type; they resolve to the canonical term. */
  aliases?: string[]
  kind: "FORM" | "DOCUMENT" | "BENEFIT" | "LEAVE" | "PROGRAM" | "SYSTEM"
  tags: BenefitTag[]
}

/**
 * Terms that must match exactly. Codes keep their hyphen and suffix, so
 * "Z-3" and "Z-3a" are different terms; multi-word terms match any Polish
 * inflection through the stem index ("urlopu rodzicielskiego").
 */
export const DOMAIN_TERMS: DomainTerm[] = [
  {
    id: "ZAM",
    term: "ZAM",
    kind: "FORM",
    tags: ["MATERNITY", "PARENTAL", "FORMS"],
  },
  {
    id: "E_ZLA",
    term: "e-ZLA",
    aliases: ["ezla", "L4", "e-zwolnienie"],
    kind: "DOCUMENT",
    tags: ["SICKNESS", "PREGNANCY"],
  },
  {
    id: "Z_3",
    term: "Z-3",
    kind: "FORM",
    tags: ["SICKNESS", "MATERNITY", "FORMS"],
  },
  {
    id: "Z_3A",
    term: "Z-3a",
    kind: "FORM",
    tags: ["SICKNESS", "MATERNITY", "FORMS"],
  },
  {
    id: "Z_3B",
    term: "Z-3b",
    kind: "FORM",
    tags: ["SICKNESS", "MATERNITY", "FORMS"],
  },
  { id: "Z_15A", term: "Z-15a", kind: "FORM", tags: ["CARE", "FORMS"] },
  { id: "Z_15B", term: "Z-15b", kind: "FORM", tags: ["CARE", "FORMS"] },
  { id: "ZAS_53", term: "ZAS-53", kind: "FORM", tags: ["MATERNITY", "FORMS"] },
  { id: "ZAS_12", term: "ZAS-12", kind: "FORM", tags: ["SICKNESS", "FORMS"] },
  {
    id: "ZA_ZYCIEM",
    term: "Za życiem",
    aliases: ["zaświadczenie za życiem"],
    kind: "PROGRAM",
    tags: ["ZA_ZYCIEM", "PARENTAL"],
  },
  {
    id: "URLOP_RODZICIELSKI",
    term: "urlop rodzicielski",
    kind: "LEAVE",
    tags: ["PARENTAL"],
  },
  {
    id: "URLOP_MACIERZYNSKI",
    term: "urlop macierzyński",
    kind: "LEAVE",
    tags: ["MATERNITY"],
  },
  {
    id: "URLOP_OJCOWSKI",
    term: "urlop ojcowski",
    aliases: ["tacierzyński", "urlop tacierzyński"],
    kind: "LEAVE",
    tags: ["PATERNITY"],
  },
  {
    id: "URLOP_WYCHOWAWCZY",
    term: "urlop wychowawczy",
    kind: "LEAVE",
    tags: ["CHILDCARE_LEAVE"],
  },
  {
    id: "UZUPELNIAJACY",
    term: "uzupełniający urlop macierzyński",
    kind: "LEAVE",
    tags: ["SUPPLEMENTARY", "MATERNITY"],
  },
  {
    id: "ZASILEK_MACIERZYNSKI",
    term: "zasiłek macierzyński",
    aliases: ["macierzyński zasiłek"],
    kind: "BENEFIT",
    tags: ["MATERNITY"],
  },
  {
    id: "ZASILEK_CHOROBOWY",
    term: "zasiłek chorobowy",
    kind: "BENEFIT",
    tags: ["SICKNESS"],
  },
  {
    id: "ZASILEK_OPIEKUNCZY",
    term: "zasiłek opiekuńczy",
    kind: "BENEFIT",
    tags: ["CARE"],
  },
  {
    id: "PUE",
    term: "PUE",
    aliases: ["eZUS", "PUE ZUS"],
    kind: "SYSTEM",
    tags: ["FORMS"],
  },
]

/** Colloquial phrases → wording used in the sources. */
const SYNONYMS: Array<{ pattern: RegExp; expansion: string }> = [
  { pattern: /\bl4\b/, expansion: "zwolnienie lekarskie e-ZLA" },
  { pattern: /\btacierzynsk/, expansion: "urlop ojcowski" },
  { pattern: /\bmacierzynskie\b/, expansion: "zasiłek macierzyński" },
  { pattern: /\bchorobowe\b/, expansion: "zasiłek chorobowy" },
  { pattern: /\badopcj/, expansion: "przysposobienie" },
  { pattern: /\bporonien/, expansion: "urodzenie martwego dziecka" },
]

const TAG_PATTERNS: Array<{ tag: BenefitTag; pattern: RegExp }> = [
  {
    tag: "SICKNESS",
    pattern: /\b(chorob|niezdolnosc\w* do pracy|e-zla|zwolnieni\w* lekarsk)/,
  },
  { tag: "MATERNITY", pattern: /\bmacierzynsk/ },
  { tag: "PARENTAL", pattern: /\brodzicielsk/ },
  { tag: "PATERNITY", pattern: /\b(ojcowsk|tacierzynsk)/ },
  { tag: "SUPPLEMENTARY", pattern: /\buzupelniajac\w* urlop/ },
  { tag: "CARE", pattern: /\bopiekuncz/ },
  { tag: "CHILDCARE_LEAVE", pattern: /\bwychowawcz/ },
  { tag: "ADOPTION", pattern: /\b(przysposob|adopc)/ },
  { tag: "FOSTER", pattern: /\brodzin\w* zastepcz/ },
  { tag: "LOSS", pattern: /\b(martwe\w*|zgon\w*|smierc\w*|poronien)/ },
  { tag: "ZA_ZYCIEM", pattern: /\bza zyciem\b/ },
  { tag: "PREGNANCY", pattern: /\b(ciaz|porod)/ },
  {
    tag: "FORMS",
    pattern:
      /\b(wniosek|wniosk|formularz|druk\w*|zam|z-3[ab]?|z-15[ab]|zas-\d+)\b/,
  },
  {
    tag: "SUPPORT",
    pattern:
      /\b(fundacj|stowarzyszen|hospicj|wsparci\w* psycholog|organizacj\w* pozarzadow)/,
  },
  { tag: "CONTRIBUTIONS", pattern: /\b(skladk|podstaw\w* wymiaru)/ },
]

export function detectBenefitTags(text: string): BenefitTag[] {
  const normalized = toSearchText(text)
  return TAG_PATTERNS.filter(({ pattern }) => pattern.test(normalized)).map(
    ({ tag }) => tag
  )
}

function stemSequence(text: string): string[] {
  return searchTokens(text).map(polishStem)
}

function containsSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false
  outer: for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer
    }
    return true
  }
  return false
}

/** Exact domain terms present in `text`, via canonical spelling or alias. */
export function detectDomainTerms(text: string): DomainTerm[] {
  const stems = stemSequence(text)
  return DOMAIN_TERMS.filter((term) =>
    [term.term, ...(term.aliases ?? [])].some((spelling) =>
      containsSequence(stems, stemSequence(spelling))
    )
  )
}

export function expandSynonyms(text: string): string[] {
  const normalized = toSearchText(text)
  return SYNONYMS.filter(({ pattern }) => pattern.test(normalized)).map(
    ({ expansion }) => expansion
  )
}

/** Form and document codes mentioned in a chunk (stored as metadata). */
export function detectCodes(text: string): string[] {
  return detectDomainTerms(text)
    .filter((term) => term.kind === "FORM" || term.kind === "DOCUMENT")
    .map((term) => term.term)
}
