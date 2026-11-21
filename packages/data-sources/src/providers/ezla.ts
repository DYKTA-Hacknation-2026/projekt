import type { DataSourceProvider } from "../types"
import { buildResult, hasScope } from "./shared"

export const ezlaProvider: DataSourceProvider = {
  id: "EZLA",
  label: "e-ZLA — zwolnienia lekarskie",
  institution: "System e-ZLA (symulacja)",
  description:
    "Okresy niezdolności do pracy, daty i informacja, czy zwolnienie jest związane z ciążą. Bez diagnozy i danych medycznych.",
  supportedScopes: ["SICK_LEAVE_HISTORY"],
  activities: [
    {
      id: "ezla-leaves",
      label: "e-ZLA — pobieranie informacji o zwolnieniach",
      scopes: ["SICK_LEAVE_HISTORY"],
    },
  ],
  fetch(context) {
    const requested = hasScope(context.scopes, ["SICK_LEAVE_HISTORY"])
    const source = context.scenario.sources.EZLA
    const data = {
      source: "EZLA" as const,
      sickLeaves: requested ? source.sickLeaves : [],
    }

    return buildResult(context, this, {
      data,
      dataPresent: data.sickLeaves.length > 0,
      activities: [
        {
          id: "ezla-leaves",
          label: "e-ZLA — pobieranie informacji o zwolnieniach",
          status: data.sickLeaves.length > 0 ? "SUCCESS" : "EMPTY",
        },
      ],
    })
  },
}
