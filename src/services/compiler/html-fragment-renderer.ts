import type { CompiledNode } from "./document-types.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([name, value]) => ` ${escapeHtml(name)}="${escapeHtml(value)}"`)
    .join("");
}

/** 中文说明：从统一编译节点渲染 HTML 片段，供 preview/export 共用；文本与属性值均做 HTML 实体转义。 */
export function renderHtmlFragment(node: CompiledNode): string {
  const text = escapeHtml(node.text ?? "");
  const children = node.children.map((child) => renderHtmlFragment(child)).join("");

  return `<${node.tag}${renderAttributes(node.attributes)}>${text}${children}</${node.tag}>`;
}
