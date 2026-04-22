/**
 * 中文说明：
 * v0 export css 仅输出最小静态样式，保证导出 HTML 可直接查看。
 */
export function emitCompiledCss(): string {
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
  color: #111827;
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
