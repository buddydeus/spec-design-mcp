/**
 * 中文说明：
 * 统一维护可由外部 Agent 识别的稳定错误码。
 * 这些值属于外部契约，变更时必须谨慎处理兼容性。
 */
export const errorCodes = [
  "INPUT_INVALID",
  "CLARIFICATION_REQUIRED",
  "GENERATION_FAILED",
  "AST_INVALID",
  "VERSION_CONFLICT",
  "VERSION_NOT_FOUND",
  "VERSION_NOT_CONFIRMED",
  "PREVIEW_FAILED",
  "EXPORT_FAILED"
] as const;

export type ErrorCode = (typeof errorCodes)[number];
