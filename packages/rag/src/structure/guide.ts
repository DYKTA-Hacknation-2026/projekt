import type { NormalizedDocument } from "../extract/types"
import { toSearchText } from "../text/search-text"
import type { StructuralUnit, StructuredDocument } from "./types"

const MD_HEADING = /^(#{1,6})\s+(.+?)\s*#*$/
const LIST_ITEM = /^(?:-|\*|\d{1,2}[.)]|[a-z]\))\s+/u
const TABLE_ROW = /^\|.*\|\s*$/
const NOTE = /^(WAŻNE!?|UWAGA!?|PAMIĘTAJ!?)$/u
const SENTENCE_END = /[.!?;]["”)]?$/u
const UPPER_START = /^[A-ZĄĆĘŁŃÓŚŹŻ„"]/u

interface Heading {
  level: number
  title: string
}

/**
 * Stage 5b: section detection for guides, web pages, form instructions and
 * curated content. Headings come from markdown (`#`) or, for PDFs without
 * markup, from lines that match an entry of the document's table of
 * contents. Lists stay attached to the sentence that introduces them.
 */
export function parseGuideDocument(
  normalized: NormalizedDocument
): StructuredDocument {
  // TOC indentation is lost in PDF text. Titles that repeat in the TOC
  // ("Ubezpieczenie zdrowotne", "Pracownicy") are subheadings of the
  // preceding unique title, so they nest one level deeper.
  const tocCounts = new Map<string, number>()
  for (const entry of normalized.toc) {
    const key = toSearchText(entry.title)
    if (key.length >= 4) tocCounts.set(key, (tocCounts.get(key) ?? 0) + 1)
  }
  const tocLevel = (key: string) => ((tocCounts.get(key) ?? 0) > 1 ? 3 : 2)

  const units: StructuralUnit[] = []
  const path: Heading[] = []
  let headings = 0
  let sectionCounter = 0

  let paragraph: string[] = []
  let list: { leadIn?: string; items: string[] } | null = null
  let table: string[] = []
  let pendingNote: string | null = null
  let pageStart = 1
  let pageEnd = 1

  const headingPath = () => path.map((heading) => heading.title)
  const boundaryKey = () => `sec:${sectionCounter}`

  const push = (
    unit: Omit<
      StructuralUnit,
      "headingPath" | "boundaryKey" | "pageStart" | "pageEnd" | "locator"
    >
  ) => {
    units.push({
      ...unit,
      headingPath: headingPath(),
      boundaryKey: boundaryKey(),
      pageStart,
      pageEnd,
      locator: { section: path.at(-1)?.title },
    })
  }

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    let text = paragraph.join(" ").trim()
    paragraph = []
    if (pendingNote) {
      text = `${pendingNote} ${text}`
      pendingNote = null
    }
    if (text) push({ kind: "paragraph", text })
  }
  const flushList = () => {
    if (!list) return
    const current = list
    list = null
    if (current.items.length === 0) {
      if (current.leadIn) paragraph.push(current.leadIn)
      flushParagraph()
      return
    }
    push({ kind: "list", leadIn: current.leadIn, items: current.items })
  }
  const flushTable = () => {
    if (table.length === 0) return
    push({ kind: "table", text: table.join("\n") })
    table = []
  }
  const flushAll = () => {
    flushTable()
    flushList()
    flushParagraph()
  }

  const startSection = (heading: Heading) => {
    flushAll()
    while (path.length > 0 && (path.at(-1)?.level ?? 0) >= heading.level) {
      path.pop()
    }
    path.push(heading)
    sectionCounter += 1
    headings += 1
  }

  for (const { text: line, page } of normalized.lines) {
    if (!line) {
      flushAll()
      continue
    }
    if (paragraph.length === 0 && !list && table.length === 0) pageStart = page
    pageEnd = page

    const md = MD_HEADING.exec(line)
    if (md?.[1] && md[2]) {
      startSection({ level: md[1].length, title: md[2] })
      pageStart = page
      continue
    }
    const tocKey = line.length < 140 ? toSearchText(line) : ""
    if (tocKey && tocCounts.has(tocKey)) {
      startSection({ level: tocLevel(tocKey), title: line })
      pageStart = page
      continue
    }

    if (NOTE.test(line)) {
      flushAll()
      pendingNote = line.endsWith("!") ? line : `${line}!`
      continue
    }

    if (TABLE_ROW.test(line)) {
      flushList()
      flushParagraph()
      table.push(line)
      continue
    }
    flushTable()

    if (LIST_ITEM.test(line)) {
      if (!list) {
        // The last sentence of the paragraph (usually ending with ":")
        // introduces the list and travels with it.
        const intro = paragraph.join(" ").trim()
        paragraph = []
        if (pendingNote && intro) {
          list = { leadIn: `${pendingNote} ${intro}`, items: [] }
          pendingNote = null
        } else {
          list = { leadIn: intro || undefined, items: [] }
        }
      }
      list.items.push(line)
      continue
    }

    if (list) {
      const lastItem = list.items.at(-1) ?? ""
      // A wrapped item continues until a sentence ends and a new one starts.
      if (!(SENTENCE_END.test(lastItem) && UPPER_START.test(line))) {
        list.items[list.items.length - 1] = `${lastItem} ${line}`
        continue
      }
      flushList()
    }

    paragraph.push(line)
    // In PDFs lines wrap; break paragraphs at a sentence end followed by a
    // capitalised line so the chunker has natural split points.
    const joined = paragraph.join(" ")
    if (joined.length > 700 && SENTENCE_END.test(line)) flushParagraph()
  }

  flushAll()
  return { units, stats: { repealedSkipped: 0, headings } }
}
