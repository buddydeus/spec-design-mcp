/** 中文说明：验证 preview/export 共享编译管线的结构一致性。 */
import { describe, expect, it } from "vitest";

import { compileDesignAst } from "../../../src/services/compiler/ast-compiler.js";
import { renderHtmlFragment } from "../../../src/services/compiler/html-fragment-renderer.js";
import { renderCompiledHtml } from "../../../src/services/export/html-exporter.js";
import { renderPreviewHtml } from "../../../src/services/preview/html-renderer.js";

const designAst = {
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
        style: {},
        layout: { mode: "flex", direction: "column", gap: 16 },
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
          },
          {
            id: "node_hero_cta",
            kind: "button",
            name: "hero_cta",
            tag: "button",
            text: "Start Free Trial",
            props: {},
            style: {},
            layout: { mode: "block" },
            meta: {
              componentName: "HeroCta",
              editable: false,
              bindingKey: "hero.cta",
              repeatSource: null
            },
            children: []
          }
        ]
      }
    ]
  }
};

describe("AST compiler", () => {
  it("derives preview and export node HTML from the same compiled tree", () => {
    const compiledDocument = compileDesignAst(designAst);
    const htmlFragment = renderHtmlFragment(compiledDocument.root);

    expect(renderPreviewHtml(designAst)).toContain(htmlFragment);
    expect(renderCompiledHtml(designAst)).toContain(htmlFragment);
  });

  it("derives annotations and bindings from the compiled tree", () => {
    const compiledDocument = compileDesignAst(designAst);

    expect(compiledDocument.annotations.map((annotation) => annotation.nodeId)).toEqual([
      "node_page",
      "node_hero",
      "node_hero_title",
      "node_hero_cta"
    ]);
    expect(compiledDocument.bindingSchema).toEqual({
      version: "v0",
      fields: [
        { key: "hero.title", type: "text" },
        { key: "hero.cta", type: "text" }
      ]
    });
  });
});
