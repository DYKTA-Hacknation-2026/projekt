import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"

import type { DocumentFormCode, SampleCaseExpected, SampleCaseSummary } from "@zpr/contracts/documents"

/**
 * Private object storage for uploaded PDFs. Keys are opaque (`uploads/<uuid>`)
 * — never derived from the file name — and no implementation returns a
 * public URL: files are served only through the session-bound API.
 *
 * `LocalFileStorage` is for development and tests (a git-ignored directory
 * outside `public/`). Production swaps in a private bucket (S3-compatible)
 * implementing the same interface.
 */
export interface DocumentStorage {
  readonly kind: string
  put(key: string, bytes: Uint8Array): Promise<void>
  get(key: string): Promise<Uint8Array | null>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

const KEY = /^[a-z0-9-]+\/[0-9a-f-]{36}$/

function assertKey(key: string): void {
  if (!KEY.test(key)) throw new Error("Nieprawidłowy klucz pliku")
}

export class LocalFileStorage implements DocumentStorage {
  readonly kind = "local"

  constructor(private readonly root: string) {}

  private file(key: string): string {
    assertKey(key)
    const resolved = path.resolve(this.root, `${key}.pdf`)
    if (!resolved.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Nieprawidłowy klucz pliku")
    return resolved
  }

  async put(key: string, bytes: Uint8Array): Promise<void> {
    const file = this.file(key)
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
    await writeFile(file, bytes, { mode: 0o600, flag: "wx" })
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      return new Uint8Array(await readFile(this.file(key)))
    } catch {
      return null
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.file(key), { force: true })
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.file(key))
      return true
    } catch {
      return false
    }
  }
}

export class MemoryStorage implements DocumentStorage {
  readonly kind = "memory"
  readonly files = new Map<string, Uint8Array>()

  async put(key: string, bytes: Uint8Array): Promise<void> {
    assertKey(key)
    this.files.set(key, bytes)
  }
  async get(key: string): Promise<Uint8Array | null> {
    return this.files.get(key) ?? null
  }
  async delete(key: string): Promise<void> {
    this.files.delete(key)
  }
  async exists(key: string): Promise<boolean> {
    return this.files.has(key)
  }
}

/* ------------------------------------------------------------------------ */
/* Private sample-case manifest (fixtures/private, git-ignored, Q-19)        */
/* ------------------------------------------------------------------------ */

export interface PrivateSampleCase extends SampleCaseSummary {
  origin: "PRIVATE"
  /** Absolute path of the PDF inside the private directory. */
  filePath: string
}

interface ManifestEntry {
  id: string
  code: string
  label: string
  description?: string
  formCode: DocumentFormCode
  file: string
  expected?: SampleCaseExpected
  visibleInDemo?: boolean
}

const PRIVATE_WATERMARK = "Przykład ZUS – wyłącznie do celów HackNation"

/**
 * Reads `<dir>/manifest.json` (`{ "cases": [...] }`). Missing directory or
 * manifest → no private cases. Files must stay inside `dir`.
 */
export async function loadPrivateSampleCases(dir: string | undefined): Promise<PrivateSampleCase[]> {
  if (!dir) return []
  let manifest: { cases?: ManifestEntry[] }
  try {
    manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8")) as { cases?: ManifestEntry[] }
  } catch {
    return []
  }
  const root = path.resolve(dir)
  return (manifest.cases ?? [])
    .filter((entry) => entry.visibleInDemo !== false && /^[a-z0-9-]{1,60}$/.test(entry.id) && typeof entry.file === "string")
    .map((entry) => ({
      id: `private-${entry.id}`,
      code: entry.code,
      label: entry.label,
      description: entry.description ?? "",
      formCode: entry.formCode,
      origin: "PRIVATE" as const,
      expected: entry.expected,
      watermark: PRIVATE_WATERMARK,
      filePath: path.resolve(root, entry.file),
    }))
    .filter((entry) => entry.filePath.startsWith(root + path.sep))
}
