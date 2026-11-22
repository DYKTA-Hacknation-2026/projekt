import { and, asc, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm"

import type { Database } from "../client"
import { legalRuleVersions, legalRules } from "../schema"
import type {
  CreateLegalRuleVersionInput,
  LegalRepository,
  LegalRuleParameterRecord,
  LegalRuleSummary,
  LegalRuleVersionDetail,
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

  async listRuleVersionsDetailed(): Promise<LegalRuleVersionDetail[]> {
    const rows = await this.db
      .select({
        id: legalRuleVersions.id,
        ruleId: legalRules.id,
        code: legalRules.code,
        title: legalRules.title,
        description: legalRules.description,
        category: legalRules.category,
        legalReference: legalRules.legalReference,
        version: legalRuleVersions.version,
        effectiveFrom: legalRuleVersions.effectiveFrom,
        effectiveTo: legalRuleVersions.effectiveTo,
        verificationStatus: legalRuleVersions.verificationStatus,
        parameters: legalRuleVersions.parameters,
        sourceUrl: legalRuleVersions.sourceUrl,
        notes: legalRuleVersions.notes,
        createdAt: legalRuleVersions.createdAt,
      })
      .from(legalRuleVersions)
      .innerJoin(legalRules, eq(legalRules.id, legalRuleVersions.ruleId))
      .where(eq(legalRules.isActive, true))
      .orderBy(
        asc(legalRules.code),
        desc(legalRuleVersions.effectiveFrom),
        desc(legalRuleVersions.version)
      )

    return rows.map(toDetail)
  }

  async createRuleVersion(
    input: CreateLegalRuleVersionInput
  ): Promise<LegalRuleVersionDetail> {
    return this.db.transaction(async (tx) => {
      const [latest] = await tx
        .select()
        .from(legalRuleVersions)
        .where(eq(legalRuleVersions.ruleId, input.ruleId))
        .orderBy(desc(legalRuleVersions.effectiveFrom))
        .limit(1)
        .for("update")

      if (
        latest &&
        input.closePreviousTo &&
        (!latest.effectiveTo || latest.effectiveTo >= input.closePreviousTo)
      ) {
        await tx
          .update(legalRuleVersions)
          .set({ effectiveTo: input.closePreviousTo })
          .where(eq(legalRuleVersions.id, latest.id))
      }

      const [inserted] = await tx
        .insert(legalRuleVersions)
        .values({
          ruleId: input.ruleId,
          version: input.version,
          effectiveFrom: input.effectiveFrom,
          parameters: input.parameters,
          verificationStatus: input.verificationStatus,
          sourceUrl: input.sourceUrl,
          notes: input.notes,
        })
        .returning()

      if (!inserted) {
        throw new Error("Nie udało się zapisać nowej wersji reguły.")
      }

      const [rule] = await tx
        .select()
        .from(legalRules)
        .where(eq(legalRules.id, input.ruleId))
        .limit(1)

      if (!rule) {
        throw new Error("Nie znaleziono reguły dla zapisanej wersji.")
      }

      return {
        id: inserted.id,
        ruleId: rule.id,
        code: rule.code,
        title: rule.title,
        description: rule.description,
        category: rule.category,
        legalReference: rule.legalReference,
        version: inserted.version,
        effectiveFrom: inserted.effectiveFrom,
        effectiveTo: inserted.effectiveTo,
        verificationStatus: inserted.verificationStatus,
        parameters: inserted.parameters,
        sourceUrl: inserted.sourceUrl,
        notes: inserted.notes,
        createdAt: inserted.createdAt,
      }
    })
  }
}

function toDetail(row: {
  id: string
  ruleId: string
  code: string
  title: string
  description: string
  category: string
  legalReference: string
  version: string
  effectiveFrom: string
  effectiveTo: string | null
  verificationStatus: "VERIFIED" | "UNVERIFIED" | "PROPOSED"
  parameters: Record<string, unknown>
  sourceUrl: string | null
  notes: string | null
  createdAt: Date
}): LegalRuleVersionDetail {
  return { ...row }
}
