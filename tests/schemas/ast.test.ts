/** 中文说明：验证 DesignDOMAST v0 的结构约束。 */
import { describe, expect, it } from "vitest";

import { designAstSchema } from "../../src/schemas/ast.js";

describe("designAstSchema", () => {
  it("accepts a minimal page tree", () => {
    const result = designAstSchema.safeParse({
      version: "v1",
      root: {
        id: "node_page",
        kind: "page",
        name: "landing-page",
        tag: "main",
        text: null,
        props: {},
        style: {},
        layout: { mode: "block" },
        meta: {
          componentName: "LandingPage",
          editable: false,
          bindingKey: null,
          repeatSource: null
        },
        children: []
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported style keys", () => {
    const result = designAstSchema.safeParse({
      version: "v1",
      root: {
        id: "node_page",
        kind: "page",
        name: "landing-page",
        tag: "main",
        text: null,
        props: {},
        style: {
          position: "absolute"
        },
        layout: { mode: "block" },
        meta: {
          componentName: "LandingPage",
          editable: false,
          bindingKey: null,
          repeatSource: null
        },
        children: []
      }
    });

    expect(result.success).toBe(false);
  });
});
