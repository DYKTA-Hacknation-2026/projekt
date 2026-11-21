export type RankedListName = "vector" | "lexical" | "exact" | "phrase"

export interface RankedCandidate {
  chunkId: string
  /** 1-based rank inside its list. */
  rank: number
  /** List-specific raw score (cosine similarity, ts_rank, match count). */
  score: number
}

export interface FusionOptions {
  strategy: "rrf" | "weighted"
  k: number
  weights: Record<RankedListName, number>
}

export interface FusedCandidate {
  chunkId: string
  fusedScore: number
  ranks: Partial<Record<RankedListName, number>>
  scores: Partial<Record<RankedListName, number>>
}

/**
 * Relevance fusion.
 *
 * rrf      — Reciprocal Rank Fusion: Σ wᵢ / (k + rankᵢ). Robust to score
 *            scales that differ between pgvector and ts_rank.
 * weighted — Σ wᵢ · normalisedScoreᵢ, with each list min–max normalised.
 */
export function fuse(
  lists: Partial<Record<RankedListName, RankedCandidate[]>>,
  options: FusionOptions
): FusedCandidate[] {
  const byId = new Map<string, FusedCandidate>()
  const entry = (chunkId: string) => {
    let current = byId.get(chunkId)
    if (!current) {
      current = { chunkId, fusedScore: 0, ranks: {}, scores: {} }
      byId.set(chunkId, current)
    }
    return current
  }

  for (const [name, candidates] of Object.entries(lists) as Array<
    [RankedListName, RankedCandidate[] | undefined]
  >) {
    if (!candidates || candidates.length === 0) continue
    const weight = options.weights[name]
    const max = Math.max(...candidates.map((candidate) => candidate.score))
    const min = Math.min(...candidates.map((candidate) => candidate.score))
    for (const candidate of candidates) {
      const current = entry(candidate.chunkId)
      current.ranks[name] = candidate.rank
      current.scores[name] = candidate.score
      if (options.strategy === "rrf") {
        current.fusedScore += weight / (options.k + candidate.rank)
      } else {
        const normalised =
          max === min ? 1 : (candidate.score - min) / (max - min)
        current.fusedScore += weight * normalised
      }
    }
  }

  return [...byId.values()].sort(
    (a, b) => b.fusedScore - a.fusedScore || a.chunkId.localeCompare(b.chunkId)
  )
}
