import { designAstSchema } from "../../schemas/ast.js";

interface ExportNode {
  id: string;
  name: string;
  tag: string;
  text: string | null;
  children: ExportNode[];
}

function renderNode(node: ExportNode): string {
  const text = node.text ?? "";
  const children = node.children.map((child) => renderNode(child)).join("");

  return `<${node.tag} data-node-id="${node.id}" data-node-name="${node.name}">${text}${children}</${node.tag}>`;
}

/**
 * 中文说明：
 * export html 只保证结构可消费和节点可追踪，不追求高保真视觉。
 */
export function renderCompiledHtml(designAst: unknown): string {
  const validatedAst = designAstSchema.parse(designAst) as {
    root: ExportNode;
  };
  const body = renderNode(validatedAst.root);

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
