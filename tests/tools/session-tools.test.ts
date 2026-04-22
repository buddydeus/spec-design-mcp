/** 中文说明：验证 session 相关 tool 的基础输入输出。 */
import { rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  appendInputTool,
  createSessionTool
} from "../../src/tools/session-tools.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("session tools", () => {
  it("creates a session from validated params", async () => {
    const result = await createSessionTool({
      projectName: "Acme",
      goal: "Build landing page"
    });

    expect(result.status).toBe("created");
  });

  it("appends validated inputs", async () => {
    const session = await createSessionTool({
      projectName: "Acme",
      goal: "Build landing page"
    });

    const result = await appendInputTool({
      sessionId: session.sessionId,
      inputs: [{ type: "text", text: "Hero with CTA" }]
    });

    expect(result.updatedStatus).toBe("collecting_inputs");
  });
});
