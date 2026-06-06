# Spec Design MCP

面向 AI Agent 的 `v0` 设计生成最小闭环 MCP Server 实现。

当前版本重点不是设计能力上限，而是契约稳定和端到端可交付。项目已经支持从需求输入到最小交付包导出的完整链路，并可通过 stdio MCP Server 被本地 MCP 客户端拉起，适合作为原型验证、集成联调和回归测试基线。

## 当前 `v0` 能力

- 创建设计会话
- 追加 `text` / `url` 输入
- rule-based clarify，返回缺失字段与问题
- 生成首版 `DesignDOMAST`
- 生成本地 preview
- 基于自然语言做 revise
- confirm 某个设计版本
- export 最小静态交付包
- stdio MCP Server 入口
- stateless Streamable HTTP MCP Server 入口
- HTTP Bearer auth、CORS allowlist 与基础限流
- 官方 MCP SDK tool 注册
- preview/export 共享基础编译核心
- 结构化视觉快照与 revise visual diff
- MVP 配置样例与 HTTP client walkthrough
- LLM-compatible intent provider 接口与 rule-based fallback
- 可配置 OpenAI-compatible LLM intent provider
- URL metadata 降级诊断
- 可选受限 URL HTML metadata 抓取
- 可配置外部 URL parser

## 当前 `v0` 不做

- 多页面站点编排
- 图片输入主链路
- 可视化编辑器
- 高保真设计还原
- screenshot 导出
- 默认启用真实 LLM provider
- 默认抓取远端 URL 内容
- 默认调用外部 URL parser
- 默认对公网暴露 HTTP endpoint

## MVP 默认策略

本地和内部 MVP 默认使用 `rule_based` intent provider，优点是确定性强、无外部依赖、适合作为联调和回归基线。需要更接近真实用户输入时，建议显式配置 `SPEC_DESIGN_MCP_INTENT_PROVIDER=openai_compatible` 与对应 LLM endpoint。

URL metadata 抓取和外部 URL parser 也默认关闭。MVP 阶段只有在目标 endpoint、超时、字节上限和失败 fallback 都明确后再开启。

配置样例见 `.env.example`；完整 HTTP 客户端联调流程见 `docs/mvp-walkthrough.md`。

## Intent Provider

`clarify` 流程通过 `IntentProvider` 接口提取页面意图。默认实现是 deterministic rule-based provider；也可以通过环境变量启用 OpenAI-compatible chat completions provider，并在请求失败或配置不完整时自动 fallback。

- `src/providers/llm/intent-provider.ts`
  - 定义未来可由真实 LLM 实现替换的接口
- `src/providers/llm/rule-based-intent-provider.ts`
  - 当前默认 fallback，实现 audience、sections、CTA、style tone 的稳定提取
- `src/providers/llm/openai-compatible-intent-provider.ts`
  - 可选真实 LLM provider，读取 chat completion JSON 响应
- `src/providers/parser/url-parser.ts`
  - 默认只从 hostname/path 派生弱信号；可选抓取受限 HTML metadata 或调用外部 parser，并返回 `fallbackReason`

启用真实 LLM intent provider：

```bash
SPEC_DESIGN_MCP_INTENT_PROVIDER=openai_compatible
SPEC_DESIGN_MCP_LLM_ENDPOINT=https://api.example.com/v1/chat/completions
SPEC_DESIGN_MCP_LLM_MODEL=your-model
SPEC_DESIGN_MCP_LLM_API_KEY=your-api-key
```

`SPEC_DESIGN_MCP_LLM_API_KEY` 可选；如果你的 endpoint 不需要 Bearer token，可以不设置。

启用受限 URL metadata 抓取：

```bash
SPEC_DESIGN_MCP_URL_FETCH=metadata
SPEC_DESIGN_MCP_URL_FETCH_TIMEOUT_MS=2000
SPEC_DESIGN_MCP_URL_FETCH_MAX_BYTES=64000
```

URL 抓取默认关闭。开启后仅请求 `http` / `https`，拒绝 localhost、loopback 和常见 private IP 目标，只接受 HTML / XHTML 响应，并只读取限定字节数内的 `<title>`、`description`、`og:description` 和首个 `<h1>`。

启用外部 URL parser：

```bash
SPEC_DESIGN_MCP_URL_PARSER=external
SPEC_DESIGN_MCP_URL_PARSER_ENDPOINT=https://parser.example.com/parse
SPEC_DESIGN_MCP_URL_PARSER_API_KEY=your-api-key
SPEC_DESIGN_MCP_URL_PARSER_TIMEOUT_MS=2000
```

外部 URL parser 需要返回 JSON。当前会读取 `summaryText` / `summary`、`title`、`description`、`heading` / `h1`、`keywords` 这些字段并合并为 URL intent signal。`SPEC_DESIGN_MCP_URL_PARSER_API_KEY` 可选；外部 parser 请求失败或返回不可用内容时，会回退到本地 URL signal。

## 环境要求

- Node.js 22+
- pnpm 10+

项目当前使用 `node:sqlite`，运行测试时会看到 `ExperimentalWarning`，这是当前阶段可接受的已知现象。

## 安装

```bash
pnpm install
```

## 常用命令

```bash
pnpm test
pnpm run typecheck
pnpm run build
pnpm run dev
pnpm start
pnpm run start:http
```

`npm run dev` 会启动调试用 HTTP MCP server，并在 `src/` 或 `tsconfig.json` 变化后自动重新编译和重启。默认地址仍是 `http://127.0.0.1:3010/mcp`，可继续使用 `SPEC_DESIGN_MCP_HTTP_*` 环境变量覆盖。

CI 使用 GitHub Actions 跑同一组核心验证：`pnpm install --frozen-lockfile`、`pnpm run typecheck`、`pnpm test`、`pnpm run build`。

只跑最小交付回归：

```bash
pnpm test -- tests/smoke/milestone-7-8.test.ts
```

只跑 MCP server 注册测试：

```bash
pnpm test -- tests/mcp/server.test.ts
```

## MCP Server

项目使用官方 `@modelcontextprotocol/sdk` 暴露 stdio 与 stateless Streamable HTTP 两种 MCP transport。

stdio 入口构建后可直接启动：

```bash
pnpm run build
node dist/src/server.js
```

`package.json` 同时提供：

```bash
pnpm start
```

本地 MCP 客户端可按进程方式配置：

```json
{
  "mcpServers": {
    "spec-design-mcp": {
      "command": "node",
      "args": ["/Users/buddy/Project/buddydeus/spec-design-mcp/dist/src/server.js"],
      "cwd": "/Users/buddy/Project/buddydeus/spec-design-mcp"
    }
  }
}
```

若在其他目录使用，请把 `args[0]` 与 `cwd` 换成实际仓库路径。

HTTP 入口构建后可直接启动：

```bash
pnpm run build
pnpm run start:http
```

默认监听：

- host：`127.0.0.1`
- port：`3010`
- MCP endpoint：`/mcp`
- health endpoint：`/healthz`

可通过环境变量调整：

```bash
SPEC_DESIGN_MCP_HTTP_HOST=127.0.0.1
SPEC_DESIGN_MCP_HTTP_PORT=3010
SPEC_DESIGN_MCP_HTTP_PATH=/mcp
SPEC_DESIGN_MCP_HTTP_AUTH_TOKEN=
SPEC_DESIGN_MCP_HTTP_ALLOWED_ORIGINS=
SPEC_DESIGN_MCP_HTTP_RATE_LIMIT_WINDOW_MS=60000
SPEC_DESIGN_MCP_HTTP_RATE_LIMIT_MAX_REQUESTS=120
```

`SPEC_DESIGN_MCP_HTTP_AUTH_TOKEN` 设置后，客户端必须发送 `Authorization: Bearer <token>`。`SPEC_DESIGN_MCP_HTTP_ALLOWED_ORIGINS` 使用逗号分隔；为空时不返回 CORS 头。限流按 remote address 计数，把窗口或上限设为 `0` 可关闭。

Streamable HTTP 客户端可连接：

```text
http://127.0.0.1:3010/mcp
```

MVP HTTP walkthrough 可直接调用全部 7 个 MCP tools：

```bash
node examples/mvp-http-client.mjs
```

## 对外工具

当前 `v0` 暴露以下 MCP tools：

- `design.session.create`
- `design.session.append_input`
- `design.intent.clarify`
- `design.design.generate`
- `design.design.revise`
- `design.design.confirm`
- `design.export.package`

对应本地 handler 与 schema 导出入口统一聚合在 `src/index.ts`。MCP 注册工厂位于 `src/mcp/server.ts`，stdio 启动入口位于 `src/server.ts`，HTTP 启动入口位于 `src/http-server.ts`。

## 编译管线

`DesignDOMAST` 会先编译为共享的 `CompiledDocument` 中间结构，再派生 preview/export 所需产物。

- `src/services/compiler/`
  - 统一 AST 编译、HTML 片段渲染、基础 CSS 规则、基础 style 映射和视觉快照
- `src/services/preview/`
  - 负责 preview 页面壳层、`preview.html`、`section-summary.json`、`visual-snapshot.json` 和 revise 时的 `visual-diff.json` 落盘
- `src/services/export/`
  - 负责 export 页面壳层、CSS、`visual-snapshot.json`、manifest 和交付包落盘

这样可以保证 preview/export 的节点层级、`data-node-id` 和基础标签映射来自同一套结构规则。

## 最小流程

1. `createSessionTool`
2. `appendInputTool`
3. `clarifyIntentTool`
4. `generateDesignTool`
5. `reviseDesignTool`
6. `confirmDesignTool`
7. `exportPackageTool`

通过 MCP 调用时对应工具名为：

1. `design.session.create`
2. `design.session.append_input`
3. `design.intent.clarify`
4. `design.design.generate`
5. `design.design.revise`
6. `design.design.confirm`
7. `design.export.package`

## 运行时目录

项目运行时数据默认落在 `.runtime/`：

- `.runtime/sqlite/`
  - SQLite 元数据
- `.runtime/artifacts/<sessionId>/<version>/`
  - preview 与 export 产物
  - revise 版本额外包含 `visual-diff.json`

其中 export 目录最少包含：

- `artifact-manifest.json`
- `design-ast.json`
- `compiled.html`
- `compiled.css`
- `visual-snapshot.json`
- `annotation-manifest.json`
- `binding.schema.json`

`artifact-manifest.json` 是最小交付包的唯一入口。

如需把运行时数据放到仓库外部，可设置：

```bash
SPEC_DESIGN_MCP_RUNTIME_DIR=/absolute/path/to/runtime
```

设置后 SQLite 与 artifacts 都会写入该目录；导出的 artifact 引用会返回对应绝对路径。

## 测试结构

- `tests/services/`
  - service 级行为测试
- `tests/tools/`
  - tool handler 输入输出测试
- `tests/storage/`
  - SQLite / 文件落盘相关测试
- `tests/providers/`
  - intent provider 与 URL parser 测试
- `tests/lib/`
  - runtime path 与错误模型测试
- `tests/smoke/`
  - 里程碑级端到端 smoke
- `tests/mcp/`
  - MCP server 注册、stdio/HTTP transport 入口与结构化返回测试

当前 `Milestone 7-8` smoke 已覆盖 `3` 组固定样例，覆盖 developer、founder、marketer 三类输入组合，用于证明 `v0` 最小交付闭环可在不同输入组合下稳定运行。MCP server 测试覆盖 7 个工具注册、结构化 tool result 包装和 Streamable HTTP client 连接。

## 后续优化

- 真实浏览器 screenshot 导出
- stateful HTTP session 管理

发布或交付前检查见 `docs/release-checklist.md`。
