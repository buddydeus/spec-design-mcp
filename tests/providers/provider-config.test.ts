/** 中文说明：验证 intent provider 环境变量选择逻辑。 */
import { describe, expect, it } from "vitest";

import {
  createConfiguredIntentProvider,
  intentProviderEnvVars
} from "../../src/providers/llm/provider-config.js";

describe("intent provider config", () => {
  it("uses rule-based provider by default", async () => {
    const provider = createConfiguredIntentProvider({});
    const result = await provider.extractIntent({
      goal: "Landing page",
      textInputs: [
        "Create a landing page for founders with hero features pricing and primary CTA Book Demo"
      ],
      urlSignals: []
    });

    expect(result.intentModel.provider).toMatchObject({
      name: "rule-based-intent-provider",
      mode: "rule_based"
    });
  });

  it("selects openai-compatible provider when configured", async () => {
    const provider = createConfiguredIntentProvider(
      {
        [intentProviderEnvVars.provider]: "openai_compatible",
        [intentProviderEnvVars.endpoint]: "https://llm.example.test/v1/chat/completions",
        [intentProviderEnvVars.model]: "intent-test-model"
      },
      async () => ({
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    audience: "founders",
                    sections: ["hero", "features", "pricing"],
                    primaryCta: "Book Demo",
                    styleTone: "professional"
                  })
                }
              }
            ]
          });
        }
      })
    );
    const result = await provider.extractIntent({
      goal: "Landing page",
      textInputs: [
        "Create a landing page for founders with hero features pricing and primary CTA Book Demo"
      ],
      urlSignals: []
    });

    expect(result.intentModel.provider).toMatchObject({
      name: "openai-compatible-intent-provider",
      mode: "llm"
    });
  });
});
