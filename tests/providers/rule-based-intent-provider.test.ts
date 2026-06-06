/** 中文说明：验证默认 intent provider 的 rule-based fallback 行为。 */
import { describe, expect, it } from "vitest";

import { createRuleBasedIntentProvider } from "../../src/providers/llm/rule-based-intent-provider.js";
import { parseUrlSignal } from "../../src/providers/parser/url-parser.js";

describe("rule-based intent provider", () => {
  it("returns intent with provider fallback metadata", async () => {
    const provider = createRuleBasedIntentProvider();
    const result = await provider.extractIntent({
      goal: "Landing page",
      textInputs: [
        "Create a bold landing page for marketers with hero features pricing and primary CTA Get Started"
      ],
      urlSignals: [parseUrlSignal("https://example.com/marketing-suite")]
    });

    expect(result.missingFields).toEqual([]);
    expect(result.intentModel).toMatchObject({
      audience: "marketers",
      primaryCta: "Get Started",
      styleTone: "bold",
      provider: {
        name: "rule-based-intent-provider",
        mode: "rule_based"
      }
    });
    expect(result.intentModel.sections).toEqual(
      expect.arrayContaining(["hero", "features", "pricing"])
    );
    expect(result.intentModel.provider.fallbackReason).toContain("LLM provider is not configured");
    expect(result.intentModel.urlSignals[0]?.fallbackReason).toContain("URL content was not fetched");
  });
});
