import type {
  DataScope,
  DataSourceId,
  SourceFetchResult,
} from "@zpr/contracts/data-import"
import type { MobywatelPersona } from "@zpr/contracts/mobywatel"

import { PROVIDERS, PROVIDER_ORDER } from "./providers"
import type { DataImportScenario } from "./types"

export function sourceSupportsScope(
  sourceId: DataSourceId,
  scopes: readonly DataScope[]
): boolean {
  const provider = PROVIDERS[sourceId]
  return provider.supportedScopes.some((scope) => scopes.includes(scope))
}

/** Sources that should run for the consented scope selection. */
export function sourcesForScopes(
  scopes: readonly DataScope[]
): DataSourceId[] {
  return PROVIDER_ORDER.filter((sourceId) =>
    sourceSupportsScope(sourceId, scopes)
  )
}

export function fetchSource(input: {
  scenario: DataImportScenario
  persona: MobywatelPersona
  sourceId: DataSourceId
  scopes: readonly DataScope[]
  now: string
}): SourceFetchResult {
  return PROVIDERS[input.sourceId].fetch({
    scenario: input.scenario,
    persona: input.persona,
    scopes: input.scopes,
    now: input.now,
  })
}

export function fetchSelectedSources(input: {
  scenario: DataImportScenario
  persona: MobywatelPersona
  scopes: readonly DataScope[]
  now: string
}): SourceFetchResult[] {
  return sourcesForScopes(input.scopes).map((sourceId) =>
    fetchSource({ ...input, sourceId })
  )
}
