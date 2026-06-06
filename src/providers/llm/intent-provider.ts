import type { ParsedUrlSignal } from "../parser/url-parser.js";

export interface IntentModel {
  pageType: "landing_page";
  audience: string | null;
  sections: string[];
  primaryCta: string | null;
  styleTone: string;
  sourceUrls: string[];
  urlSignals: Array<{
    normalizedUrl: string;
    hostname: string;
    path: string;
    sourceType: ParsedUrlSignal["sourceType"];
    fallbackReason: string | null;
  }>;
  provider: {
    name: string;
    mode: "rule_based" | "llm";
    fallbackReason: string | null;
  };
}

export interface IntentProviderInput {
  goal: string;
  textInputs: string[];
  urlSignals: ParsedUrlSignal[];
}

export interface IntentProviderResult {
  intentModel: IntentModel;
  missingFields: string[];
  questions: string[];
}

/** 中文说明：未来可由真实 LLM 实现替换，当前默认使用 rule-based fallback。 */
export interface IntentProvider {
  extractIntent(input: IntentProviderInput): Promise<IntentProviderResult>;
}
