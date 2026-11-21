import { desc, eq, sql } from "drizzle-orm"

import type { Database } from "../client"
import { benefitCalculations, benefitCases, users } from "../schema"
import type {
  BenefitCaseSummary,
  BenefitRepository,
  CalculationSummary,
  SaveCalculationInput,
} from "./interfaces"

export class DrizzleBenefitRepository implements BenefitRepository {
  constructor(private readonly db: Database) {}

  async countCases(): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(benefitCases)
    return row?.value ?? 0
  }

  async countCalculations(): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(benefitCalculations)
    return row?.value ?? 0
  }

  async listCases(limit = 10): Promise<BenefitCaseSummary[]> {
    return this.db
      .select({
        id: benefitCases.id,
        caseNumber: benefitCases.caseNumber,
        title: benefitCases.title,
        status: benefitCases.status,
        dueDate: benefitCases.dueDate,
        ownerName: users.displayName,
        createdAt: benefitCases.createdAt,
      })
      .from(benefitCases)
      .innerJoin(users, eq(users.id, benefitCases.userId))
      .orderBy(desc(benefitCases.createdAt))
      .limit(limit)
  }

  async listRecentCalculations(limit = 10): Promise<CalculationSummary[]> {
    return this.db
      .select({
        id: benefitCalculations.id,
        caseId: benefitCalculations.caseId,
        totalAmountGrosze: benefitCalculations.totalAmountGrosze,
        status: benefitCalculations.status,
        engineVersion: benefitCalculations.engineVersion,
        createdAt: benefitCalculations.createdAt,
      })
      .from(benefitCalculations)
      .orderBy(desc(benefitCalculations.createdAt))
      .limit(limit)
  }

  async findFirstCaseForEmail(email: string): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: benefitCases.id })
      .from(benefitCases)
      .innerJoin(users, eq(users.id, benefitCases.userId))
      .where(eq(users.email, email))
      .limit(1)
    return row ?? null
  }

  async saveCalculation(input: SaveCalculationInput): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(benefitCalculations)
      .values({
        caseId: input.caseId,
        scenarioId: input.scenarioId,
        ruleVersionId: input.ruleVersionId,
        input: input.input,
        result: input.result,
        totalAmountGrosze: Math.round(input.totalAmountGrosze),
        status: input.status,
        engineVersion: input.engineVersion ?? "0.1.0-scaffold",
      })
      .returning({ id: benefitCalculations.id })

    if (!row) throw new Error("Nie udało się zapisać kalkulacji")
    return row
  }
}
