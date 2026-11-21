import type { EvidenceSource } from "@zpr/contracts/assistant"
import type { KnowledgeChunkResult } from "@zpr/contracts/knowledge"

import { neutralizeEvidence } from "./guards/injection"
import type { AssistantToolName, ProfileAccess, ToolCallRecord } from "./types"

const MAX_SOURCES = 12
const QUOTE_LENGTH = 320

function excerpt(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

export interface LedgerEntry {
  source: EvidenceSource
  /** Full, neutralised passage text — shown to the model, never to the UI when citation-only. */
  content: string
}

/**
 * Per-turn state shared by the tools, the policy and the guards.
 *
 * The evidence ledger is the only place citation labels come from: a label
 * `[S#]` is valid only if a passage was retrieved under that label during the
 * current turn. Labels from earlier turns are never carried over.
 */
export class TurnState {
  private readonly entries = new Map<string, LedgerEntry>()
  private readonly byChunk = new Map<string, string>()
  readonly toolCalls: ToolCallRecord[] = []
  private profile: Promise<ProfileAccess> | null = null
  /** Set by the search tool; lets guards know retrieval ran. */
  searches = 0
  noEvidenceSearches = 0

  constructor(readonly asOf: string) {}

  register(chunks: KnowledgeChunkResult[]): EvidenceSource[] {
    const registered: EvidenceSource[] = []
    for (const chunk of chunks) {
      const existing = this.byChunk.get(chunk.id)
      if (existing) {
        registered.push(this.entries.get(existing)!.source)
        continue
      }
      if (this.entries.size >= MAX_SOURCES) break

      const ref = `S${this.entries.size + 1}`
      const citationOnly = chunk.redistribution === "CITATION_ONLY"
      const neutral = neutralizeEvidence(chunk.content)
      const source: EvidenceSource = {
        ref,
        chunkId: chunk.id,
        sourceTitle: chunk.sourceTitle,
        documentTitle: chunk.documentTitle,
        sourceType: chunk.sourceType,
        sourceUrl: chunk.sourceUrl,
        legalReference: chunk.legalReference,
        sectionIdentifier: chunk.sectionIdentifier,
        headingPath: chunk.headingPath,
        pageNumber: chunk.pageNumber,
        pageEnd: chunk.pageEnd,
        validFrom: chunk.validFrom,
        validTo: chunk.validTo,
        quote: citationOnly ? null : excerpt(neutral.text, QUOTE_LENGTH),
        citationOnly,
        relevance: chunk.relevance.relevance,
        flagged: neutral.flagged,
      }
      this.entries.set(ref, { source, content: neutral.text })
      this.byChunk.set(chunk.id, ref)
      registered.push(source)
    }
    return registered
  }

  sources(): EvidenceSource[] {
    return [...this.entries.values()].map((entry) => entry.source)
  }

  entry(ref: string): LedgerEntry | undefined {
    return this.entries.get(ref)
  }

  entriesList(): LedgerEntry[] {
    return [...this.entries.values()]
  }

  hasRef(ref: string): boolean {
    return this.entries.has(ref)
  }

  /** Loads the profile once per turn, however many tools need it. */
  loadProfileOnce(load: () => Promise<ProfileAccess>): Promise<ProfileAccess> {
    this.profile ??= load().then((access) => {
      this.profileStatus = access.status
      return access
    })
    return this.profile
  }

  /** Status of the profile lookup, or null if no tool needed the profile. */
  profileStatus: ProfileAccess["status"] | null = null

  record(call: ToolCallRecord): void {
    this.toolCalls.push(call)
  }

  called(name: AssistantToolName): boolean {
    return this.toolCalls.some((call) => call.toolName === name)
  }

  outputsOf<T = unknown>(name: AssistantToolName): T[] {
    return this.toolCalls
      .filter((call) => call.toolName === name && call.status === "SUCCEEDED")
      .map((call) => call.output as T)
  }
}

/** Human-readable locator: "KP art. 180 § 1, s. 3". */
export function locator(source: EvidenceSource): string {
  const reference =
    source.legalReference ?? source.sectionIdentifier ?? source.headingPath
  const page = source.pageNumber
    ? `, s. ${source.pageNumber}${source.pageEnd && source.pageEnd !== source.pageNumber ? `–${source.pageEnd}` : ""}`
    : ""
  return `${reference ?? source.documentTitle}${page}`
}
