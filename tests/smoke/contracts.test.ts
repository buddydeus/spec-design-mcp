import { describe, expect, it } from "vitest";

import {
  artifactManifestSchema,
  createSessionParamsSchema,
  designAstSchema,
  errorResponseSchema,
  schemas
} from "../../src/index.js";

describe("contract entry", () => {
  it("exports the shared schema namespace marker", () => {
    expect(schemas.name).toBe("spec-design-mcp-contracts");
  });

  it("re-exports core schemas from the entrypoint", () => {
    expect(designAstSchema).toBeDefined();
    expect(createSessionParamsSchema).toBeDefined();
    expect(artifactManifestSchema).toBeDefined();
    expect(errorResponseSchema).toBeDefined();
  });
});
