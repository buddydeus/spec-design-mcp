/** 中文说明：覆盖 generate 首次落盘的里程碑链路。 */
import { rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  appendInputTool,
  createSessionTool,
  generateDesignTool
} from "../../src/index.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("milestone 4 smoke", () => {
  it("goes from session creation to generated ast", async () => {
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

    const result = await generateDesignTool({
      sessionId: session.sessionId
    });

    expect(result.designVersion).toBe("v1");
    expect(result.designAst).toBeDefined();
    expect(result.sectionSummary).toContain("hero");
  });
});
