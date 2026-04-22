/** 中文说明：验证 revise tool 的结构化返回。 */
import { access, rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  appendInputTool,
  createSessionTool,
  generateDesignTool,
  reviseDesignTool
} from "../../src/index.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("revise tools", () => {
  it("returns a revise result from validated params", async () => {
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

    const result = await reviseDesignTool({
      sessionId: session.sessionId,
      baseVersion: "v1",
      revisionInstruction: "change cta to Book Demo; add section faq"
    });

    expect(result.baseVersion).toBe("v1");
    expect(result.newVersion).toBe("v2");
    expect(result.diffSummary).toContain("Updated primary CTA text");
    expect(result.diffSummary).toContain("Added section faq");
    expect(result.previewRef).toContain("preview.html");
    expect(result.previewArtifacts).toContain("section-summary.json");
    await access(new URL(`../../${result.previewRef}`, import.meta.url));
  });
});
