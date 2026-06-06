import type { CompiledNode } from "./document-types.js";

function renderAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${value}"`)
    .join("");
}

/** 中文说明：从统一编译节点渲染 HTML 片段，供 preview/export 共用。 */
export function renderHtmlFragment(node: CompiledNode): string {
  const text = node.text ?? "";
  const children = node.children.map((child) => renderHtmlFragment(child)).join("");

  return `<${node.tag}${renderAttributes(node.attributes)}>${text}${children}</${node.tag}>`;
}
