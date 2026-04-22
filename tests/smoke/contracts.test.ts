import { describe, expect, it } from "vitest";

describe("contract entry", () => {
  it("exports a schema namespace", async () => {
    const entry = await import("../../src/index.js");

    expect(entry.schemas).toBeDefined();
  });
});
