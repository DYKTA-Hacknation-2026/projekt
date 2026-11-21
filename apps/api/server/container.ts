import { getEnv, type Env } from "@zpr/contracts/env"
import { getDatabaseConnection } from "@zpr/db/client"
import {
  createRepositories,
  type Repositories,
} from "@zpr/db/repositories"

type GlobalWithContainer = typeof globalThis & {
  __zprRepositories?: Repositories
}

const globalForContainer = globalThis as GlobalWithContainer

export function getRepositories(): Repositories {
  if (!globalForContainer.__zprRepositories) {
    const { db } = getDatabaseConnection()
    globalForContainer.__zprRepositories = createRepositories(db)
  }
  return globalForContainer.__zprRepositories
}

export interface Container {
  env: Env
  repositories: Repositories
}

export function getContainer(): Container {
  return {
    env: getEnv(),
    repositories: getRepositories(),
  }
}
