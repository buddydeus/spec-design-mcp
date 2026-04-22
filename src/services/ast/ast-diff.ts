import type { RevisionOperation } from "./ast-reviser.js";

/** 中文说明：AST 修订摘要的最小返回结构。 */
export interface AstDiffResult {
  diffSummary: string[];
  nodeDiffs: Record<string, unknown>[];
}

/**
 * 中文说明：
 * v0 diff 只输出稳定、可序列化的结构，便于测试和后续工具消费。
 */
export function createAstDiff(operations: RevisionOperation[]): AstDiffResult {
  return {
    diffSummary: operations.map((operation) => operation.summary),
    nodeDiffs: operations.map((operation) => ({ ...operation }))
  };
}
