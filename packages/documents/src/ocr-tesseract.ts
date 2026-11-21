import { execFile } from "node:child_process"
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"

import type { OcrEngine } from "./ports"

const run = promisify(execFile)

/**
 * Optional OCR for scans (P6-03), enabled only with `DOCUMENT_OCR_ENABLED`.
 * It shells out to `pdftoppm` (poppler) and `tesseract` with the `pol`
 * language pack, so the base image needs no heavy binary unless OCR is
 * wanted. Arguments are fixed (no shell), files live in a private temp
 * directory that is always removed.
 */
export function createTesseractOcr(options: { language?: string } = {}): OcrEngine {
  const language = options.language ?? "pol"
  return {
    name: "tesseract",
    async recognize(bytes, { timeoutMs, maxPages }) {
      const dir = await mkdtemp(path.join(tmpdir(), "zpr-ocr-"))
      try {
        const input = path.join(dir, "input.pdf")
        await writeFile(input, bytes, { mode: 0o600 })
        await run("pdftoppm", ["-r", "200", "-gray", "-png", "-f", "1", "-l", String(maxPages), input, path.join(dir, "page")], { timeout: timeoutMs })
        const images = (await readdir(dir)).filter((name) => name.startsWith("page") && name.endsWith(".png")).sort()
        const pages = []
        for (const [index, image] of images.entries()) {
          const { stdout } = await run("tesseract", [path.join(dir, image), "stdout", "-l", language, "--psm", "4"], { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 })
          pages.push({ page: index + 1, text: stdout })
        }
        return pages
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    },
  }
}
