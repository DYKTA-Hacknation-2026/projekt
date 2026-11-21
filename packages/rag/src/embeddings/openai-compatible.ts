import { NonRetryableError, withRetry } from "../util/retry"
import {
  assertVector,
  l2Normalize,
  type EmbeddingModelConfig,
  type EmbeddingProvider,
} from "./provider"

export interface OpenAICompatibleOptions {
  provider: "openai" | "ollama" | "openai-compatible"
  model: string
  dimensions: number
  baseUrl: string
  apiKey?: string
  documentPrefix?: string
  queryPrefix?: string
  batchSize?: number
  timeoutMs?: number
  /** Send `dimensions` in the request (OpenAI text-embedding-3 models). */
  sendDimensions?: boolean
  retries?: number
  fetch?: typeof fetch
}

export class EmbeddingRequestError extends Error {
  override readonly name = "EmbeddingRequestError"
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

/**
 * Calls an OpenAI-style `POST {baseUrl}/embeddings` endpoint. Works with
 * OpenAI, Azure-compatible gateways, Ollama (`/v1`), vLLM, LiteLLM and TEI.
 * Batches requests, retries 429/5xx with backoff and validates dimensions.
 */
export class OpenAICompatibleEmbeddingProvider implements EmbeddingProvider {
  readonly config: EmbeddingModelConfig
  private readonly options: Required<
    Omit<OpenAICompatibleOptions, "apiKey" | "fetch">
  > &
    Pick<OpenAICompatibleOptions, "apiKey" | "fetch">

  constructor(options: OpenAICompatibleOptions) {
    this.options = {
      documentPrefix: "",
      queryPrefix: "",
      batchSize: 64,
      timeoutMs: 30_000,
      sendDimensions: options.provider === "openai",
      retries: 4,
      ...options,
    }
    this.config = {
      provider: options.provider,
      model: options.model,
      dimensions: options.dimensions,
      distanceMetric: "COSINE",
      documentPrefix: this.options.documentPrefix,
      queryPrefix: this.options.queryPrefix,
      normalize: true,
      revision: 1,
    }
  }

  private async request(input: string[]): Promise<number[][]> {
    const doFetch = this.options.fetch ?? fetch
    return withRetry(
      async () => {
        const controller = new AbortController()
        const timer = setTimeout(
          () => controller.abort(),
          this.options.timeoutMs
        )
        try {
          const response = await doFetch(
            `${this.options.baseUrl.replace(/\/$/, "")}/embeddings`,
            {
              method: "POST",
              signal: controller.signal,
              headers: {
                "content-type": "application/json",
                ...(this.options.apiKey
                  ? { authorization: `Bearer ${this.options.apiKey}` }
                  : {}),
              },
              body: JSON.stringify({
                model: this.options.model,
                input,
                ...(this.options.sendDimensions
                  ? { dimensions: this.options.dimensions }
                  : {}),
              }),
            }
          )
          if (!response.ok) {
            const detail = (await response.text()).slice(0, 300)
            const error = new EmbeddingRequestError(
              `Embedding request failed (${response.status}): ${detail}`,
              response.status
            )
            if (response.status === 429 || response.status >= 500) throw error
            throw new NonRetryableError(error.message)
          }
          const body = (await response.json()) as {
            data?: Array<{ embedding: number[]; index: number }>
          }
          const data = [...(body.data ?? [])].sort((a, b) => a.index - b.index)
          if (data.length !== input.length) {
            throw new NonRetryableError(
              `Embedding provider returned ${data.length} vectors for ${input.length} inputs`
            )
          }
          return data.map((item) =>
            l2Normalize(assertVector(item.embedding, this.config.dimensions))
          )
        } finally {
          clearTimeout(timer)
        }
      },
      { attempts: this.options.retries, baseDelayMs: 500 }
    )
  }

  async embedDocument(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = []
    for (let start = 0; start < texts.length; start += this.options.batchSize) {
      const batch = texts
        .slice(start, start + this.options.batchSize)
        .map((text) => `${this.config.documentPrefix}${text}`)
      vectors.push(...(await this.request(batch)))
    }
    return vectors
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.request([`${this.config.queryPrefix}${text}`])
    if (!vector) throw new Error("Embedding provider returned no vector")
    return vector
  }
}
