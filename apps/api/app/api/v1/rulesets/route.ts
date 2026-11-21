import {
  ASSUMPTIONS,
  ENGINE_VERSION,
  RULES,
  RULE_SETS,
  SOURCE_DOCUMENTS,
  UNSUPPORTED_SCENARIOS,
} from "@zpr/domain/engine"

import { apiRoute, json } from "@/server/http/route"

export const dynamic = "force-static"

/** Published rule set versions, the rule catalogue with sources, assumptions and unsupported scenarios. */
export const GET = apiRoute(async () =>
  json({
    engineVersion: ENGINE_VERSION,
    ruleSets: RULE_SETS.map((set) => ({
      version: set.version,
      label: set.label,
      status: set.status,
      effectiveFrom: set.effectiveFrom,
      effectiveTo: set.effectiveTo,
      changes: set.changes,
      rules: set.rules,
      parameters: set.parameters,
      parameterMeta: set.parameterMeta,
    })),
    rules: RULES,
    sources: SOURCE_DOCUMENTS,
    assumptions: ASSUMPTIONS,
    unsupported: UNSUPPORTED_SCENARIOS,
  })
)
