/**
 * Minimal, dependency-free PDF 1.4 writer for **synthetic** test documents
 * and demo sample cases. It supports text lines (Helvetica, WinAnsi) and
 * AcroForm text fields with values. It is not a general PDF library: it
 * exists so the repository never needs real ZUS documents (Q-19).
 *
 * Page text is folded to ASCII (Helvetica/WinAnsi has no "ą", "ł"…); field
 * values are UTF-16BE text strings and keep Polish characters.
 */

export interface PdfTextLine {
  text: string
  x: number
  y: number
  size?: number
}

export interface PdfFormField {
  name: string
  value: string
  /** [x1, y1, x2, y2] in points. */
  rect: [number, number, number, number]
}

export interface PdfPageSpec {
  lines: PdfTextLine[]
  fields?: PdfFormField[]
}

export interface PdfDocumentSpec {
  title?: string
  pages: PdfPageSpec[]
  /** Producer note; synthetic documents are always labelled. */
  producer?: string
}

const FOLD: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ś: "s", ź: "z", ż: "z",
  Ą: "A", Ć: "C", Ę: "E", Ł: "L", Ń: "N", Ś: "S", Ź: "Z", Ż: "Z",
  "„": '"', "”": '"', "–": "-", "—": "-", "…": "...", "²": "2", "¹": "1",
}

/** Folds characters outside WinAnsi to ASCII. ó/Ó stay (they are in WinAnsi). */
export function toWinAnsi(text: string): string {
  return [...text].map((char) => FOLD[char] ?? (char.charCodeAt(0) < 256 ? char : "?")).join("")
}

function escapeLiteral(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

/** UTF-16BE hex string with BOM — a PDF "text string" for any Unicode value. */
function utf16Hex(text: string): string {
  let hex = "FEFF"
  for (let index = 0; index < text.length; index += 1) {
    hex += text.charCodeAt(index).toString(16).padStart(4, "0").toUpperCase()
  }
  return `<${hex}>`
}

function latin1Bytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index) & 0xff
  return bytes
}

export function writePdf(spec: PdfDocumentSpec): Uint8Array {
  const objects: string[] = []
  const reserve = () => {
    objects.push("")
    return objects.length
  }
  const set = (id: number, body: string) => {
    objects[id - 1] = body
  }

  const catalogId = reserve()
  const pagesId = reserve()
  const fontId = reserve()
  const infoId = reserve()
  set(fontId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")

  const pageIds: number[] = []
  const fieldIds: number[] = []

  for (const page of spec.pages) {
    const pageId = reserve()
    const contentId = reserve()
    pageIds.push(pageId)

    const stream = page.lines
      .map((line) => `BT /F1 ${line.size ?? 10} Tf ${line.x} ${line.y} Td (${escapeLiteral(toWinAnsi(line.text))}) Tj ET`)
      .join("\n")
    set(contentId, `<< /Length ${latin1Bytes(stream).length} >>\nstream\n${stream}\nendstream`)

    const annots: number[] = []
    for (const field of page.fields ?? []) {
      const fieldId = reserve()
      annots.push(fieldId)
      fieldIds.push(fieldId)
      set(
        fieldId,
        `<< /Type /Annot /Subtype /Widget /FT /Tx /F 4 /T ${utf16Hex(field.name)} /V ${utf16Hex(field.value)} ` +
          `/Rect [${field.rect.join(" ")}] /P ${pageId} 0 R /DA (/Helv 10 Tf 0 g) /MK << >> >>`
      )
    }

    set(
      pageId,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R ` +
        `/Resources << /Font << /F1 ${fontId} 0 R /Helv ${fontId} 0 R >> >>` +
        (annots.length > 0 ? ` /Annots [${annots.map((id) => `${id} 0 R`).join(" ")}]` : "") +
        " >>"
    )
  }

  set(pagesId, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`)
  set(
    catalogId,
    `<< /Type /Catalog /Pages ${pagesId} 0 R` +
      (fieldIds.length > 0
        ? ` /AcroForm << /Fields [${fieldIds.map((id) => `${id} 0 R`).join(" ")}] /NeedAppearances true /DA (/Helv 10 Tf 0 g) /DR << /Font << /Helv ${fontId} 0 R >> >> >>`
        : "") +
      " >>"
  )
  set(
    infoId,
    `<< /Title ${utf16Hex(spec.title ?? "Dokument syntetyczny")} /Producer ${utf16Hex(spec.producer ?? "ZPR synthetic PDF writer — DOKUMENT TESTOWY")} >>`
  )

  let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"
  const offsets: number[] = []
  objects.forEach((body, index) => {
    offsets.push(output.length)
    output += `${index + 1} 0 obj\n${body}\nendobj\n`
  })
  const xrefOffset = output.length
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) output += `${String(offset).padStart(10, "0")} 00000 n \n`
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return latin1Bytes(output)
}

/** Lays out "label: value" rows top-down; a convenience for synthetic forms. */
export function formPage(heading: string[], rows: [string, string][], footer: string[] = []): PdfPageSpec {
  const lines: PdfTextLine[] = []
  let y = 800
  for (const [index, text] of heading.entries()) {
    lines.push({ text, x: 50, y, size: index === 0 ? 14 : 10 })
    y -= index === 0 ? 22 : 16
  }
  y -= 8
  for (const [label, value] of rows) {
    lines.push({ text: `${label}: ${value}`, x: 50, y, size: 10 })
    y -= 16
  }
  y -= 12
  for (const text of footer) {
    lines.push({ text, x: 50, y, size: 8 })
    y -= 12
  }
  return { lines }
}
