import type {
  IntentModel,
  IntentProvider,
  IntentProviderInput,
  IntentProviderResult
} from "./intent-provider.js";

export type FetchLike = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

const defaultLlmTimeoutMs = 30_000;

interface OpenAiCompatibleIntentProviderOptions {
  endpoint?: string;
  model?: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchFn: FetchLike;
  fallbackProvider: IntentProvider;
}

interface LlmIntentPayload {
  audience?: unknown;
  sections?: unknown;
  primaryCta?: unknown;
  styleTone?: unknown;
}

const supportedSections = new Set(["hero", "features", "pricing", "testimonials", "faq", "cta"]);

function buildQuestions(missingFields: string[]): string[] {
  return missingFields.map((field) => {
    switch (field) {
      case "audience":
        return "这个 Landing Page 主要面向哪类用户？";
      case "sections":
        return "你希望页面至少包含哪些核心区块？例如 hero、features、pricing。";
      case "primaryCta":
        return "页面的主 CTA 是什么？例如 Start Free Trial 或 Book Demo。";
      default:
        return `请补充 ${field}。`;
    }
  });
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeSections(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((section) => normalizeString(section)?.toLowerCase())
    .filter((section): section is string => Boolean(section && supportedSections.has(section)));
}

function buildPrompt(input: IntentProviderInput): string {
  return JSON.stringify(
    {
      task: "Extract a v0 single-page landing page design intent.",
      outputShape: {
        audience: "string or null",
        sections: ["hero", "features", "pricing", "testimonials", "faq", "cta"],
        primaryCta: "string or null",
        styleTone: "professional | minimal | bold"
      },
      constraints: [
        "Return JSON only.",
        "Use only sections from the allowed list.",
        "Do not invent a CTA if none is present."
      ],
      input: {
        goal: input.goal,
        textInputs: input.textInputs,
        urlSignals: input.urlSignals.map((signal) => ({
          normalizedUrl: signal.normalizedUrl,
          summaryText: signal.summaryText,
          sourceType: signal.sourceType,
          fallbackReason: signal.fallbackReason
        }))
      }
    },
    null,
    2
  );
}

function parseChatCompletionContent(rawResponseText: string): LlmIntentPayload {
  const responseJson = JSON.parse(rawResponseText) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const content = responseJson.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("LLM response did not include choices[0].message.content");
  }

  return JSON.parse(content) as LlmIntentPayload;
}

function buildMissingFields(intentModel: IntentModel): string[] {
  const missingFields: string[] = [];

  if (!intentModel.audience) {
    missingFields.push("audience");
  }

  if (intentModel.sections.length < 3) {
    missingFields.push("sections");
  }

  if (!intentModel.primaryCta) {
    missingFields.push("primaryCta");
  }

  return missingFields;
}

async function fallbackWithReason(
  fallbackProvider: IntentProvider,
  input: IntentProviderInput,
  reason: string
): Promise<IntentProviderResult> {
  const fallbackResult = await fallbackProvider.extractIntent(input);

  return {
    ...fallbackResult,
    intentModel: {
      ...fallbackResult.intentModel,
      provider: {
        ...fallbackResult.intentModel.provider,
        fallbackReason: reason
      }
    }
  };
}

export function createOpenAiCompatibleIntentProvider(
  options: OpenAiCompatibleIntentProviderOptions
): IntentProvider {
  return {
    async extractIntent(input: IntentProviderInput): Promise<IntentProviderResult> {
      if (!options.endpoint || !options.model) {
        return fallbackWithReason(
          options.fallbackProvider,
          input,
          "OpenAI-compatible LLM provider is selected but endpoint or model is missing; using rule-based fallback."
        );
      }

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };

        if (options.apiKey) {
          headers.Authorization = `Bearer ${options.apiKey}`;
        }

        const timeoutMs = options.timeoutMs ?? defaultLlmTimeoutMs;
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), timeoutMs);

        let response: Awaited<ReturnType<FetchLike>>;

        try {
          response = await options.fetchFn(options.endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: options.model,
              temperature: 0,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content: "You extract structured landing page design intent for an MCP server."
                },
                {
                  role: "user",
                  content: buildPrompt(input)
                }
              ]
            }),
            signal: abortController.signal
          });
        } finally {
          clearTimeout(timeout);
        }

        const responseText = await response.text();

        if (!response.ok) {
          const truncatedBody = responseText.slice(0, 200);
          throw new Error(`LLM request failed with status ${response.status}: ${truncatedBody}`);
        }

        const payload = parseChatCompletionContent(responseText);
        const intentModel: IntentModel = {
          pageType: "landing_page",
          audience: normalizeString(payload.audience),
          sections: normalizeSections(payload.sections),
          primaryCta: normalizeString(payload.primaryCta),
          styleTone: normalizeString(payload.styleTone) ?? "professional",
          sourceUrls: input.urlSignals.map((signal) => signal.normalizedUrl),
          urlSignals: input.urlSignals.map((signal) => ({
            normalizedUrl: signal.normalizedUrl,
            hostname: signal.hostname,
            path: signal.path,
            sourceType: signal.sourceType,
            fallbackReason: signal.fallbackReason
          })),
          provider: {
            name: "openai-compatible-intent-provider",
            mode: "llm",
            fallbackReason: null
          }
        };
        const missingFields = buildMissingFields(intentModel);

        return {
          intentModel,
          missingFields,
          questions: buildQuestions(missingFields)
        };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);

        return fallbackWithReason(
          options.fallbackProvider,
          input,
          `OpenAI-compatible LLM provider failed: ${reason}; using rule-based fallback.`
        );
      }
    }
  };
}
