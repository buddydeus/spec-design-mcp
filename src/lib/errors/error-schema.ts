import { z } from "zod";

import { errorCodes } from "./error-codes.js";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * 中文说明：
 * details 允许承载宽松 JSON 值，避免在契约层过早把不同工具的错误细节写死。
 */
export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema)
  ])
);

/** 中文说明：统一错误码枚举 schema。 */
export const ErrorCode = z.enum(errorCodes);

/**
 * 中文说明：
 * 所有 MCP tool 失败都应返回统一结构，便于外部 Agent 做自动化判断。
 */
export const errorResponseSchema = z.object({
  code: ErrorCode,
  message: z.string().min(1),
  details: jsonValueSchema.optional(),
  retryable: z.boolean()
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
