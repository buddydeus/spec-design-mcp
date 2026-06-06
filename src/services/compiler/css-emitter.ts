export type CompiledCssMode = "preview" | "export";

/**
 * 中文说明：
 * preview/export 共享基础视觉规则；差异仅收敛到输出模式，而不是重复维护节点规则。
 */
export function emitCompiledDocumentCss(mode: CompiledCssMode): string {
  const bodyColor = mode === "preview" ? "#111" : "#111827";

  return `:root {
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 24px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.5;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  color: ${bodyColor};
}

[data-node-id] {
  position: relative;
}

main {
  display: block;
  max-width: 1100px;
  margin: 0 auto;
  background: #ffffff;
  padding: 40px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

section {
  margin-bottom: 24px;
  padding: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

h1, h2, p, button {
  margin: 0 0 12px;
}

h1, h2 {
  line-height: 1.12;
  color: #0f172a;
}

p {
  max-width: 68ch;
  color: #475569;
}

button {
  padding: 12px 16px;
  border: 0;
  border-radius: 8px;
  font-weight: 700;
  background: #0f172a;
  color: #ffffff;
}`;
}
