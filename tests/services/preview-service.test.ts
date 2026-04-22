/** 中文说明：验证 preview service 的文件输出行为。 */
import { access, readFile, rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { createPreviewService } from "../../src/services/preview/preview-service.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("preview service", () => {
  it("writes preview.html and section-summary.json for a generated design", async () => {
    const previewService = await createPreviewService();

    const result = await previewService.generatePreview({
      sessionId: "session_demo",
      designVersion: "v1",
      designAst: {
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
                  text: "Start Free Trial",
                  props: {},
                  style: {},
                  layout: { mode: "block" },
                  meta: {
                    componentName: "HeroTitle",
                    editable: true,
                    bindingKey: null,
                    repeatSource: null
                  },
                  children: []
                }
              ]
            }
          ]
        }
      },
      sectionSummary: ["hero"]
    });

    await access(new URL("../../.runtime/artifacts/session_demo/v1/preview.html", import.meta.url));
    await access(
      new URL("../../.runtime/artifacts/session_demo/v1/section-summary.json", import.meta.url)
    );

    const previewHtml = await readFile(
      new URL("../../.runtime/artifacts/session_demo/v1/preview.html", import.meta.url),
      "utf8"
    );

    expect(result.previewArtifacts).toContain("preview.html");
    expect(previewHtml).toContain("data-node-id=\"node_hero\"");
    previewService.close();
  });
});
