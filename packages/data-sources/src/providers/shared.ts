import type { DataScope, SourceFetchResult, SourceIssue } from "@zpr/contracts/data-import"

import type { DataSourceProvider, FetchContext } from "../types"

export function hasScope(
  scopes: readonly DataScope[],
  required: readonly DataScope[]
): boolean {
  return required.some((scope) => scopes.includes(scope))
}

export function buildResult(
  context: FetchContext,
  provider: DataSourceProvider,
  input: {
    data: SourceFetchResult["data"]
    dataPresent: boolean
    activities: SourceFetchResult["activities"]
    issues?: SourceIssue[]
  }
): SourceFetchResult {
  const configured = context.scenario.availability[provider.id]
  const status: SourceFetchResult["status"] =
    configured === "ERROR"
      ? "ERROR"
      : configured === "EMPTY"
        ? "EMPTY"
        : configured === "PARTIAL"
          ? "PARTIAL"
          : input.dataPresent
            ? "SUCCESS"
            : "EMPTY"

  const configuredIssues = context.scenario.sourceIssues?.[provider.id] ?? []
  const issues: SourceIssue[] = [...configuredIssues, ...(input.issues ?? [])]
  if (status === "ERROR") {
    issues.push({
      code: "SIMULATED_OUTAGE",
      message:
        "Symulowane źródło nie odpowiedziało. Możesz uzupełnić brakujące dane ręcznie.",
      severity: "ERROR",
    })
  }

  return {
    source: provider.id,
    label: provider.label,
    institution: provider.institution,
    requestedScopes: context.scopes.filter((scope) =>
      provider.supportedScopes.includes(scope)
    ),
    status,
    activities: input.activities.map((activity) => ({
      ...activity,
      status: status === "ERROR" ? "ERROR" : activity.status,
    })),
    data: status === "ERROR" ? null : input.data,
    issues,
    provenance: {
      institution: provider.institution,
      transport: "SIMULATED",
      scenarioId: context.scenario.id,
      fetchedAt: context.now,
    },
  }
}
