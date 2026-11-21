import type { DataSourceProvider } from "../types"
import { buildResult, hasScope } from "./shared"

export const employerProvider: DataSourceProvider = {
  id: "EMPLOYER",
  label: "Pracodawca / płatnik składek",
  institution: "Płatnik składek (symulacja)",
  description:
    "Dane identyfikacyjne płatnika, zatrudnienie, wymiar etatu, historia wynagrodzenia i jego składników, zmiany i nieobecności.",
  supportedScopes: ["EMPLOYMENT_HISTORY"],
  activities: [
    {
      id: "employer-employment",
      label: "Pracodawca — pobieranie informacji o zatrudnieniu i wynagrodzeniu",
      scopes: ["EMPLOYMENT_HISTORY"],
    },
  ],
  fetch(context) {
    const requested = hasScope(context.scopes, ["EMPLOYMENT_HISTORY"])
    const source = context.scenario.sources.EMPLOYER
    const data = {
      source: "EMPLOYER" as const,
      payers: requested ? source.payers : [],
      employments: requested ? source.employments : [],
    }

    return buildResult(context, this, {
      data,
      dataPresent: data.payers.length > 0 || data.employments.length > 0,
      activities: [
        {
          id: "employer-employment",
          label:
            "Pracodawca — pobieranie informacji o zatrudnieniu i wynagrodzeniu",
          status:
            data.payers.length > 0 || data.employments.length > 0
              ? "SUCCESS"
              : "EMPTY",
        },
      ],
    })
  },
}
