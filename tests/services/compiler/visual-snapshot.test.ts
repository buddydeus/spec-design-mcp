/** 中文说明：验证视觉快照和结构化 visual diff 的稳定契约。 */
import { describe, expect, it } from "vitest";

import {
  createVisualDiff,
  createVisualSnapshot
} from "../../../src/services/compiler/visual-snapshot.js";

const baseDesignAst = {
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
    children: [
      {
        id: "node_hero",
        kind: "section",
        name: "hero",
        tag: "section",
        text: null,
        props: {},
        style: {
          backgroundColor: "#0f172a"
        },
        layout: { mode: "block" },
        meta: {
          componentName: "HeroSection",
          editable: false,
          bindingKey: null,
          repeatSource: null
        },
        children: [
          {
            id: "node_hero_title",
            kind: "heading",
            name: "hero_title",
            tag: "h1",
            text: "Launch faster",
            props: {},
            style: {},
            layout: { mode: "block" },
            meta: {
              componentName: "HeroTitle",
              editable: true,
              bindingKey: "hero.title",
              repeatSource: null
            },
            children: []
          }
        ]
      }
    ]
  }
};

const revisedDesignAst = {
  ...baseDesignAst,
  root: {
    ...baseDesignAst.root,
    children: [
      {
        ...baseDesignAst.root.children[0],
        children: [
          {
            ...baseDesignAst.root.children[0]!.children[0],
            text: "Ship faster"
          }
        ]
      }
    ]
  }
};

describe("visual snapshot", () => {
  it("creates a deterministic snapshot from the compiled document", () => {
    const snapshot = createVisualSnapshot(baseDesignAst);

    expect(snapshot).toMatchObject({
      version: "v0",
      nodeCount: 3,
      maxDepth: 2,
      editableNodeCount: 1,
      bindingFieldCount: 1
    });
    expect(snapshot.fingerprint).toHaveLength(16);
    expect(snapshot.nodes.map((node) => node.nodeId)).toEqual([
      "node_page",
      "node_hero",
      "node_hero_title"
    ]);
    expect(snapshot.nodes[2]).toMatchObject({
      textLength: "Launch faster".length,
      textHash: expect.any(String)
    });
  });

  it("reports changed visual snapshot nodes", () => {
    const beforeSnapshot = createVisualSnapshot(baseDesignAst);
    const afterSnapshot = createVisualSnapshot(revisedDesignAst);
    const diff = createVisualDiff(beforeSnapshot, afterSnapshot);

    expect(diff.hasVisualChanges).toBe(true);
    expect(diff.summary).toContain("Changed nodes 1");
    expect(diff.nodeChanges).toEqual([
      expect.objectContaining({
        nodeId: "node_hero_title",
        changeType: "changed",
        changedFields: ["textLength", "textHash"]
      })
    ]);
  });
});
