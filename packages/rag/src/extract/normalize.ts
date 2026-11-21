import type {
  AmendmentNote,
  ExtractedDocument,
  NormalizedDocument,
  NormalizedLine,
  TocEntry,
} from "./types"

export interface NormalizeOptions {
  /**
   * Parse Legalis-style footnotes at the bottom of each page (amendment
   * notes such as "Art. 9 ust. 4 dodany … wchodzi w życie 1.01.2027 r.").
   */
  footnotes?: boolean
  /** Remove lines repeated at the top/bottom of many pages. */
  runningHeaders?: boolean
}

const BULLETS = /^[\s]*[▪•●◦■□▫‣⁃∙·]\s*/u
const PRIVATE_USE = /[-]/gu
const TOC_LEADER = /(?:\s?\.){4,}\s*(\d{1,4})\s*$/
/** "nie" glued to the next word by PDF text extraction (niewięcej, niedłużej…). */
const GLUED_NIE =
  /(^|[\s(„"])nie(?=(?:więc|mniej|dłuż|dłuższ|krócej|krótsz|późn|wcześn|większ|mniejsz|niższ|wyższ)\p{L}*)/gu
const LOWER_START = /^[a-ząćęłńóśźż]/u
const HYPHEN_END = /[a-ząćęłńóśźż]-$/u

function cleanLine(line: string): string {
  return line
    .normalize("NFC")
    .replace(/­/g, "")
    .replace(/[   ]/g, " ")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(PRIVATE_USE, "")
    .replace(/\t/g, " ")
    .replace(/,,/g, "„")
    .replace(/''/g, "”")
    .replace(BULLETS, "- ")
    .replace(GLUED_NIE, "$1nie ")
    .replace(/ {2,}/g, " ")
    .trim()
}

/** Header identity ignores folio numbers glued to either end ("30PORADNIK…"). */
function headerKey(line: string): string {
  return line
    .replace(/^\d+|\d+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

/** Footnotes are numbered through the document; excerpts may skip a few. */
const FOOTNOTE_WINDOW = 5
const FOOTNOTE_START = /^(\d{1,3}) (?=[A-ZĄĆĘŁŃÓŚŹŻ])/u
const AMENDMENT =
  /(dodan[yae]|w brzmieniu|uchylon[yae]|zmienion[yae]).*?wchodzi w życie (?:z dniem )?(\d{1,2})\.(\d{1,2})\.(\d{4})/iu

export function parseAmendment(footnote: number, text: string): AmendmentNote {
  const match = AMENDMENT.exec(text)
  const verb = match?.[1]?.toLowerCase() ?? ""
  const kind: AmendmentNote["kind"] = verb.startsWith("dodan")
    ? "ADDED"
    : verb.startsWith("uchylon")
      ? "REPEALED"
      : verb
        ? "AMENDED"
        : "OTHER"
  const effectiveFrom =
    match?.[2] && match[3] && match[4]
      ? `${match[4]}-${match[3].padStart(2, "0")}-${match[2].padStart(2, "0")}`
      : null
  return { footnote, text, effectiveFrom, kind }
}

/**
 * Stage 3+4: keep page boundaries (every line remembers its page), then
 * normalise the extracted text without changing its meaning.
 */
export function normalizeDocument(
  document: ExtractedDocument,
  options: NormalizeOptions = {}
): NormalizedDocument {
  const runningHeaders = options.runningHeaders ?? document.format === "pdf"
  const stats = {
    removedHeaderLines: 0,
    joinedHyphenations: 0,
    footnoteLines: 0,
    tocLines: 0,
  }

  const pages = document.pages.map((page) => ({
    page: page.pageNumber,
    lines: page.text.replace(/\r\n?/g, "\n").split("\n").map(cleanLine),
  }))

  // Running headers/footers: the same line (digits ignored) at the top or
  // bottom of at least three pages and 30% of the document.
  if (runningHeaders && pages.length >= 3) {
    const counts = new Map<string, number>()
    for (const page of pages) {
      const content = page.lines.filter(Boolean)
      const edge = new Set(
        [...content.slice(0, 2), ...content.slice(-2)].map(headerKey)
      )
      for (const key of edge) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const threshold = Math.max(3, Math.ceil(pages.length * 0.3))
    for (const page of pages) {
      const contentIndexes = page.lines
        .map((line, index) => (line ? index : -1))
        .filter((index) => index >= 0)
      const edgeIndexes = new Set([
        ...contentIndexes.slice(0, 2),
        ...contentIndexes.slice(-2),
      ])
      page.lines = page.lines.filter((line, index) => {
        if (!edgeIndexes.has(index)) return true
        const key = headerKey(line)
        const isFolio = /^\d{1,4}$/.test(line)
        if (
          isFolio ||
          (key.length > 0 && (counts.get(key) ?? 0) >= threshold)
        ) {
          stats.removedHeaderLines += 1
          return false
        }
        return true
      })
    }
  }

  const footnotes = new Map<number, AmendmentNote>()
  const toc: TocEntry[] = []
  const lines: NormalizedLine[] = []
  let lastFootnote = 0

  for (const page of pages) {
    let body = page.lines

    if (options.footnotes) {
      // Legalis numbers footnotes sequentially through the document, so a
      // footnote block starts at the next expected number near the bottom.
      let start = -1
      for (let index = 1; index < body.length; index += 1) {
        const match = FOOTNOTE_START.exec(body[index] ?? "")
        const number = match ? Number(match[1]) : NaN
        if (number > lastFootnote && number <= lastFootnote + FOOTNOTE_WINDOW) {
          start = index
          break
        }
      }
      if (start > 0) {
        const block = body.slice(start)
        body = body.slice(0, start)
        stats.footnoteLines += block.length
        let current: { number: number; text: string } | null = null
        const flush = () => {
          if (current) {
            footnotes.set(
              current.number,
              parseAmendment(current.number, current.text.trim())
            )
            lastFootnote = Math.max(lastFootnote, current.number)
          }
        }
        for (const line of block) {
          const match = FOOTNOTE_START.exec(line)
          const number = match ? Number(match[1]) : NaN
          if (match && number > (current?.number ?? lastFootnote)) {
            flush()
            current = { number, text: line.slice(match[0].length) }
          } else if (current) {
            current.text += ` ${line}`
          }
        }
        flush()
      }
    }

    for (const line of body) {
      const leader = TOC_LEADER.exec(line)
      if (leader) {
        const title = line
          .slice(0, leader.index)
          .replace(/[\s.]+$/, "")
          .trim()
        // TOC titles can wrap: join with the previous unterminated line.
        const previous = lines.at(-1)
        if (
          previous &&
          previous.page === page.page &&
          previous.text &&
          !/[.:;!?]$/.test(previous.text) &&
          toc.length > 0
        ) {
          lines.pop()
          stats.tocLines += 1
          toc.push({
            title: `${previous.text} ${title}`.trim(),
            page: Number(leader[1]),
          })
        } else {
          toc.push({ title, page: Number(leader[1]) })
        }
        stats.tocLines += 1
        continue
      }
      if (/^spis treści$/i.test(line)) continue

      const previous = lines.at(-1)
      if (
        previous?.text &&
        HYPHEN_END.test(previous.text) &&
        LOWER_START.test(line)
      ) {
        previous.text = `${previous.text.slice(0, -1)}${line}`
        stats.joinedHyphenations += 1
        continue
      }
      lines.push({ text: line, page: page.page })
    }
  }

  // Collapse runs of blank lines.
  const compact = lines.filter(
    (line, index) => line.text || (lines[index - 1]?.text ?? "") !== ""
  )

  return {
    lines: compact,
    toc,
    footnotes,
    pageCount: document.pages.length,
    stats,
  }
}
