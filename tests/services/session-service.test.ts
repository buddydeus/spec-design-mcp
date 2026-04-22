import { rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { createSessionService } from "../../src/services/conversation/session-service.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("session service", () => {
  it("creates a new session with created status", async () => {
    const service = await createSessionService();
    const result = await service.createSession({
      projectName: "Acme",
      goal: "Generate landing page"
    });

    expect(result.sessionId).toMatch(/^session_/);
    expect(result.status).toBe("created");
    service.close();
  });

  it("append_input stores accepted inputs and moves status to collecting_inputs", async () => {
    const service = await createSessionService();
    const session = await service.createSession({
      projectName: "Acme",
      goal: "Generate landing page"
    });

    const result = await service.appendInput({
      sessionId: session.sessionId,
      inputs: [{ type: "text", text: "Landing page for developers" }]
    });

    expect(result.acceptedInputs).toHaveLength(1);
    expect(result.updatedStatus).toBe("collecting_inputs");
    service.close();
  });
});
