import { readdir } from "node:fs/promises"
import path from "node:path"

import { extractFile, formatFromPath } from "../extract/extract"
import { toSearchText } from "../text/search-text"
import type { DocumentDefinition } from "./types"

export interface ResolvedLocalDocument {
  definition: DocumentDefinition
  filePath: string
  matchedBy: "fileName" | "content"
}

const DETECT_WINDOW = 600
const SUPPORTED = new Set([".pdf", ".md", ".txt", ".html", ".htm"])

/**
 * Maps locally provided files (never committed) to manifest documents, by
 * exact file name or by `detect` phrases in the title block of page 1.
 * Files that match nothing are reported and never ingested, so an
 * unexpected file — e.g. a ZUS sample case — cannot slip into the index.
 */
export async function resolveLocalDocuments(
  directory: string,
  definitions: DocumentDefinition[]
): Promise<{
  resolved: ResolvedLocalDocument[]
  unmatchedFiles: string[]
  missing: DocumentDefinition[]
}> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() && SUPPORTED.has(path.extname(entry.name).toLowerCase())
    )
    .map((entry) => path.join(directory, entry.name))
    .sort()

  const local = definitions.filter(
    (definition) => definition.origin.kind === "local"
  )
  const resolved: ResolvedLocalDocument[] = []
  const used = new Set<string>()

  for (const definition of local) {
    if (definition.origin.kind !== "local") continue
    const byName = files.find(
      (file) =>
        path.basename(file) ===
        (definition.origin as { fileName: string }).fileName
    )
    if (byName) {
      resolved.push({ definition, filePath: byName, matchedBy: "fileName" })
      used.add(byName)
    }
  }

  const remaining = local.filter(
    (definition) => !resolved.some((entry) => entry.definition === definition)
  )
  if (remaining.length > 0) {
    // Score every (file, definition) pair by how early the detection phrases
    // occur — a regulation's title block also cites the Labour Code, but
    // later than its own Dz.U. reference — then assign greedily, best first.
    const matches: Array<{
      file: string
      definition: DocumentDefinition
      score: number
    }> = []
    for (const file of files) {
      if (used.has(file)) continue
      const format = formatFromPath(file)
      const candidates = remaining.filter(
        (definition) => (definition.format ?? "pdf") === format
      )
      if (candidates.length === 0) continue
      let head: string
      try {
        const extracted = await extractFile(file, format)
        head = toSearchText(extracted.pages[0]?.text ?? "").slice(
          0,
          DETECT_WINDOW
        )
      } catch {
        continue
      }
      for (const definition of candidates) {
        if (definition.origin.kind !== "local") continue
        const positions = definition.origin.detect.map((phrase) =>
          head.indexOf(toSearchText(phrase))
        )
        if (
          positions.length === 0 ||
          positions.some((position) => position < 0)
        )
          continue
        matches.push({ file, definition, score: Math.max(...positions) })
      }
    }
    matches.sort((a, b) => a.score - b.score)
    for (const match of matches) {
      if (
        used.has(match.file) ||
        resolved.some((entry) => entry.definition === match.definition)
      )
        continue
      resolved.push({
        definition: match.definition,
        filePath: match.file,
        matchedBy: "content",
      })
      used.add(match.file)
    }
  }

  return {
    resolved,
    unmatchedFiles: files.filter((file) => !used.has(file)),
    missing: local.filter(
      (definition) => !resolved.some((entry) => entry.definition === definition)
    ),
  }
}
