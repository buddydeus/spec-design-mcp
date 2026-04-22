/** 中文说明：验证 artifact 相关 schema 的最小契约。 */
import { describe, expect, it } from "vitest";

import {
  annotationManifestSchema,
  artifactManifestSchema
} from "../../src/schemas/artifacts.js";

describe("artifact schemas", () => {
  it("accepts a minimal artifact manifest", () => {
    const result = artifactManifestSchema.safeParse({
      sessionId: "session_demo",
      designVersion: "v1",
      generatedAt: "2026-04-22T00:00:00.000Z",
      artifacts: [
        {
          artifactType: "compiled.html",
          filePath: ".runtime/exports/session_demo/v1/compiled.html"
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("requires annotation node ids to match node_ prefix", () => {
    const result = annotationManifestSchema.safeParse([
      {
        nodeId: "hero",
        componentName: "HeroSection",
        bindingKey: null,
        repeatSource: null,
        editable: false
      }
    ]);

    expect(result.success).toBe(false);
  });
});
