import { queryStems } from "../text/search-text"

export interface RerankCandidate {
  id: string
  content: string
  headingPath: string | null
  stemText: string
}

/**
 * Optional second-stage ranking. A cross-encoder (hosted or local) can
 * implement this port; the built-in one is deterministic and offline.
 */
export interface Reranker {
  readonly name: string
  /** Returns one score per candidate, higher is better, in input order. */
  rerank(query: string, candidates: RerankCandidate[]): Promise<number[]>
}

/**
 * Lexical reranker: stem coverage, heading match and term proximity. Cheap
 * stand-in for a cross-encoder that favours chunks answering the whole
 * question rather than repeating one word.
 */
export class LexicalReranker implements Reranker {
  readonly name = "lexical"

  async rerank(
    query: string,
    candidates: RerankCandidate[]
  ): Promise<number[]> {
    const stems = queryStems(query)
    if (stems.length === 0) return candidates.map(() => 0)
    return candidates.map((candidate) => {
      const tokens = candidate.stemText.split(" ")
      const positions = new Map<string, number[]>()
      tokens.forEach((token, index) => {
        positions.set(token, [...(positions.get(token) ?? []), index])
      })
      const present = stems.filter((stem) => positions.has(stem))
      const coverage = present.length / stems.length
      const heading = candidate.headingPath
        ? queryStems(candidate.headingPath)
        : []
      const headingHits =
        stems.filter((stem) => heading.includes(stem)).length / stems.length

      // Smallest window containing all present stems (proximity).
      let proximity = 0
      if (present.length > 1) {
        const points = present.flatMap((stem) =>
          (positions.get(stem) ?? []).map((pos) => ({ stem, pos }))
        )
        points.sort((a, b) => a.pos - b.pos)
        let best = Infinity
        const counts = new Map<string, number>()
        let left = 0
        for (let right = 0; right < points.length; right += 1) {
          const point = points[right]
          if (!point) continue
          counts.set(point.stem, (counts.get(point.stem) ?? 0) + 1)
          while (counts.size === present.length) {
            const leftPoint = points[left]
            if (!leftPoint) break
            best = Math.min(best, point.pos - leftPoint.pos + 1)
            const count = (counts.get(leftPoint.stem) ?? 1) - 1
            if (count === 0) counts.delete(leftPoint.stem)
            else counts.set(leftPoint.stem, count)
            left += 1
          }
        }
        proximity = Number.isFinite(best) ? present.length / best : 0
      }
      return 0.6 * coverage + 0.25 * headingHits + 0.15 * proximity
    })
  }
}
