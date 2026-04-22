/** 中文说明：覆盖 preview 产物生成的里程碑链路。 */
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

describe("milestone 5 smoke", () => {
  it("goes from generation to preview artifact files", async () => {
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

    expect(result.previewRef).toContain("preview.html");
    await access(new URL(`../../${result.previewRef}`, import.meta.url));
    await access(
      new URL(
        `../../.runtime/artifacts/${session.sessionId}/${result.designVersion}/section-summary.json`,
        import.meta.url
      )
    );
  });
});
