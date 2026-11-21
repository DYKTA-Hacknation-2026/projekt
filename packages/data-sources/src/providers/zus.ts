import type { SourceActivity } from "@zpr/contracts/data-import"

import type { DataSourceProvider } from "../types"
import { buildResult, hasScope } from "./shared"

export const zusProvider: DataSourceProvider = {
  id: "ZUS",
  label: "ZUS — ubezpieczenie i składki",
  institution: "Zakład Ubezpieczeń Społecznych (symulacja)",
  description:
    "Historia tytułów ubezpieczenia, tryb obowiązkowy lub dobrowolny, podstawy wymiaru składek, zaległości i podstawa zasiłku.",
  supportedScopes: [
    "INSURANCE_HISTORY",
    "CONTRIBUTION_BASIS",
    "CONTRIBUTION_STATUS",
  ],
  activities: [
    {
      id: "zus-insurance",
      label: "ZUS — pobieranie historii ubezpieczenia",
      scopes: ["INSURANCE_HISTORY"],
    },
    {
      id: "zus-basis",
      label: "ZUS — pobieranie podstaw wymiaru składek",
      scopes: ["CONTRIBUTION_BASIS"],
    },
    {
      id: "zus-arrears",
      label: "ZUS — sprawdzanie opłaconych składek i zaległości",
      scopes: ["CONTRIBUTION_STATUS"],
    },
  ],
  fetch(context) {
    const scopes = context.scopes
    const source = context.scenario.sources.ZUS
    const insurance = hasScope(scopes, ["INSURANCE_HISTORY"])
    const basis = hasScope(scopes, ["CONTRIBUTION_BASIS"])
    const status = hasScope(scopes, ["CONTRIBUTION_STATUS"])

    const data = {
      source: "ZUS" as const,
      insurancePeriods: insurance ? source.insurancePeriods : [],
      contributionBases: basis ? source.contributionBases : [],
      benefitBasis: basis ? source.benefitBasis : null,
      arrears: status ? source.arrears : null,
    }

    const activities: SourceActivity[] = this.activities
      .filter((activity) => hasScope(scopes, activity.scopes))
      .map((activity) => {
        const present =
          activity.id === "zus-insurance"
            ? data.insurancePeriods.length > 0
            : activity.id === "zus-basis"
              ? data.contributionBases.length > 0 ||
                data.benefitBasis !== null
              : data.arrears !== null
        return {
          id: activity.id,
          label: activity.label,
          status: present ? "SUCCESS" : "EMPTY",
        }
      })

    return buildResult(context, this, {
      data,
      dataPresent:
        data.insurancePeriods.length > 0 ||
        data.contributionBases.length > 0 ||
        data.arrears !== null ||
        data.benefitBasis !== null,
      activities,
    })
  },
}
