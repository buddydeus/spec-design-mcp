import { compileDesignAst } from "../compiler/ast-compiler.js";
import { emitCompiledDocumentCss } from "../compiler/css-emitter.js";
import { renderHtmlFragment } from "../compiler/html-fragment-renderer.js";

/**
 * 中文说明：
 * v0 preview 先追求结构可读和节点可追踪，不做复杂视觉还原。
 */
export function renderPreviewHtml(designAst: unknown): string {
  const compiledDocument = compileDesignAst(designAst);
  const body = renderHtmlFragment(compiledDocument.root);
  const css = emitCompiledDocumentCss("preview");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Spec Design MCP Preview</title>
    <style>${css}</style>
  </head>
  <body>${body}</body>
</html>`;
}
