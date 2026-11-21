import type { DataSourceProvider } from "../types"
import { buildResult, hasScope } from "./shared"

export const pueProvider: DataSourceProvider = {
  id: "PUE",
  label: "PUE/eZUS — sprawy i świadczenia",
  institution: "Platforma Usług Elektronicznych ZUS (symulacja)",
  description:
    "Historia wniosków, statusy spraw, przyznane świadczenia, okresy wypłaty, decyzje i dostępne zaświadczenia.",
  supportedScopes: ["BENEFIT_CASES"],
  activities: [
    {
      id: "pue-cases",
      label: "PUE/eZUS — pobieranie spraw i świadczeń",
      scopes: ["BENEFIT_CASES"],
    },
    {
      id: "pue-documents",
      label: "PUE/eZUS — pobieranie decyzji i zaświadczeń",
      scopes: ["BENEFIT_CASES"],
    },
  ],
  fetch(context) {
    const requested = hasScope(context.scopes, ["BENEFIT_CASES"])
    const source = context.scenario.sources.PUE
    const data = {
      source: "PUE" as const,
      cases: requested ? source.cases : [],
      documents: requested ? source.documents : [],
    }

    return buildResult(context, this, {
      data,
      dataPresent: data.cases.length > 0 || data.documents.length > 0,
      activities: [
        {
          id: "pue-cases",
          label: "PUE/eZUS — pobieranie spraw i świadczeń",
          status: data.cases.length > 0 ? "SUCCESS" : "EMPTY",
        },
        {
          id: "pue-documents",
          label: "PUE/eZUS — pobieranie decyzji i zaświadczeń",
          status: data.documents.length > 0 ? "SUCCESS" : "EMPTY",
        },
      ],
    })
  },
}
