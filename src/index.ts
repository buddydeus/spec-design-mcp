/**
 * 中文说明：
 * 当前入口只负责聚合导出契约层内容。
 * 业务实现会在后续里程碑补入，不在本轮引入。
 */
export { errorCodes } from "./lib/errors/error-codes.js";
export type { ErrorCode } from "./lib/errors/error-codes.js";
export * from "./lib/errors/error-schema.js";
export * from "./schemas/ast.js";
export * from "./schemas/artifacts.js";
export * from "./schemas/common.js";

export const schemas = {};
