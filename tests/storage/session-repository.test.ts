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
    repository.close();
  });

  it("persists a created session", async () => {
    const repository = await createSessionRepository();

    const session = await repository.createSession({
      sessionId: "session_test_create",
      projectName: "Spec MCP",
      goal: "Create landing page",
      status: "created"
    });

    const stored = await repository.getSession(session.sessionId);

    expect(stored?.projectName).toBe("Spec MCP");
    expect(stored?.inputs).toEqual([]);
    repository.close();
  });

  it("appends inputs without overwriting earlier entries", async () => {
    const repository = await createSessionRepository();

    await repository.createSession({
      sessionId: "session_test_append",
      projectName: "Spec MCP",
      goal: "Collect inputs",
      status: "created"
    });

    await repository.appendInputs("session_test_append", [
      { type: "text", text: "First" },
      { type: "url", url: "https://example.com" }
    ]);

    const stored = await repository.getSession("session_test_append");

    expect(stored?.inputs).toHaveLength(2);
    expect(stored?.inputs[0]).toEqual({ type: "text", text: "First" });
    expect(stored?.inputs[1]).toEqual({ type: "url", url: "https://example.com" });
    repository.close();
  });

  it("updates confirmed version and confirmed status", async () => {
    const repository = await createSessionRepository();

    await repository.createSession({
      sessionId: "session_test_confirm",
      projectName: "Spec MCP",
      goal: "Confirm design",
      status: "created"
    });

    await repository.confirmVersion("session_test_confirm", "v2");

    const stored = await repository.getSession("session_test_confirm");

    expect(stored?.confirmedVersion).toBe("v2");
    expect(stored?.status).toBe("confirmed");
    repository.close();
  });
});
