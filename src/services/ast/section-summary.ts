import type { z } from "zod";

import { designAstSchema } from "../../schemas/ast.js";

type DesignAst = z.infer<typeof designAstSchema>;

/**
 * 中文说明：
 * section summary 直接从 AST 顶层 section 名称派生，避免维护第二份结构描述。
 */
export function createSectionSummary(designAst: DesignAst): string[] {
  const root = designAst.root as { children: Array<{ kind: string; name: string }> };

  return root.children
    .filter((node) => node.kind === "section")
    .map((node) => node.name);
}
