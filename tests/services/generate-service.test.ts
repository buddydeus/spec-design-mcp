import { access } from "node:fs/promises";
import { rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { designAstSchema } from "../../src/schemas/ast.js";
import { createGenerateService } from "../../src/services/conversation/generate-service.js";
import { createSessionService } from "../../src/services/conversation/session-service.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("generate service", () => {
  it("generates a valid AST and section summary from a ready session", async () => {
    const sessionService = await createSessionService();
    const generateService = await createGenerateService();
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

    const result = await generateService.generate({
      sessionId: session.sessionId
    });
    const designAst = result.designAst as {
      root: { children: Array<{ name: string }> };
    };

    expect(result.designVersion).toBe("v1");
    expect(designAstSchema.parse(result.designAst)).toBeTruthy();
    expect(result.sectionSummary.length).toBeGreaterThanOrEqual(3);
    expect(designAst.root.children[0]?.name).toBe("hero");
    expect(result.previewRef).toContain("preview.html");
    expect(result.previewArtifacts).toContain("preview.html");
    await access(
      new URL(`../../${result.previewRef}`, import.meta.url)
    );
    sessionService.close();
    generateService.close();
  });
});
