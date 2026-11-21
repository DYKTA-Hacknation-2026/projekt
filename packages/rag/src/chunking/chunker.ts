import type { StructuralUnit } from "../structure/types"

export interface ChunkingOptions {
  /** Hard target for a chunk, in estimated tokens. */
  maxTokens: number
  /** Chunks below this size are merged with a neighbour when possible. */
  minTokens: number
  /** Overlap carried between consecutive chunks of the same guide section. */
  overlapTokens: number
  /** A whole article is kept as one chunk up to this size. */
  legalArticleMaxTokens: number
  /** Characters per token used by the estimator (Polish BPE ≈ 3.5). */
  charsPerToken: number
}

export const DEFAULT_CHUNKING: ChunkingOptions = {
  maxTokens: 450,
  minTokens: 60,
  overlapTokens: 60,
  legalArticleMaxTokens: 350,
  charsPerToken: 3.5,
}

export interface ChunkDraft {
  index: number
  content: string
  headingPath: string[]
  pageStart: number
  pageEnd: number
  sectionIdentifier: string | null
  legalReference: string | null
  validFrom: string | null
  validTo: string | null
  tokenCount: number
  kind: StructuralUnit["kind"]
  metadata: {
    article?: string
    paragraphs?: string[]
    part?: { index: number; of: number }
    overlapTokens?: number
    amendments?: string[]
  }
}

export interface ChunkContext {
  /** Short citation prefix, e.g. "U" (ustawa zasiłkowa) or "KP". */
  citationPrefix?: string
}

export function estimateTokens(text: string, charsPerToken = 3.5): number {
  return Math.ceil(text.length / charsPerToken)
}

const SENTENCE_SPLIT = /(?<=[.!?;])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ0-9„"(§-])/u

export function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean)
}

function renderUnit(unit: StructuralUnit, items = unit.items): string {
  const label =
    unit.locator.paragraph && unit.locator.paragraphLabel === "§"
      ? `§ ${unit.locator.paragraph}. `
      : unit.locator.paragraph
        ? `${unit.locator.paragraph}. `
        : ""
  if (items && items.length > 0) {
    return [`${label}${unit.leadIn ?? ""}`.trim(), ...items, unit.closing]
      .filter((part): part is string => Boolean(part))
      .join("\n")
  }
  return `${label}${unit.text ?? ""}`.trim()
}

function rangeLabel(values: string[]): string {
  const unique = [...new Set(values)]
  if (unique.length === 0) return ""
  if (unique.length === 1) return unique[0] ?? ""
  return `${unique[0]}–${unique.at(-1)}`
}

interface Piece {
  text: string
  units: StructuralUnit[]
  part?: { index: number; of: number }
  /** Tokens repeated from the previous part (sentence overlap). */
  overlap?: number
}

/**
 * Splits one oversized unit. Enumerations are split between items and every
 * part repeats the lead-in and the closing clause, so a condition such as
 * "zasiłek przysługuje, jeżeli: 1) … 2) …" never loses its context.
 */
function splitUnit(unit: StructuralUnit, options: ChunkingOptions): Piece[] {
  const tokens = (text: string) => estimateTokens(text, options.charsPerToken)
  const pieces: string[] = []
  const overlaps: number[] = []

  if (unit.items && unit.items.length > 1) {
    const frame = tokens(renderUnit(unit, []))
    const budget = Math.max(options.maxTokens - frame, options.maxTokens / 3)
    let current: string[] = []
    let size = 0
    for (const item of unit.items) {
      const itemTokens = tokens(item)
      if (current.length > 0 && size + itemTokens > budget) {
        pieces.push(renderUnit(unit, current))
        current = []
        size = 0
      }
      current.push(item)
      size += itemTokens
    }
    if (current.length > 0) pieces.push(renderUnit(unit, current))
  } else {
    const sentences = splitSentences(renderUnit(unit))
    let current: string[] = []
    let size = 0
    for (const sentence of sentences) {
      const sentenceTokens = tokens(sentence)
      if (current.length > 0 && size + sentenceTokens > options.maxTokens) {
        pieces.push(current.join(" "))
        // Sentence-level overlap keeps the thread between parts.
        const overlap: string[] = []
        let overlapSize = 0
        for (let i = current.length - 1; i >= 0; i -= 1) {
          const candidate = current[i] ?? ""
          if (overlapSize + tokens(candidate) > options.overlapTokens) break
          overlap.unshift(candidate)
          overlapSize += tokens(candidate)
        }
        current = [...overlap]
        size = overlapSize
        overlaps[pieces.length] = overlapSize
      }
      current.push(sentence)
      size += sentenceTokens
    }
    if (current.length > 0) pieces.push(current.join(" "))
  }

  return pieces.map((text, index) => ({
    text,
    units: [unit],
    part:
      pieces.length > 1 ? { index: index + 1, of: pieces.length } : undefined,
    overlap: overlaps[index] || undefined,
  }))
}

function sameValidity(a: StructuralUnit, b: StructuralUnit): boolean {
  return (
    (a.validFrom ?? null) === (b.validFrom ?? null) &&
    (a.validTo ?? null) === (b.validTo ?? null)
  )
}

/** Consecutive units that share a boundary key and validity window. */
function groupUnits(units: StructuralUnit[]): StructuralUnit[][] {
  const groups: StructuralUnit[][] = []
  for (const unit of units) {
    const group = groups.at(-1)
    const head = group?.[0]
    if (
      group &&
      head &&
      head.boundaryKey === unit.boundaryKey &&
      sameValidity(head, unit)
    ) {
      group.push(unit)
    } else {
      groups.push([unit])
    }
  }
  return groups
}

function trailingOverlap(text: string, options: ChunkingOptions): string {
  const sentences = splitSentences(text)
  const kept: string[] = []
  let size = 0
  for (let i = sentences.length - 1; i >= 0; i -= 1) {
    const sentence = sentences[i] ?? ""
    const sentenceTokens = estimateTokens(sentence, options.charsPerToken)
    if (size + sentenceTokens > options.overlapTokens) break
    kept.unshift(sentence)
    size += sentenceTokens
  }
  return kept.join(" ")
}

/**
 * Stage 5: section-aware chunking.
 *
 * - Chunks never cross a boundary (article, regulation §, guide section) or
 *   a change of legal validity (an ust. added from 2027-01-01 gets its own
 *   chunk with its own effective date).
 * - A short article stays whole; a long one is split per ust./§, merging
 *   short neighbours; an oversized ust. is split between points.
 * - Guide sections are packed up to `maxTokens` with sentence-aligned
 *   overlap; lists and tables are only split when they alone are too big.
 */
export function chunkUnits(
  units: StructuralUnit[],
  context: ChunkContext = {},
  overrides: Partial<ChunkingOptions> = {}
): ChunkDraft[] {
  const options = { ...DEFAULT_CHUNKING, ...overrides }
  if (options.overlapTokens >= options.maxTokens) {
    throw new Error("overlapTokens must be smaller than maxTokens")
  }
  const tokens = (text: string) => estimateTokens(text, options.charsPerToken)
  const chunks: ChunkDraft[] = []

  const emit = (pieces: Piece[], overlapTokens?: number) => {
    const allUnits = pieces.flatMap((piece) => piece.units)
    const first = allUnits[0]
    if (!first) return
    const content = pieces.map((piece) => piece.text).join("\n")
    const article = first.locator.article
    const paragraphs = allUnits
      .map((unit) => unit.locator.paragraph)
      .filter((value): value is string => Boolean(value))
    const label = first.locator.paragraphLabel ?? "ust."
    const paragraphPart =
      paragraphs.length > 0 ? ` ${label} ${rangeLabel(paragraphs)}` : ""
    const pointRange = pieces[0]?.part
      ? ` (cz. ${pieces[0].part.index}/${pieces[0].part.of})`
      : ""

    let sectionIdentifier: string | null = null
    let legalReference: string | null = null
    if (article) {
      sectionIdentifier = `Art. ${article}${paragraphPart}`
    } else if (first.kind === "provision" && first.locator.section) {
      sectionIdentifier =
        first.locator.section.startsWith("Załącznik") ||
        first.locator.section.startsWith("ZAŁĄCZNIK")
          ? first.locator.section
          : `§ ${first.locator.section}${paragraphs.length > 0 ? ` ust. ${rangeLabel(paragraphs)}` : ""}`
    } else {
      sectionIdentifier =
        first.locator.section ?? first.headingPath.at(-1) ?? null
    }
    if (
      first.kind === "provision" &&
      sectionIdentifier &&
      context.citationPrefix
    ) {
      legalReference = `${context.citationPrefix} ${sectionIdentifier.replace(/^Art\./, "art.")}${pointRange}`
    }

    const amendments = allUnits.flatMap((unit) => unit.amendments ?? [])
    chunks.push({
      index: chunks.length,
      content,
      headingPath: first.headingPath,
      pageStart: Math.min(...allUnits.map((unit) => unit.pageStart)),
      pageEnd: Math.max(...allUnits.map((unit) => unit.pageEnd)),
      sectionIdentifier,
      legalReference,
      validFrom: first.validFrom ?? null,
      validTo: first.validTo ?? null,
      tokenCount: tokens(content),
      kind: first.kind,
      metadata: {
        article,
        paragraphs:
          paragraphs.length > 0 ? [...new Set(paragraphs)] : undefined,
        part: pieces.length === 1 ? pieces[0]?.part : undefined,
        overlapTokens,
        amendments: amendments.length > 0 ? amendments : undefined,
      },
    })
  }

  for (const group of groupUnits(units)) {
    const isLegal = group[0]?.kind === "provision"
    const rendered = group.map((unit) => ({ unit, text: renderUnit(unit) }))
    const total = rendered.reduce((sum, entry) => sum + tokens(entry.text), 0)

    if (isLegal && total <= options.legalArticleMaxTokens) {
      emit(rendered.map((entry) => ({ text: entry.text, units: [entry.unit] })))
      continue
    }

    let current: Piece[] = []
    let size = 0
    let carried: string | null = null
    let currentOverlap: number | undefined

    const flushCurrent = () => {
      if (current.length === 0) return
      emit(current, currentOverlap)
      currentOverlap = undefined
      if (!isLegal && options.overlapTokens > 0) {
        const lastText = current.at(-1)?.text ?? ""
        carried = trailingOverlap(lastText, options) || null
      }
      current = []
      size = 0
    }

    for (const entry of rendered) {
      const entryTokens = tokens(entry.text)
      if (entryTokens > options.maxTokens) {
        flushCurrent()
        for (const piece of splitUnit(entry.unit, options))
          emit([piece], piece.overlap)
        carried = null
        continue
      }
      if (current.length > 0 && size + entryTokens > options.maxTokens) {
        flushCurrent()
      }
      if (current.length === 0 && carried && entry.unit.kind === "paragraph") {
        current.push({ text: carried, units: [] })
        size += tokens(carried)
        currentOverlap = tokens(carried)
      }
      current.push({ text: entry.text, units: [entry.unit] })
      size += entryTokens
    }
    if (current.length > 0) {
      const tooSmall = size < options.minTokens
      const previous = chunks.at(-1)
      const head = current.find((piece) => piece.units.length > 0)?.units[0]
      // Merge a tiny tail into the previous chunk of the same group.
      if (
        tooSmall &&
        previous &&
        head &&
        previous.headingPath.join("›") === head.headingPath.join("›") &&
        previous.validFrom === (head.validFrom ?? null) &&
        previous.tokenCount + size <= options.maxTokens * 1.15 &&
        !previous.metadata.part
      ) {
        const extra = current
          .filter((piece) => piece.units.length > 0)
          .map((piece) => piece.text)
          .join("\n")
        previous.content = `${previous.content}\n${extra}`
        previous.tokenCount = tokens(previous.content)
        const extraParagraphs = current.flatMap((piece) =>
          piece.units
            .map((unit) => unit.locator.paragraph)
            .filter((v): v is string => Boolean(v))
        )
        if (extraParagraphs.length > 0) {
          previous.metadata.paragraphs = [
            ...new Set([
              ...(previous.metadata.paragraphs ?? []),
              ...extraParagraphs,
            ]),
          ]
        }
        previous.pageEnd = Math.max(
          previous.pageEnd,
          ...current.flatMap((p) => p.units.map((u) => u.pageEnd))
        )
      } else {
        emit(current, currentOverlap)
      }
    }
  }

  return chunks
}
