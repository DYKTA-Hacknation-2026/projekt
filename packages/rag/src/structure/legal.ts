import type { AmendmentNote, NormalizedDocument } from "../extract/types"
import type { StructuralUnit, StructuredDocument } from "./types"

export interface LegalParseOptions {
  /**
   * Recover flattened superscripts in article numbers (Kodeks pracy PDFs
   * print "Art. 182¹a" as "Art. 1821a").
   */
  superscripts?: boolean
}

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹"
const CHAPTER = /^(DZIAŁ|ROZDZIAŁ|Dział|Rozdział|ODDZIAŁ|Oddział)\s+\S+/u
const ANNEX = /^(ZAŁĄCZNIK|Załącznik)(\s+nr\s+\S+)?/u
const ARTICLE = /^Art\.\s*(\d+[a-z]{0,3})\.?\s*(?:\[([^\]]+)\])?\s*(.*)$/u
const SECTION_MARK = /^§\s*(\d+[a-z]{0,3})\.?\s*(.*)$/u
const UST = /^(\d+[a-z]{0,2})\.(\d{1,3})?\s+(\S.*)$/u
const POINT = /^(\d+[a-z]{0,2})\)\s*(.*)$/u
const LETTER = /^([a-z])\)\s*(.*)$/u
const TIRET = /^[-–]\s+(.*)$/u
const REPEALED = /^\((uchylony|uchylona|uchylone|pominięty)\)\.?$/u

function toSuperscript(digits: string): string {
  return [...digits]
    .map((digit) => SUPERSCRIPT_DIGITS[Number(digit)] ?? digit)
    .join("")
}

function parseNumber(id: string): { num: number; suffix: string } {
  const match = /^(\d+)([a-z]*)$/.exec(id)
  return { num: Number(match?.[1] ?? NaN), suffix: match?.[2] ?? "" }
}

const SENTENCE_START = /^[A-ZĄĆĘŁŃÓŚŹŻ„"(]/u

/**
 * Is `candidate` a plausible next ust./§ number after `previous`? Guards
 * against wrapped lines that happen to start with "3. ". Extracts (wyciąg)
 * skip provisions, so a small forward jump is accepted when the following
 * text starts a sentence.
 */
export function isPlausibleNext(
  previous: string | null,
  candidate: string,
  followingText?: string
): boolean {
  const next = parseNumber(candidate)
  if (Number.isNaN(next.num)) return false
  const startsSentence =
    followingText === undefined || SENTENCE_START.test(followingText)
  if (previous === null)
    return (
      next.num === 1 ||
      (startsSentence && followingText !== undefined && next.num <= 50)
    )
  const prev = parseNumber(previous)
  if (next.num === prev.num + 1 && next.suffix === "") return true
  if (next.num === prev.num && next.suffix > prev.suffix) return true
  if (next.num === prev.num + 1 && next.suffix === "a") return true
  return (
    followingText !== undefined &&
    startsSentence &&
    next.num > prev.num &&
    next.num <= prev.num + 5
  )
}

/**
 * "§ 21" can be § 2 with footnote reference 1. Prefer the reading that
 * continues the numbering.
 */
function resolveSection(
  raw: string,
  previous: string | null,
  superscripts = false
): { id: string; footnote?: number } {
  // Kodeks pracy: "§ 11." printed after "§ 1." is § 1¹.
  if (
    superscripts &&
    previous !== null &&
    raw.length > 1 &&
    raw.slice(0, -1) === previous
  ) {
    return { id: `${previous}${toSuperscript(raw.slice(-1))}` }
  }
  if (isPlausibleNext(previous, raw) || previous === null) return { id: raw }
  for (let cut = 1; cut <= 2 && cut < raw.length; cut += 1) {
    const head = raw.slice(0, -cut)
    const tail = raw.slice(-cut)
    if (/^\d+$/.test(tail) && isPlausibleNext(previous, head)) {
      return { id: head, footnote: Number(tail) }
    }
  }
  return { id: raw }
}

interface ProvisionDraft {
  paragraph?: string
  paragraphLabel?: "ust." | "§"
  footnote?: number
  leadIn: string[]
  items: string[]
  closing: string[]
  mode: "lead" | "items" | "closing"
  pageStart: number
  pageEnd: number
}

function newDraft(
  page: number,
  paragraph?: string,
  label?: "ust." | "§",
  footnote?: number
): ProvisionDraft {
  return {
    paragraph,
    paragraphLabel: label,
    footnote,
    leadIn: [],
    items: [],
    closing: [],
    mode: "lead",
    pageStart: page,
    pageEnd: page,
  }
}

function appendTo(parts: string[], text: string): void {
  if (parts.length === 0) parts.push(text)
  else parts[parts.length - 1] = `${parts[parts.length - 1]} ${text}`
}

/**
 * Stage 5a: section detection for Polish legal acts
 * (Dział / Rozdział / Art. / § / ust. / pkt / lit. / tiret).
 *
 * One unit per ust. (or § inside an article, or a top-level § in a
 * regulation). Points and letters stay inside their unit with the lead-in and
 * the closing clause, so the chunker can split long enumerations without
 * losing the condition they belong to.
 */
export function parseLegalDocument(
  normalized: NormalizedDocument,
  options: LegalParseOptions = {}
): StructuredDocument {
  const units: StructuralUnit[] = []
  let repealedSkipped = 0
  let headings = 0

  let chapter: string | null = null
  let article: { id: string; title?: string } | null = null
  let topSection: string | null = null
  let annex: string | null = null
  let lastArticleBase = 0
  let lastParagraph: string | null = null
  let draft: ProvisionDraft | null = null
  let preamble: string[] = []
  let preamblePage = 1

  const footnoteFor = (number?: number): AmendmentNote | undefined =>
    number === undefined ? undefined : normalized.footnotes.get(number)

  const headingPath = (): string[] => {
    const path: string[] = []
    if (chapter) path.push(chapter)
    if (annex) path.push(annex)
    if (article)
      path.push(
        `Art. ${article.id}${article.title ? ` [${article.title}]` : ""}`
      )
    else if (topSection) path.push(`§ ${topSection}`)
    return path
  }

  const flush = () => {
    if (!draft) return
    const current = draft
    draft = null
    const lead = current.leadIn.join(" ").trim()
    if (!lead && current.items.length === 0) return
    if (REPEALED.test(lead) && current.items.length === 0) {
      repealedSkipped += 1
      return
    }
    const note = footnoteFor(current.footnote)
    const boundaryKey = article
      ? `art:${article.id}`
      : topSection
        ? `par:${topSection}`
        : annex
          ? `annex:${annex}`
          : "preamble"
    units.push({
      kind: "provision",
      headingPath: headingPath(),
      boundaryKey,
      leadIn: current.items.length > 0 ? lead : undefined,
      items: current.items.length > 0 ? current.items : undefined,
      closing:
        current.closing.length > 0
          ? current.closing.join(" ").trim()
          : undefined,
      text: current.items.length > 0 ? undefined : lead,
      pageStart: current.pageStart,
      pageEnd: current.pageEnd,
      locator: {
        article: article?.id,
        paragraph: current.paragraph,
        paragraphLabel: current.paragraphLabel,
        section: topSection ?? annex ?? undefined,
      },
      validFrom:
        note && note.kind !== "REPEALED"
          ? (note.effectiveFrom ?? undefined)
          : undefined,
      validTo:
        note && note.kind === "REPEALED"
          ? (note.effectiveFrom ?? undefined)
          : undefined,
      amendments: note ? [note.text] : undefined,
    })
  }

  const flushPreamble = () => {
    const text = preamble.join(" ").trim()
    preamble = []
    if (!text) return
    units.push({
      kind: "paragraph",
      headingPath: [],
      boundaryKey: "preamble",
      text,
      pageStart: preamblePage,
      pageEnd: preamblePage,
      locator: {},
    })
  }

  const resolveArticleId = (raw: string): string => {
    const match = /^(\d+)([a-z]*)$/.exec(raw)
    if (!options.superscripts || !match?.[1]) return raw
    const digits = match[1]
    const letters = match[2] ?? ""
    if (digits.length >= 4) {
      const base = Number(digits.slice(0, -1))
      if (base >= lastArticleBase) {
        lastArticleBase = base
        return `${base}${toSuperscript(digits.slice(-1))}${letters}`
      }
    }
    lastArticleBase = Math.max(lastArticleBase, Number(digits))
    return raw
  }

  for (const { text: line, page } of normalized.lines) {
    if (!line) continue

    if (CHAPTER.test(line) && line.length < 160) {
      flush()
      flushPreamble()
      chapter = line
      article = null
      topSection = null
      annex = null
      headings += 1
      continue
    }

    if (ANNEX.test(line) && line.length < 200 && !article) {
      flush()
      flushPreamble()
      annex = line
      topSection = null
      lastParagraph = null
      headings += 1
      draft = newDraft(page)
      continue
    }

    const articleMatch = ARTICLE.exec(line)
    if (articleMatch?.[1]) {
      flush()
      flushPreamble()
      article = {
        id: resolveArticleId(articleMatch[1]),
        title: articleMatch[2],
      }
      topSection = null
      annex = null
      lastParagraph = null
      headings += 1
      draft = newDraft(page)
      const rest = articleMatch[3]?.trim()
      if (rest) draft.leadIn.push(rest)
      continue
    }

    const sectionMatch = SECTION_MARK.exec(line)
    if (sectionMatch?.[1]) {
      flush()
      flushPreamble()
      if (article) {
        const resolved = resolveSection(
          sectionMatch[1],
          lastParagraph,
          options.superscripts
        )
        // Keep numbering on the base number: after § 1¹ comes § 2.
        lastParagraph = resolved.id.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/gu, "")
        draft = newDraft(page, resolved.id, "§", resolved.footnote)
      } else {
        const resolved = resolveSection(sectionMatch[1], topSection)
        topSection = resolved.id
        annex = null
        lastParagraph = null
        headings += 1
        draft = newDraft(page, undefined, undefined, resolved.footnote)
      }
      const rest = sectionMatch[2]?.trim()
      if (rest) draft.leadIn.push(rest)
      continue
    }

    const ustMatch = UST.exec(line)
    if (
      ustMatch?.[1] &&
      (article || topSection) &&
      isPlausibleNext(lastParagraph, ustMatch[1], ustMatch[3])
    ) {
      flush()
      lastParagraph = ustMatch[1]
      draft = newDraft(
        page,
        ustMatch[1],
        "ust.",
        ustMatch[2] ? Number(ustMatch[2]) : undefined
      )
      draft.leadIn.push(ustMatch[3] ?? "")
      continue
    }

    if (!draft) {
      if (preamble.length === 0) preamblePage = page
      preamble.push(line)
      continue
    }

    draft.pageEnd = page
    const pointMatch = POINT.exec(line)
    const letterMatch = LETTER.exec(line)
    const tiretMatch = TIRET.exec(line)

    if (pointMatch && draft.mode !== "closing") {
      draft.mode = "items"
      draft.items.push(line)
    } else if (letterMatch && draft.mode === "items") {
      // Letters belong to the current point: never separate them.
      draft.items[draft.items.length - 1] += `\n${line}`
    } else if (tiretMatch && draft.mode === "items") {
      draft.mode = "closing"
      draft.closing.push(line)
    } else if (draft.mode === "items") {
      appendTo(draft.items, line)
    } else if (draft.mode === "closing") {
      appendTo(draft.closing, line)
    } else {
      appendTo(draft.leadIn, line)
    }
  }

  flush()
  flushPreamble()
  return { units, stats: { repealedSkipped, headings } }
}
