import { compileDesignAst } from "../compiler/ast-compiler.js";

/**
 * 中文说明：
 * annotation manifest 复用 AST 中已有的节点元信息，不额外推导复杂语义。
 */
export function buildAnnotationManifest(designAst: unknown) {
  return compileDesignAst(designAst).annotations;
}
