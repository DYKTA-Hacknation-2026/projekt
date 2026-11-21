import type { DataSourceProvider } from "../types"
import { buildResult, hasScope } from "./shared"

export const uscProvider: DataSourceProvider = {
  id: "USC",
  label: "USC — dane o dziecku",
  institution: "Urząd stanu cywilnego (symulacja)",
  description:
    "Akt urodzenia, data urodzenia, liczba dzieci z jednego porodu, przysposobienie i zdarzenie rodzinne potrzebne do ustalenia świadczenia.",
  supportedScopes: ["CHILD_DATA"],
  activities: [
    {
      id: "usc-children",
      label: "USC — pobieranie informacji o dziecku",
      scopes: ["CHILD_DATA"],
    },
  ],
  fetch(context) {
    const requested = hasScope(context.scopes, ["CHILD_DATA"])
    const source = context.scenario.sources.USC
    const data = {
      source: "USC" as const,
      children: requested ? source.children : [],
      familyEvents: requested ? source.familyEvents : [],
    }

    return buildResult(context, this, {
      data,
      dataPresent: data.children.length > 0 || data.familyEvents.length > 0,
      activities: [
        {
          id: "usc-children",
          label: "USC — pobieranie informacji o dziecku",
          status:
            data.children.length > 0 || data.familyEvents.length > 0
              ? "SUCCESS"
              : "EMPTY",
        },
      ],
    })
  },
}
