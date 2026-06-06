/** 中文说明：验证 runtime root 默认路径与环境变量覆盖行为。 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getArtifactRef,
  getRuntimePaths,
  runtimeDirEnvVar
} from "../../../src/lib/runtime/paths.js";
import { writeArtifactFile } from "../../../src/storage/file-artifact-store.js";

const originalRuntimeDir = process.env[runtimeDirEnvVar];
let tempRuntimeDir: string | null = null;

afterEach(async () => {
  if (originalRuntimeDir === undefined) {
    delete process.env[runtimeDirEnvVar];
  } else {
    process.env[runtimeDirEnvVar] = originalRuntimeDir;
  }

  if (tempRuntimeDir) {
    await rm(tempRuntimeDir, { recursive: true, force: true });
    tempRuntimeDir = null;
  }
});

describe("runtime paths", () => {
  it("uses .runtime under the project root by default", () => {
    delete process.env[runtimeDirEnvVar];

    const paths = getRuntimePaths("/tmp/spec-design-mcp");

    expect(paths.runtimeRoot).toBe("/tmp/spec-design-mcp/.runtime");
    expect(getArtifactRef("session_demo/v1/preview.html", "/tmp/spec-design-mcp")).toBe(
      ".runtime/artifacts/session_demo/v1/preview.html"
    );
  });

  it("uses SPEC_DESIGN_MCP_RUNTIME_DIR for runtime files and artifact refs", async () => {
    tempRuntimeDir = await mkdtemp(join(tmpdir(), "spec-design-mcp-runtime-"));
    process.env[runtimeDirEnvVar] = tempRuntimeDir;

    const writtenPath = await writeArtifactFile({
      relativePath: "session_demo/v1/preview.html",
      contents: "<html></html>"
    });

    expect(writtenPath).toBe(join(tempRuntimeDir, "artifacts", "session_demo/v1/preview.html"));
    expect(getArtifactRef("session_demo/v1/preview.html")).toBe(writtenPath);

    await writeFile(join(tempRuntimeDir, "marker.txt"), "ok", "utf8");
  });
});
