/**
 * 中文说明：
 * 这是当前仓库对外暴露的契约层统一入口。
 * 后续业务实现应优先依赖这里聚合的稳定 schema，而不是跨目录直接引用内部文件。
 */
export { errorCodes } from "./lib/errors/error-codes.js";
export type { ErrorCode } from "./lib/errors/error-codes.js";
export * from "./lib/errors/error-schema.js";
export * from "./schemas/index.js";

/** 中文说明：用于标识当前导出的契约集合。 */
export const schemas = {
  name: "spec-design-mcp-contracts"
};
