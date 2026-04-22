/** 中文说明：验证 export tool 的交付包引用返回。 */
import { access, rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  appendInputTool,
  confirmDesignTool,
  createSessionTool,
  exportPackageTool,
  generateDesignTool
} from "../../src/index.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("export tools", () => {
  it("returns an export result from validated params", async () => {
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
    await confirmDesignTool({
      sessionId: session.sessionId,
      designVersion: "v1"
    });

    const result = await exportPackageTool({
      sessionId: session.sessionId,
      designVersion: "v1"
    });

    expect(result.deliveryPackageRef).toContain("artifact-manifest.json");
    expect(result.artifacts).toContain("compiled.html");
    expect(result.artifacts).toContain("binding.schema.json");
    await access(new URL(`../../${result.deliveryPackageRef}`, import.meta.url));
  });
});
