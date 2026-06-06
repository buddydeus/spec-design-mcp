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
  font-family: sans-serif;
  background: #f5f5f5;
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
  padding: 32px;
}

section {
  margin-bottom: 20px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
}

h1, h2, p, button {
  margin: 0 0 12px;
}

button {
  padding: 12px 16px;
  border: 0;
  border-radius: 10px;
  background: #111827;
  color: #ffffff;
}`;
}
