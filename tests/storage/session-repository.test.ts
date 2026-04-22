import { access, rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { createSessionRepository } from "../../src/storage/session-repository.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("session repository", () => {
  it("initializes sqlite storage under .runtime", async () => {
    const repository = await createSessionRepository();

    expect(repository).toBeDefined();
    await access(new URL("../../.runtime/sqlite/spec-design-mcp.db", import.meta.url));
  });
});
