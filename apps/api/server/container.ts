import { getEnv, type Env } from "@zpr/contracts/env"
import { getDatabaseConnection } from "@zpr/db/client"
import {
  createRetrievalService,
  type RetrievalService,
} from "@zpr/rag/retrieval"
import { createRepositories, type Repositories } from "@zpr/db/repositories"

type GlobalWithContainer = typeof globalThis & {
  __zprRepositories?: Repositories
  __zprRetrieval?: RetrievalService
}

const globalForContainer = globalThis as GlobalWithContainer

export function getRepositories(): Repositories {
  if (!globalForContainer.__zprRepositories) {
    const { db } = getDatabaseConnection()
    globalForContainer.__zprRepositories = createRepositories(db)
  }
  return globalForContainer.__zprRepositories
}

/**
 * Hybrid retrieval over the knowledge base. Readable access levels come from
 * KB_RETRIEVAL_ACCESS_LEVELS (never RESTRICTED); the embedding configuration
 * is the same EMBEDDING_* used by `kb:seed`.
 */
export function getRetrieval(): RetrievalService {
  if (!globalForContainer.__zprRetrieval) {
    const { db } = getDatabaseConnection()
    globalForContainer.__zprRetrieval = createRetrievalService({
      db,
      env: getEnv(),
    })
  }
  return globalForContainer.__zprRetrieval
}

export interface Container {
  env: Env
  repositories: Repositories
  retrieval: RetrievalService
}

export function getContainer(): Container {
  return {
    env: getEnv(),
    repositories: getRepositories(),
    retrieval: getRetrieval(),
  }
}
