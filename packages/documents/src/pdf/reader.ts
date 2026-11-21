/**
 * Reads the text layer and AcroForm fields of a PDF with pdf.js (through
 * `unpdf`, already used by `@zpr/rag` — no extra dependency). The file is
 * only parsed, never rendered or executed: scripting is disabled, and the
 * whole read is bounded by a timeout.
 */

export interface PdfPageText {
  page: number
  text: string
}

export interface PdfAcroField {
  name: string
  value: string
  page: number
  bbox?: { x: number; y: number; width: number; height: number }
}

export interface PdfContent {
  pages: PdfPageText[]
  fields: PdfAcroField[]
  pageCount: number
  /** False for scans: no page has meaningful text. */
  hasTextLayer: boolean
}

export class PdfReadError extends Error {
  constructor(
    message: string,
    readonly code: "PDF_TIMEOUT" | "PDF_INVALID" | "PDF_ENCRYPTED"
  ) {
    super(message)
    this.name = "PdfReadError"
  }
}

const MIN_TEXT_CHARS = 20
export const MAX_PDF_PAGES = 50

export function hasPdfSignature(bytes: Uint8Array): boolean {
  // "%PDF-" — must be at the very start (we do not accept the 1 KB leeway readers allow).
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PdfReadError("Przekroczono czas analizy pliku PDF.", "PDF_TIMEOUT")), timeoutMs)
  })
  try {
    return await Promise.race([work, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function fieldValue(raw: unknown): string {
  if (typeof raw === "string") return raw
  if (Array.isArray(raw)) return raw.filter((item) => typeof item === "string").join(", ")
  if (typeof raw === "boolean") return raw ? "true" : "false"
  return ""
}

async function read(bytes: Uint8Array): Promise<PdfContent> {
  const { getDocumentProxy } = await import("unpdf")
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>
  try {
    pdf = await getDocumentProxy(new Uint8Array(bytes), {
      isEvalSupported: false,
      enableXfa: false,
      disableFontFace: true,
      useSystemFonts: false,
      stopAtErrors: false,
      verbosity: 0,
    })
  } catch (error) {
    const name = error instanceof Error ? error.name : ""
    if (name === "PasswordException") {
      throw new PdfReadError("Plik PDF jest zabezpieczony hasłem.", "PDF_ENCRYPTED")
    }
    throw new PdfReadError("Nie udało się odczytać struktury pliku PDF.", "PDF_INVALID")
  }

  try {
    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES)
    const pages: PdfPageText[] = []
    const fields: PdfAcroField[] = []

    for (let number = 1; number <= pageCount; number += 1) {
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      const parts: string[] = []
      let lastY: number | null = null
      for (const item of content.items) {
        if (!("str" in item)) continue
        const y = Array.isArray(item.transform) ? Number(item.transform[5]) : null
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) parts.push("\n")
        else if (parts.length > 0 && !parts[parts.length - 1]!.endsWith(" ")) parts.push(" ")
        parts.push(item.str)
        if (item.hasEOL) parts.push("\n")
        lastY = y
      }
      pages.push({ page: number, text: parts.join("").replace(/[ \t]+\n/g, "\n").trim() })

      const annotations = (await page.getAnnotations({ intent: "display" })) as Array<Record<string, unknown>>
      for (const annotation of annotations) {
        if (annotation.subtype !== "Widget" || typeof annotation.fieldName !== "string") continue
        const rect = Array.isArray(annotation.rect) ? (annotation.rect as number[]) : undefined
        fields.push({
          name: annotation.fieldName,
          value: fieldValue(annotation.fieldValue).trim(),
          page: number,
          bbox:
            rect && rect.length === 4
              ? { x: rect[0]!, y: rect[1]!, width: rect[2]! - rect[0]!, height: rect[3]! - rect[1]! }
              : undefined,
        })
      }
      page.cleanup()
    }

    const textChars = pages.reduce((sum, page) => sum + page.text.replace(/\s/g, "").length, 0)
    return { pages, fields, pageCount: pdf.numPages, hasTextLayer: textChars >= MIN_TEXT_CHARS }
  } finally {
    await pdf.destroy()
  }
}

export async function readPdf(bytes: Uint8Array, options: { timeoutMs?: number } = {}): Promise<PdfContent> {
  if (!hasPdfSignature(bytes)) throw new PdfReadError("Plik nie ma sygnatury PDF.", "PDF_INVALID")
  return withTimeout(read(bytes), options.timeoutMs ?? 10_000)
}
