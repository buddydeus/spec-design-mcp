/** 中文说明：覆盖 revise 链路的里程碑回归。 */
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

describe("milestone 6 smoke", () => {
  it("goes from generation to revise with a new preview artifact set", async () => {
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
      revisionInstruction:
        "change hero title to Launch landing pages faster; move pricing before features; add section faq"
    });

    expect(result.newVersion).toBe("v2");
    expect(result.previewRef).toContain("preview.html");
    await access(new URL(`../../${result.previewRef}`, import.meta.url));
    await access(
      new URL(
        `../../.runtime/artifacts/${session.sessionId}/${result.newVersion}/section-summary.json`,
        import.meta.url
      )
    );
  });
});
