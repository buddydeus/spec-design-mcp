import { access, rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  appendInputTool,
  clarifyIntentTool,
  confirmDesignTool,
  createSessionTool,
  exportPackageTool,
  generateDesignTool,
  reviseDesignTool
} from "../../src/index.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("milestone 7-8 smoke", () => {
  it("goes from session creation to minimal delivery package export", async () => {
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

    const clarify = await clarifyIntentTool({
      sessionId: session.sessionId
    });

    expect(clarify.isReady).toBe(true);

    await generateDesignTool({
      sessionId: session.sessionId
    });

    const revised = await reviseDesignTool({
      sessionId: session.sessionId,
      baseVersion: "v1",
      revisionInstruction: "change cta to Book Demo; add section faq"
    });

    await confirmDesignTool({
      sessionId: session.sessionId,
      designVersion: revised.newVersion
    });

    const exported = await exportPackageTool({
      sessionId: session.sessionId,
      designVersion: revised.newVersion
    });

    expect(exported.artifacts).toEqual([
      "artifact-manifest.json",
      "design-ast.json",
      "compiled.html",
      "compiled.css",
      "annotation-manifest.json",
      "binding.schema.json"
    ]);

    await access(new URL(`../../${exported.deliveryPackageRef}`, import.meta.url));
    await access(
      new URL(
        `../../.runtime/artifacts/${session.sessionId}/${revised.newVersion}/export/compiled.html`,
        import.meta.url
      )
    );
  });
});
