/** 中文说明：验证统一错误 schema 的核心约束。 */
import { describe, expect, it } from "vitest";
import {
  errorResponseSchema,
  ErrorCode
} from "../../../src/lib/errors/error-schema.js";

describe("error schema", () => {
  it("accepts VERSION_CONFLICT as a valid error code", () => {
    const result = errorResponseSchema.safeParse({
      code: ErrorCode.enum.VERSION_CONFLICT,
      message: "baseVersion is stale",
      details: { expectedVersion: "v2" },
      retryable: false
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown error codes", () => {
    const result = errorResponseSchema.safeParse({
      code: "UNKNOWN",
      message: "bad code",
      details: null,
      retryable: false
    });

    expect(result.success).toBe(false);
  });
});
