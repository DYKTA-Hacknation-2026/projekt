import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModel } from "ai"

/**
 * Provider-independent chat model configuration (AD-06). The assistant code
 * only sees a `LanguageModel`; swapping Anthropic, OpenAI, a local Ollama or
 * any OpenAI-compatible gateway is an environment change.
 */

export type ChatProvider =
  | "none"
  | "anthropic"
  | "openai"
  | "openrouter"
  | "ollama"
  | "openai-compatible"

export interface ChatModelConfig {
  provider: ChatProvider
  model?: string
  apiKey?: string
  baseUrl?: string
}

export interface ResolvedChatModel {
  model: LanguageModel
  provider: Exclude<ChatProvider, "none">
  modelId: string
}

const DEFAULT_MODELS: Partial<Record<ChatProvider, string>> = {
  anthropic: "claude-sonnet-5-5",
}

export class ChatModelConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ChatModelConfigError"
  }
}

/** Returns `null` for `none`: the caller then uses the offline rules model. */
export function createChatModel(config: ChatModelConfig): ResolvedChatModel | null {
  if (config.provider === "none") return null

  const modelId = config.model || DEFAULT_MODELS[config.provider]
  if (!modelId) {
    throw new ChatModelConfigError(`AI_MODEL is required for AI_PROVIDER=${config.provider}.`)
  }

  switch (config.provider) {
    case "anthropic": {
      const provider = createAnthropic({
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
      })
      return { model: provider(modelId), provider: "anthropic", modelId }
    }
    case "openai": {
      const provider = createOpenAI({
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
      })
      return { model: provider(modelId), provider: "openai", modelId }
    }
    case "openrouter":
    case "ollama":
    case "openai-compatible": {
      const baseURL = config.baseUrl || (config.provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined)
      if (!baseURL) {
        throw new ChatModelConfigError(`AI_BASE_URL is required for AI_PROVIDER=${config.provider}.`)
      }
      const provider = createOpenAICompatible({
        name: config.provider,
        baseURL,
        apiKey: config.apiKey,
      })
      return { model: provider.chatModel(modelId), provider: config.provider, modelId }
    }
  }
}
