import { emitCompiledDocumentCss } from "../compiler/css-emitter.js";

/**
 * 中文说明：
 * v0 export css 仅输出最小静态样式，保证导出 HTML 可直接查看。
 */
export function emitCompiledCss(): string {
  return emitCompiledDocumentCss("export");
}
