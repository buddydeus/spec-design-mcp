import { rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { createConfirmService } from "../../src/services/conversation/confirm-service.js";
import { createGenerateService } from "../../src/services/conversation/generate-service.js";
import { createSessionService } from "../../src/services/conversation/session-service.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("confirm service", () => {
  it("confirms an existing design version and updates session status", async () => {
    const sessionService = await createSessionService();
    const generateService = await createGenerateService();
    const confirmService = await createConfirmService();
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
        }
      ]
    });

    await generateService.generate({
      sessionId: session.sessionId
    });

    const result = await confirmService.confirm({
      sessionId: session.sessionId,
      designVersion: "v1"
    });

    expect(result.confirmedVersion).toBe("v1");
    expect(result.status).toBe("confirmed");
    sessionService.close();
    generateService.close();
    confirmService.close();
  });

  it("throws VERSION_NOT_FOUND when design version does not exist", async () => {
    const sessionService = await createSessionService();
    const confirmService = await createConfirmService();
    const session = await sessionService.createSession({
      projectName: "Acme",
      goal: "Landing page"
    });

    await expect(
      confirmService.confirm({
        sessionId: session.sessionId,
        designVersion: "v1"
      })
    ).rejects.toThrow("VERSION_NOT_FOUND");

    sessionService.close();
    confirmService.close();
  });
});
