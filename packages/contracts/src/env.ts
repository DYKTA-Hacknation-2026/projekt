import { z } from "zod"

const booleanFromEnv = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === "boolean") return value
  return ["1", "true", "yes", "on"].includes(value.toLowerCase())
})

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(z.url().optional())

/**
 * Single source of truth for environment configuration.
 *
 * Development defaults make `next build` and `vitest` work without a local
 * `.env`. Production deployments must override the secrets and URLs; the
 * refinements below reject placeholder secrets outside development.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_NAME: z.string().trim().min(1).default("Zasiłkowy Przewodnik"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .trim()
    .min(1)
    .default("postgresql://zpr:zpr_local_password@localhost:5435/zpr"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  DATABASE_SSL: booleanFromEnv.default(false),

  /**
   * `local-demo` is the deterministic offline hashing model. `openai`,
   * `ollama` and `openai-compatible` call an OpenAI-style `/embeddings` API.
   * Index time and query time always use this one configuration.
   */
  EMBEDDING_PROVIDER: z
    .enum(["local-demo", "openai", "ollama", "openai-compatible"])
    .default("local-demo"),
  EMBEDDING_MODEL: z.string().trim().default("zpr-hash-1024"),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().min(64).max(8192).default(1024),
  EMBEDDING_BASE_URL: optionalUrl,
  EMBEDDING_API_KEY: z.string().trim().optional(),
  /** Instruction prefixes for asymmetric models (e.g. e5: "query: "). */
  EMBEDDING_QUERY_PREFIX: z.string().default(""),
  EMBEDDING_DOCUMENT_PREFIX: z.string().default(""),
  EMBEDDING_BATCH_SIZE: z.coerce.number().int().min(1).max(2048).default(64),
  EMBEDDING_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30000),

  /**
   * Access levels the public retrieval API may read. RESTRICTED is never
   * readable regardless of this value. Use `PUBLIC` for a public deployment;
   * `PUBLIC,INTERNAL` lets the HackNation demo use competition references.
   */
  KB_RETRIEVAL_ACCESS_LEVELS: z
    .string()
    .default("PUBLIC,INTERNAL")
    .transform((value) =>
      value
        .split(",")
        .map((part) => part.trim().toUpperCase())
        .filter(
          (part): part is "PUBLIC" | "INTERNAL" =>
            part === "PUBLIC" || part === "INTERNAL"
        )
    ),
  /** Directory with locally provided (non-committed) source files. */
  KB_LOCAL_SOURCES_DIR: z.string().trim().optional(),

  /**
   * Chat model for the assistant. `none` runs the offline rules model: the
   * same orchestration, tools and retrieval, with answers composed
   * deterministically from tool results. `ollama` and `openai-compatible`
   * use an OpenAI-style `/chat/completions` endpoint at AI_BASE_URL.
   */
  AI_PROVIDER: z
    .enum(["none", "anthropic", "openai", "openrouter", "ollama", "openai-compatible"])
    .default("none"),
  AI_MODEL: z.string().trim().optional(),
  AI_API_KEY: z.string().trim().optional(),
  AI_BASE_URL: optionalUrl,
  AI_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.2),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(256).max(8192).default(1500),
  AI_MAX_STEPS: z.coerce.number().int().min(2).max(10).default(8),
  AI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(300000).default(60000),
  /** Messages from earlier turns passed to the model (text only). */
  AI_HISTORY_MESSAGES: z.coerce.number().int().min(0).max(40).default(12),

  SESSION_SECRET: z
    .string()
    .min(32)
    .default("dev-only-session-secret-change-me-32-chars"),
  ADMIN_EMAIL: z.email().default("admin@zpr.local"),
  ADMIN_GATE_ENABLED: booleanFromEnv.default(false),
  ADMIN_DEMO_PASSWORD: z.string().min(8).default("demo-admin"),

  /**
   * Uploaded documents (FR-PRD-06). Files go to a private directory (or a
   * private bucket adapter) — never under `public/`. They and their
   * extraction rows are purged after DOCUMENT_TTL_HOURS.
   */
  DOCUMENT_STORAGE_DIR: z.string().trim().optional(),
  DOCUMENT_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 7).default(24),
  DOCUMENT_EXTRACTION_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  /** OCR for scans via `pdftoppm` + `tesseract -l pol` (both must be installed). */
  DOCUMENT_OCR_ENABLED: booleanFromEnv.default(false),
  /** LLM proposals for unread fields (scrubbed, consented, always confirmed). Needs AI_PROVIDER. */
  DOCUMENT_LLM_FALLBACK: booleanFromEnv.default(false),
  /** Shows the expected-outcome badge of sample cases (S-00 step 7). */
  DOCUMENT_DEMO_MODE: booleanFromEnv.default(true),
  /** Private ZUS sample cases (git-ignored), with `manifest.json`. */
  SAMPLE_CASES_DIR: z.string().trim().optional(),

  RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(60),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | undefined

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ")
    throw new Error(`Nieprawidłowa konfiguracja środowiska: ${details}`)
  }

  if (
    parsed.data.NODE_ENV === "production" &&
    parsed.data.SESSION_SECRET.startsWith("dev-only-")
  ) {
    throw new Error(
      "SESSION_SECRET must be set to a strong random value in production."
    )
  }

  if (
    parsed.data.AI_PROVIDER !== "none" &&
    parsed.data.AI_PROVIDER !== "ollama" &&
    !parsed.data.AI_API_KEY
  ) {
    throw new Error(
      `AI_API_KEY is required when AI_PROVIDER=${parsed.data.AI_PROVIDER}.`
    )
  }
  if (
    (parsed.data.AI_PROVIDER === "ollama" ||
      parsed.data.AI_PROVIDER === "openai-compatible") &&
    !parsed.data.AI_BASE_URL
  ) {
    throw new Error(
      `AI_BASE_URL is required when AI_PROVIDER=${parsed.data.AI_PROVIDER}.`
    )
  }

  return parsed.data
}

export function getEnv(): Env {
  cached ??= parseEnv()
  return cached
}

export function resetEnvCache(): void {
  cached = undefined
}
