import { rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  appendInputTool,
  confirmDesignTool,
  createSessionTool,
  generateDesignTool
} from "../../src/index.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("confirm tools", () => {
  it("returns a confirm result from validated params", async () => {
    const session = await createSessionTool({
      projectName: "Acme",
      goal: "Build landing page"
    });

    await appendInputTool({
      sessionId: session.sessionId,
      inputs: [
        {
          type: "text",
          text: "Create a SaaS landing page for developers with a hero, features, pricing and primary CTA Start Free Trial"
        }
      ]
    });

    await generateDesignTool({
      sessionId: session.sessionId
    });

    const result = await confirmDesignTool({
      sessionId: session.sessionId,
      designVersion: "v1"
    });

    expect(result.confirmedVersion).toBe("v1");
    expect(result.status).toBe("confirmed");
  });
});
