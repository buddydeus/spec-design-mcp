/** 中文说明：验证 generate tool 的最小可用输出。 */
import { access, rm } from "node:fs/promises";

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

describe("generate tools", () => {
  it("returns a generate result from validated params", async () => {
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
    expect(result.sectionSummary.length).toBeGreaterThanOrEqual(3);
    expect(result.previewRef).toContain("preview.html");
    expect(result.previewArtifacts).toContain("section-summary.json");
    await access(new URL(`../../${result.previewRef}`, import.meta.url));
  });
});
