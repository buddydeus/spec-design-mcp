/** 中文说明：验证 OpenAI-compatible intent provider 的成功路径与 fallback 行为。 */
import { describe, expect, it } from "vitest";

import { createOpenAiCompatibleIntentProvider } from "../../src/providers/llm/openai-compatible-intent-provider.js";
import { createRuleBasedIntentProvider } from "../../src/providers/llm/rule-based-intent-provider.js";
import { parseUrlSignal } from "../../src/providers/parser/url-parser.js";

const providerInput = {
  goal: "Landing page",
  textInputs: [
    "Create a landing page for developers with hero features pricing and primary CTA Start Free Trial"
  ],
  urlSignals: [parseUrlSignal("https://example.com/developer-product")]
};

describe("OpenAI-compatible intent provider", () => {
  it("extracts intent from a chat completion JSON response", async () => {
    const provider = createOpenAiCompatibleIntentProvider({
      endpoint: "https://llm.example.test/v1/chat/completions",
      model: "intent-test-model",
      apiKey: "test-key",
      fallbackProvider: createRuleBasedIntentProvider(),
      fetchFn: async (_input, init) => {
        const body = JSON.parse(init.body) as {
          model: string;
          response_format: { type: string };
        };

        expect(init.headers.Authorization).toBe("Bearer test-key");
        expect(body.model).toBe("intent-test-model");
        expect(body.response_format.type).toBe("json_object");

        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      audience: "developers",
                      sections: ["hero", "features", "pricing"],
                      primaryCta: "Start Free Trial",
                      styleTone: "minimal"
                    })
                  }
                }
              ]
            });
          }
        };
      }
    });

    const result = await provider.extractIntent(providerInput);

    expect(result.missingFields).toEqual([]);
    expect(result.intentModel).toMatchObject({
      audience: "developers",
      sections: ["hero", "features", "pricing"],
      primaryCta: "Start Free Trial",
      styleTone: "minimal",
      provider: {
        name: "openai-compatible-intent-provider",
        mode: "llm",
        fallbackReason: null
      }
    });
  });

  it("falls back when the HTTP provider fails", async () => {
    const provider = createOpenAiCompatibleIntentProvider({
      endpoint: "https://llm.example.test/v1/chat/completions",
      model: "intent-test-model",
      fallbackProvider: createRuleBasedIntentProvider(),
      fetchFn: async () => ({
        ok: false,
        status: 500,
        async text() {
          return "upstream unavailable";
        }
      })
    });

    const result = await provider.extractIntent(providerInput);

    expect(result.intentModel.provider).toMatchObject({
      name: "rule-based-intent-provider",
      mode: "rule_based"
    });
    expect(result.intentModel.provider.fallbackReason).toContain(
      "OpenAI-compatible LLM provider failed"
    );
  });
});
