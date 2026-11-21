import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm"

import type { Database } from "../client"
import { legalRuleVersions, legalRules } from "../schema"
import type {
  LegalRepository,
  LegalRuleParameterRecord,
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

  async getRuleParameters(asOf: string): Promise<LegalRuleParameterRecord[]> {
    const rows = await this.db
      .selectDistinctOn([legalRuleVersions.ruleId], {
        id: legalRuleVersions.id,
        code: legalRules.code,
        version: legalRuleVersions.version,
        effectiveFrom: legalRuleVersions.effectiveFrom,
        effectiveTo: legalRuleVersions.effectiveTo,
        verificationStatus: legalRuleVersions.verificationStatus,
        parameters: legalRuleVersions.parameters,
      })
      .from(legalRuleVersions)
      .innerJoin(legalRules, eq(legalRules.id, legalRuleVersions.ruleId))
      .where(
        and(
          eq(legalRules.isActive, true),
          lte(legalRuleVersions.effectiveFrom, asOf),
          or(
            isNull(legalRuleVersions.effectiveTo),
            gte(legalRuleVersions.effectiveTo, asOf)
          )
        )
      )
      .orderBy(
        legalRuleVersions.ruleId,
        desc(legalRuleVersions.effectiveFrom),
        desc(legalRuleVersions.version)
      )

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      version: row.version,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
      verificationStatus: row.verificationStatus,
      parameters: row.parameters,
    }))
  }
}
