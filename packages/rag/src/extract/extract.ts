import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"

import type { DocumentFormat, ExtractedDocument, ExtractedPage } from "./types"

export function sha256(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex")
}

/** `<!-- page: 12 -->` markers let curated text keep page references. */
const PAGE_MARKER = /^<!--\s*page:\s*(\d+)\s*-->\s*$/im

export function formatFromPath(filePath: string): DocumentFormat {
  const extension = path.extname(filePath).toLowerCase()
  if (extension === ".pdf") return "pdf"
  if (extension === ".md" || extension === ".markdown") return "markdown"
  if (extension === ".html" || extension === ".htm") return "html"
  return "text"
}

export function splitTextPages(text: string): ExtractedPage[] {
  const normalized = text.replace(/\r\n?/g, "\n")
  if (normalized.includes("\f")) {
    return normalized
      .split("\f")
      .map((pageText, index) => ({ pageNumber: index + 1, text: pageText }))
  }

  const pages: ExtractedPage[] = []
  let current: ExtractedPage = { pageNumber: 1, text: "" }
  let sawMarker = false
  for (const line of normalized.split("\n")) {
    const marker = PAGE_MARKER.exec(line)
    if (marker) {
      if (sawMarker || current.text.trim()) pages.push(current)
      sawMarker = true
      current = { pageNumber: Number(marker[1]), text: "" }
      continue
    }
    current.text += `${line}\n`
  }
  pages.push(current)
  return pages.filter((page) => page.text.trim().length > 0)
}

const BLOCK_TAGS =
  /<\/(p|div|section|article|li|tr|table|ul|ol|h[1-6]|br|header|footer)>|<br\s*\/?>/gi

/** Minimal, dependency-free HTML → text with markdown headings and bullets. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|nav|footer)[\s\S]*?<\/\1>/gi, "")
    .replace(
      /<h([1-6])[^>]*>/gi,
      (_, level: string) => `\n\n${"#".repeat(Number(level))} `
    )
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<t[dh][^>]*>/gi, " | ")
    .replace(BLOCK_TAGS, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/\n{3,}/g, "\n\n")
}

async function extractPdf(bytes: Uint8Array): Promise<ExtractedPage[]> {
  // Loaded lazily: pdf.js is heavy and only ingestion needs it.
  const { extractText, getDocumentProxy } = await import("unpdf")
  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const { text } = await extractText(pdf, { mergePages: false })
  return text.map((pageText, index) => ({
    pageNumber: index + 1,
    text: pageText,
  }))
}

export interface ExtractInput {
  format: DocumentFormat
  bytes: Uint8Array
  title?: string
}

/** Stage 2: read and extract content, preserving page boundaries. */
export async function extractDocument(
  input: ExtractInput
): Promise<ExtractedDocument> {
  const rawHash = sha256(input.bytes)
  let pages: ExtractedPage[]

  if (input.format === "pdf") {
    pages = await extractPdf(input.bytes)
  } else {
    const text = new TextDecoder("utf-8").decode(input.bytes)
    pages = splitTextPages(input.format === "html" ? htmlToText(text) : text)
  }

  return {
    format: input.format,
    pages,
    rawHash,
    metadata: { title: input.title },
  }
}

export async function extractFile(
  filePath: string,
  format: DocumentFormat = formatFromPath(filePath)
): Promise<ExtractedDocument> {
  const bytes = new Uint8Array(await readFile(filePath))
  return extractDocument({ format, bytes })
}
