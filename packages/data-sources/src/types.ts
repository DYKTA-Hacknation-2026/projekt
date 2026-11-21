import type {
  DataScope,
  DataSourceId,
  EmployerSourceData,
  EzlaSourceData,
  PueSourceData,
  SourceIssue,
  SourceFetchStatus,
  UscSourceData,
  ZusSourceData,
} from "@zpr/contracts/data-import"
import type { MobywatelPersona } from "@zpr/contracts/mobywatel"

/**
 * One complete, internally consistent demo scenario. The scenario owns the
 * institution payloads; personal data always comes from the selected
 * mObywatel persona so the login and the retrieved records cannot disagree.
 */
export interface DataImportScenario {
  id: string
  label: string
  description: string
  personaIds: readonly string[]
  parentRole: "MOTHER" | "FATHER"
  family: {
    eventType: "PREGNANCY" | "BIRTH" | "ADOPTION" | "FOSTER_CARE"
    expectedDueDate?: string
    eventDate?: string
    childrenCount?: number
    hasZaZyciem?: boolean
    isPremature?: boolean
  }
  sources: {
    ZUS: ZusSourceData
    EMPLOYER: EmployerSourceData
    EZLA: EzlaSourceData
    USC: UscSourceData
    PUE: PueSourceData
  }
  availability: Record<DataSourceId, SourceFetchStatus>
  sourceIssues?: Partial<Record<DataSourceId, SourceIssue[]>>
  notes: readonly string[]
}

export interface FetchContext {
  scenario: DataImportScenario
  persona: MobywatelPersona
  scopes: readonly DataScope[]
  /** ISO timestamp supplied by the caller so tests stay deterministic. */
  now: string
}

export interface SourceActivityDefinition {
  id: string
  label: string
  scopes: readonly DataScope[]
}

export interface DataSourceProvider {
  readonly id: DataSourceId
  readonly label: string
  readonly institution: string
  readonly supportedScopes: readonly DataScope[]
  readonly activities: readonly SourceActivityDefinition[]
  readonly description: string
  fetch(context: FetchContext): import("@zpr/contracts/data-import").SourceFetchResult
}
