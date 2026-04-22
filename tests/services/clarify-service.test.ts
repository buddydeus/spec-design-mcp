import { rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

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
      primaryCta: "Start Free Trial"
    });
    sessionService.close();
    clarifyService.close();
  });
});
