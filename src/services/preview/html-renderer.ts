import type { z } from "zod";

import { designAstSchema } from "../../schemas/ast.js";

type DesignAst = z.infer<typeof designAstSchema>;

function renderNode(node: Record<string, unknown>): string {
  const tag = String(node.tag);
  const nodeId = String(node.id);
  const name = String(node.name);
  const text = node.text === null ? "" : String(node.text);
  const children = Array.isArray(node.children)
    ? node.children.map((child) => renderNode(child as Record<string, unknown>)).join("")
    : "";

  return `<${tag} data-node-id="${nodeId}" data-node-name="${name}">${text}${children}</${tag}>`;
}

/**
 * 中文说明：
 * v0 preview 先追求结构可读和节点可追踪，不做复杂视觉还原。
 */
export function renderPreviewHtml(designAst: DesignAst): string {
  const body = renderNode(designAst.root as Record<string, unknown>);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Spec Design MCP Preview</title>
    <style>
      body { font-family: sans-serif; margin: 0; padding: 24px; background: #f5f5f5; color: #111; }
      [data-node-name="landing-page"] { display: block; max-width: 1100px; margin: 0 auto; background: #fff; padding: 32px; }
      section { border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; margin-bottom: 20px; background: #fff; }
      h1, h2, p, button { margin: 0 0 12px; }
      button { padding: 12px 16px; border: 0; border-radius: 10px; background: #111; color: #fff; }
    </style>
  </head>
  <body>${body}</body>
</html>`;
}
