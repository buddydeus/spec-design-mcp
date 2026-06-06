import { compileDesignAst } from "../compiler/ast-compiler.js";
import { renderHtmlFragment } from "../compiler/html-fragment-renderer.js";

/**
 * 中文说明：
 * export html 只保证结构可消费和节点可追踪，不追求高保真视觉。
 */
export function renderCompiledHtml(designAst: unknown): string {
  const compiledDocument = compileDesignAst(designAst);
  const body = renderHtmlFragment(compiledDocument.root);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Spec Design MCP Export</title>
    <link rel="stylesheet" href="./compiled.css" />
  </head>
  <body>${body}</body>
</html>`;
}
