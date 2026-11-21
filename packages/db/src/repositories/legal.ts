import { desc, eq, sql } from "drizzle-orm"

import type { Database } from "../client"
import { legalRuleVersions, legalRules } from "../schema"
import type {
  LegalRepository,
  LegalRuleSummary,
} from "./interfaces"

export class DrizzleLegalRepository implements LegalRepository {
  constructor(private readonly db: Database) {}

  async countRules(): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(legalRules)
      .where(eq(legalRules.isActive, true))
    return row?.value ?? 0
  }

  async listRuleVersions(limit = 20): Promise<LegalRuleSummary[]> {
    return this.db
      .select({
        id: legalRuleVersions.id,
        code: legalRules.code,
        title: legalRules.title,
        category: legalRules.category,
        legalReference: legalRules.legalReference,
        verificationStatus: legalRuleVersions.verificationStatus,
        version: legalRuleVersions.version,
        effectiveFrom: legalRuleVersions.effectiveFrom,
      })
      .from(legalRuleVersions)
      .innerJoin(legalRules, eq(legalRules.id, legalRuleVersions.ruleId))
      .orderBy(desc(legalRuleVersions.effectiveFrom), legalRules.code)
      .limit(limit)
  }
}
