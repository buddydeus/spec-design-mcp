import { compileDesignAst } from "../compiler/ast-compiler.js";

/**
 * 中文说明：
 * 当前 binding schema 只输出最小字段清单，便于后续下游消费。
 */
export function buildBindingSchema(designAst: unknown) {
  return compileDesignAst(designAst).bindingSchema;
}
