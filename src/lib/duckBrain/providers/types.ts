import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { tr } from "@/lib/i18n/translate";

export type AIProviderType = "webllm" | "openai" | "anthropic" | "openai-compatible";

export interface ProviderConfig {
  apiKey?: string;
  modelId?: string;
  baseUrl?: string; // For OpenAI-compatible APIs
  /** Cancels the connection check, so Stop reaches a provider still connecting. */
  signal?: AbortSignal;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  /**
   * Cancels the request. After it fires the provider reports nothing more:
   * no token, no completion, no error.
   */
  signal?: AbortSignal;
}

export interface ProviderStatus {
  ready: boolean;
  initializing: boolean;
  error?: string;
  currentModel?: string;
}

/**
 * Abstract interface for AI providers
 * All providers (WebLLM, OpenAI, Claude, etc.) implement this
 */
export interface AIProvider {
  readonly name: AIProviderType;

  /**
   * Initialize the provider with config
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * Generate text with streaming support
   */
  generateStreaming(
    messages: ChatCompletionMessageParam[],
    callbacks: StreamCallbacks,
    options?: GenerationOptions
  ): Promise<void>;

  /**
   * Generate text without streaming (returns full response)
   */
  generateText(
    messages: ChatCompletionMessageParam[],
    options?: GenerationOptions
  ): Promise<string>;

  /**
   * Abort any ongoing generation
   */
  abort(): void;

  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;

  /**
   * Get current status
   */
  getStatus(): ProviderStatus;

  /**
   * Check if provider is ready
   */
  isReady(): boolean;
}

/**
 * Available models for each provider
 */
export interface ModelOption {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
}

export const OPENAI_MODELS: ModelOption[] = [
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    description: tr("ai.model.mostCapable"),
    contextLength: 400000,
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    description: tr("ai.model.generalPurpose"),
    contextLength: 400000,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    description: tr("ai.model.fastAffordable"),
    contextLength: 400000,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: tr("ai.model.previousGen"),
    contextLength: 128000,
  },
];

export const ANTHROPIC_MODELS: ModelOption[] = [
  {
    id: "claude-opus-5",
    name: "Claude Opus 5",
    description: tr("ai.model.bestComplexSql"),
    contextLength: 1000000,
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    description: tr("ai.model.bestBalance"),
    contextLength: 1000000,
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    description: tr("ai.model.fastestAffordable"),
    contextLength: 200000,
  },
];
