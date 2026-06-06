import type { IntentProvider } from "./intent-provider.js";
import {
  createOpenAiCompatibleIntentProvider,
  type FetchLike
} from "./openai-compatible-intent-provider.js";
import { createRuleBasedIntentProvider } from "./rule-based-intent-provider.js";

export const intentProviderEnvVars = {
  provider: "SPEC_DESIGN_MCP_INTENT_PROVIDER",
  endpoint: "SPEC_DESIGN_MCP_LLM_ENDPOINT",
  model: "SPEC_DESIGN_MCP_LLM_MODEL",
  apiKey: "SPEC_DESIGN_MCP_LLM_API_KEY"
} as const;

export type IntentProviderMode = "rule_based" | "openai_compatible";

export interface IntentProviderConfig {
  mode: IntentProviderMode;
  endpoint?: string;
  model?: string;
  apiKey?: string;
}

function readIntentProviderConfig(env: NodeJS.ProcessEnv): IntentProviderConfig {
  const rawMode = env[intentProviderEnvVars.provider];
  const mode: IntentProviderMode =
    rawMode === "openai_compatible" ? "openai_compatible" : "rule_based";

  return {
    mode,
    endpoint: env[intentProviderEnvVars.endpoint],
    model: env[intentProviderEnvVars.model],
    apiKey: env[intentProviderEnvVars.apiKey]
  };
}

/**
 * 中文说明：
 * 默认保持本地 rule-based；只有显式配置 openai_compatible 时才走真实 LLM HTTP provider。
 */
export function createConfiguredIntentProvider(
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: FetchLike = fetch
): IntentProvider {
  const config = readIntentProviderConfig(env);
  const fallbackProvider = createRuleBasedIntentProvider();

  if (config.mode !== "openai_compatible") {
    return fallbackProvider;
  }

  return createOpenAiCompatibleIntentProvider({
    endpoint: config.endpoint,
    model: config.model,
    apiKey: config.apiKey,
    fetchFn,
    fallbackProvider
  });
}
