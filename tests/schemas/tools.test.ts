import { describe, expect, it } from "vitest";

import {
  appendInputParamsSchema,
  exportPackageParamsSchema,
  reviseDesignParamsSchema
} from "../../src/schemas/tools.js";

describe("tool schemas", () => {
  it("accepts text and url inputs in append_input", () => {
    const result = appendInputParamsSchema.safeParse({
      sessionId: "session_demo",
      inputs: [
        { type: "text", text: "Build a SaaS landing page" },
        { type: "url", url: "https://example.com" }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("requires baseVersion for revise", () => {
    const result = reviseDesignParamsSchema.safeParse({
      sessionId: "session_demo",
      revisionInstruction: "make the hero shorter"
    });

    expect(result.success).toBe(false);
  });

  it("accepts versioned export params", () => {
    const result = exportPackageParamsSchema.safeParse({
      sessionId: "session_demo",
      designVersion: "v1"
    });

    expect(result.success).toBe(true);
  });
});
