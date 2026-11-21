import type { Database } from "../client"
import { DrizzleBenefitRepository } from "./benefits"
import { DrizzleConversationRepository } from "./conversations"
import { DrizzleKnowledgeRepository } from "./knowledge"
import { DrizzleLegalRepository } from "./legal"
import { DrizzleHouseholdRepository, DrizzleUserRepository } from "./users"

export * from "./interfaces"

export interface Repositories {
  users: DrizzleUserRepository
  households: DrizzleHouseholdRepository
  benefits: DrizzleBenefitRepository
  legal: DrizzleLegalRepository
  knowledge: DrizzleKnowledgeRepository
  conversations: DrizzleConversationRepository
}

export function createRepositories(db: Database): Repositories {
  return {
    users: new DrizzleUserRepository(db),
    households: new DrizzleHouseholdRepository(db),
    benefits: new DrizzleBenefitRepository(db),
    legal: new DrizzleLegalRepository(db),
    knowledge: new DrizzleKnowledgeRepository(db),
    conversations: new DrizzleConversationRepository(db),
  }
}
