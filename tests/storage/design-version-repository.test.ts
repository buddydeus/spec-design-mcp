/** 中文说明：验证 design version repository 的版本存取行为。 */
import { rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { createDesignVersionRepository } from "../../src/storage/design-version-repository.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("design version repository", () => {
  it("persists and reads back a v1 draft version", async () => {
    const repository = await createDesignVersionRepository();

    await repository.saveVersion({
      sessionId: "session_demo",
      designVersion: "v1",
      baseVersion: null,
      sourceType: "generate",
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
          children: []
        }
      },
      sectionSummary: ["hero"],
      diffSummary: [],
      nodeDiffs: [],
      previewRef: null
    });

    const stored = await repository.getLatestVersion("session_demo");

    expect(stored?.designVersion).toBe("v1");
    expect(stored?.sectionSummary).toEqual(["hero"]);
    repository.close();
  });
});
