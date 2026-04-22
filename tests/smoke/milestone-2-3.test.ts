import { rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  appendInputTool,
  clarifyIntentTool,
  createSessionTool
} from "../../src/index.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("milestone 2-3 smoke", () => {
  it("goes from session creation to structured clarify result", async () => {
    const session = await createSessionTool({
      projectName: "Acme",
      goal: "Build landing page"
    });

    await appendInputTool({
      sessionId: session.sessionId,
      inputs: [{ type: "text", text: "Landing page for developer tools" }]
    });

    const result = await clarifyIntentTool({
      sessionId: session.sessionId
    });

    expect(result).toHaveProperty("isReady");
    expect(result).toHaveProperty("questions");
  });
});
