/**
 * A structural unit is the smallest piece of text that must not be split
 * without repeating its context: a legal provision (ust./§) with its points,
 * or a guide paragraph, list or table.
 */
export interface StructuralUnit {
  kind: "provision" | "paragraph" | "list" | "table"
  /** Breadcrumb of headings, outermost first. */
  headingPath: string[]
  /**
   * Units with different boundary keys are never merged into one chunk
   * (one article, one regulation paragraph, one guide section).
   */
  boundaryKey: string
  /** Introductory sentence of an enumeration ("…obejmują:"). */
  leadIn?: string
  /** Enumeration items (pkt / lit. / bullets), each kept whole. */
  items?: string[]
  /** Wrap-up after an enumeration ("– zasiłek przysługuje…"). */
  closing?: string
  /** Plain text when the unit has no enumeration. */
  text?: string
  pageStart: number
  pageEnd: number
  locator: {
    article?: string
    paragraph?: string
    paragraphLabel?: "ust." | "§"
    section?: string
  }
  /** ISO date from an amendment note; the unit is not valid before it. */
  validFrom?: string
  /** ISO date from a repeal note; the unit is not valid from this date. */
  validTo?: string
  /** Amendment notes that apply to the unit (kept for the audit trail). */
  amendments?: string[]
  tags?: string[]
}

export interface StructuredDocument {
  units: StructuralUnit[]
  stats: { repealedSkipped: number; headings: number }
}

export function unitText(unit: StructuralUnit): string {
  if (!unit.items || unit.items.length === 0) return unit.text ?? ""
  return [unit.leadIn, ...unit.items, unit.closing]
    .filter((part): part is string => Boolean(part))
    .join("\n")
}
