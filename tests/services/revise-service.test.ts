import { access, rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { createGenerateService } from "../../src/services/conversation/generate-service.js";
import { createReviseService } from "../../src/services/conversation/revise-service.js";
import { createSessionService } from "../../src/services/conversation/session-service.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("revise service", () => {
  it("creates a new design version with diff summary and preview artifacts", async () => {
    const sessionService = await createSessionService();
    const generateService = await createGenerateService();
    const reviseService = await createReviseService();
    const session = await sessionService.createSession({
      projectName: "Acme",
      goal: "Landing page"
    });

    await sessionService.appendInput({
      sessionId: session.sessionId,
      inputs: [
        {
          type: "text",
          text: "Create a SaaS landing page for developers with a hero, features, pricing and primary CTA Start Free Trial"
        }
      ]
    });

    await generateService.generate({
      sessionId: session.sessionId
    });

    const result = await reviseService.revise({
      sessionId: session.sessionId,
      baseVersion: "v1",
      revisionInstruction:
        "change hero title to Ship product pages faster; add section faq; move pricing before features; change cta to Book Demo; change background color to #111827"
    });
    const designAst = result.designAst as {
      root: { children: Array<{ name: string }> };
    };
    const sectionNames = designAst.root.children.map((node) => node.name);

    expect(result.baseVersion).toBe("v1");
    expect(result.newVersion).toBe("v2");
    expect(sectionNames).toEqual(["hero", "pricing", "features", "cta", "faq"]);
    expect(result.diffSummary).toContain("Updated hero title text");
    expect(result.diffSummary).toContain("Added section faq");
    expect(result.diffSummary).toContain("Moved section pricing before features");
    expect(result.diffSummary).toContain("Updated primary CTA text");
    expect(result.diffSummary).toContain("Updated page background color");
    expect(result.nodeDiffs).toHaveLength(5);
    expect(result.previewRef).toContain("/v2/preview.html");
    expect(result.previewArtifacts).toContain("section-summary.json");
    await access(new URL(`../../${result.previewRef}`, import.meta.url));

    sessionService.close();
    generateService.close();
    reviseService.close();
  });

  it("rejects stale base versions with VERSION_CONFLICT", async () => {
    const sessionService = await createSessionService();
    const generateService = await createGenerateService();
    const reviseService = await createReviseService();
    const session = await sessionService.createSession({
      projectName: "Acme",
      goal: "Landing page"
    });

    await sessionService.appendInput({
      sessionId: session.sessionId,
      inputs: [
        {
          type: "text",
          text: "Create a SaaS landing page for developers with a hero, features, pricing and primary CTA Start Free Trial"
        }
      ]
    });

    await generateService.generate({
      sessionId: session.sessionId
    });

    await reviseService.revise({
      sessionId: session.sessionId,
      baseVersion: "v1",
      revisionInstruction: "change cta to Book Demo"
    });

    await expect(
      reviseService.revise({
        sessionId: session.sessionId,
        baseVersion: "v1",
        revisionInstruction: "add section faq"
      })
    ).rejects.toThrow("VERSION_CONFLICT");

    sessionService.close();
    generateService.close();
    reviseService.close();
  });
});
