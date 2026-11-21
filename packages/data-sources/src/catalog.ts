import {
  DATA_IMPORT_DISCLOSURE,
  type DataScope,
  type DataSourceCatalog,
  type SourceScope,
} from "@zpr/contracts/data-import"

import { PROVIDER_ORDER, PROVIDERS } from "./providers"

export const SCOPE_LABELS: Record<
  DataScope,
  { label: string; description: string }
> = {
  INSURANCE_HISTORY: {
    label: "Historia ubezpieczenia",
    description: "Tytuły ubezpieczenia, okresy, tryb obowiązkowy lub dobrowolny.",
  },
  CONTRIBUTION_BASIS: {
    label: "Podstawy wymiaru składek",
    description: "Miesięczne podstawy i średnia podstawa zasiłku.",
  },
  CONTRIBUTION_STATUS: {
    label: "Opłacone składki i zaległości",
    description: "Status wpłat oraz ewentualne zaległości składkowe.",
  },
  EMPLOYMENT_HISTORY: {
    label: "Zatrudnienie i wynagrodzenie",
    description: "Pracodawca, umowa, etat, składniki i zmiany wynagrodzenia.",
  },
  SICK_LEAVE_HISTORY: {
    label: "Zwolnienia lekarskie",
    description: "Daty zwolnień i informacja o związku z ciążą — bez diagnozy.",
  },
  CHILD_DATA: {
    label: "Dane o dziecku",
    description: "Urodzenie, data, liczba dzieci z porodu i przysposobienie.",
  },
  BENEFIT_CASES: {
    label: "Sprawy i świadczenia",
    description: "Wnioski, decyzje, okresy wypłaty i dostępne dokumenty.",
  },
}

const ALL_SCOPES = Object.keys(SCOPE_LABELS) as DataScope[]

export function scopeInfo(scope: DataScope): SourceScope {
  return {
    id: scope,
    label: SCOPE_LABELS[scope].label,
    description: SCOPE_LABELS[scope].description,
  }
}

export const DATA_IMPORT_CATALOG: DataSourceCatalog = {
  sources: PROVIDER_ORDER.map((id) => {
    const provider = PROVIDERS[id]
    return {
      id,
      label: provider.label,
      institution: provider.institution,
      description: provider.description,
      simulated: true as const,
      scopes: provider.supportedScopes.map(scopeInfo),
      activities: provider.activities.map((activity) => ({
        id: activity.id,
        label: activity.label,
      })),
    }
  }),
  scopes: ALL_SCOPES.map(scopeInfo),
  disclaimer: DATA_IMPORT_DISCLOSURE,
}
