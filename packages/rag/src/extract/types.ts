export type DocumentFormat = "pdf" | "markdown" | "text" | "html"

export interface ExtractedPage {
  /** 1-based page number as printed by the PDF viewer (not the folio). */
  pageNumber: number
  text: string
}

export interface ExtractedDocument {
  format: DocumentFormat
  pages: ExtractedPage[]
  /** sha256 of the raw input bytes. */
  rawHash: string
  metadata: { title?: string }
}

export interface NormalizedLine {
  text: string
  page: number
}

export interface TocEntry {
  title: string
  page: number
}

export interface AmendmentNote {
  footnote: number
  text: string
  /** ISO date the amended wording takes effect, when stated. */
  effectiveFrom: string | null
  kind: "ADDED" | "AMENDED" | "REPEALED" | "OTHER"
}

export interface NormalizedDocument {
  /** Body lines with their page. An empty `text` marks a paragraph break. */
  lines: NormalizedLine[]
  toc: TocEntry[]
  footnotes: Map<number, AmendmentNote>
  pageCount: number
  stats: {
    removedHeaderLines: number
    joinedHyphenations: number
    footnoteLines: number
    tocLines: number
  }
}
