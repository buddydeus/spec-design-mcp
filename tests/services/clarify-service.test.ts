/** 中文说明：验证 clarify service 的规则提取行为。 */
import { rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import type { IntentProvider } from "../../src/providers/llm/intent-provider.js";
import { parseUrlSignal } from "../../src/providers/parser/url-parser.js";
import { createClarifyService } from "../../src/services/conversation/clarify-service.js";
import { createSessionService } from "../../src/services/conversation/session-service.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("clarify service", () => {
  it("returns questions when required intent fields are missing", async () => {
    const sessionService = await createSessionService();
    const clarifyService = await createClarifyService();
    const session = await sessionService.createSession({
      projectName: "Acme",
      goal: "Landing page"
    });

    await sessionService.appendInput({
      sessionId: session.sessionId,
      inputs: [{ type: "text", text: "Build a landing page" }]
    });

    const result = await clarifyService.clarify({ sessionId: session.sessionId });

    expect(result.isReady).toBe(false);
    expect(result.questions.length).toBeGreaterThan(0);
    sessionService.close();
    clarifyService.close();
  });

  it("returns ready intent when key fields are present in text and url inputs", async () => {
    const sessionService = await createSessionService();
    const clarifyService = await createClarifyService();
    const session = await sessionService.createSession({
      projectName: "Acme",
      goal: "Landing page"
    });

    await sessionService.appendInput({
      sessionId: session.sessionId,
      inputs: [
        {
          type: "text",
          text: "Create a SaaS landing page for developers with a hero, features, pricing and primary CTA Start Free Trial"
        },
        {
          type: "url",
          url: "https://example.com/product"
        }
      ]
    });

    const result = await clarifyService.clarify({ sessionId: session.sessionId });

    expect(result.isReady).toBe(true);
    expect(result.missingFields).toEqual([]);
    expect(result.interimIntentModel).toMatchObject({
      pageType: "landing_page",
      audience: "developers",
      primaryCta: "Start Free Trial",
      provider: {
        name: "rule-based-intent-provider",
        mode: "rule_based"
      }
    });
    expect(result.interimIntentModel.urlSignals).toEqual([
      expect.objectContaining({
        normalizedUrl: "https://example.com/product",
        sourceType: "url_metadata"
      })
    ]);
    sessionService.close();
    clarifyService.close();
  });

  it("passes resolved URL metadata to the intent provider", async () => {
    const sessionService = await createSessionService();
    const intentProvider: IntentProvider = {
      async extractIntent(input) {
        expect(input.urlSignals).toEqual([
          expect.objectContaining({
            summaryText: "example.com product Developer Platform hero features pricing",
            sourceType: "url_fetched_metadata",
            fallbackReason: null
          })
        ]);

        return {
          intentModel: {
            pageType: "landing_page",
            audience: "developers",
            sections: ["hero", "features", "pricing"],
            primaryCta: "Start Free Trial",
            styleTone: "professional",
            sourceUrls: input.urlSignals.map((signal) => signal.normalizedUrl),
            urlSignals: input.urlSignals.map((signal) => ({
              normalizedUrl: signal.normalizedUrl,
              hostname: signal.hostname,
              path: signal.path,
              sourceType: signal.sourceType,
              fallbackReason: signal.fallbackReason
            })),
            provider: {
              name: "test-intent-provider",
              mode: "rule_based",
              fallbackReason: null
            }
          },
          missingFields: [],
          questions: []
        };
      }
    };
    const clarifyService = await createClarifyService(
      undefined,
      intentProvider,
      async (input) => ({
        ...parseUrlSignal(input),
        summaryText: "example.com product Developer Platform hero features pricing",
        sourceType: "url_fetched_metadata",
        fallbackReason: null
      })
    );
    const session = await sessionService.createSession({
      projectName: "Acme",
      goal: "Landing page"
    });

    await sessionService.appendInput({
      sessionId: session.sessionId,
      inputs: [
        {
          type: "url",
          url: "https://example.com/product"
        }
      ]
    });

    const result = await clarifyService.clarify({ sessionId: session.sessionId });

    expect(result.isReady).toBe(true);
    expect(result.interimIntentModel.provider).toMatchObject({
      name: "test-intent-provider"
    });
    sessionService.close();
    clarifyService.close();
  });
});
