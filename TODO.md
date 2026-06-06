# Spec Design MCP TODO

更新时间：2026-06-06

## 当前状态

项目当前是 `Spec Design MCP v0` 的核心闭环原型，用于把非结构化设计需求转成结构化页面设计产物，并在确认后导出给下游开发 Agent 消费。

当前仓库状态：

- 分支：`master`
- 远端跟踪：`origin/master`
- 最近检查：阶段 11 已完成，MVP 前必做 2-5 已收口
- 最近验证：
  - `npm test`：34 个测试文件、75 个测试通过
  - `npm run typecheck`：通过
  - `npm run build`：通过
  - stdio smoke：SDK client 可拉起 `dist/src/server.js` 并列出 7 个 MCP tools
  - HTTP smoke：SDK Streamable HTTP client 可携带 Bearer token 连接 `dist/src/http-server.js` 并列出 7 个 MCP tools
  - MVP HTTP client walkthrough：`node examples/mvp-http-client.mjs` 可跑通 7 个 MCP tools 并导出交付包

当前已实现能力：

- stdio MCP Server 入口
- stateless Streamable HTTP MCP Server 入口
- HTTP Bearer auth、CORS allowlist 与基础限流
- 官方 MCP SDK tool 注册
- MVP 配置样例：`.env.example`
- MVP HTTP client walkthrough：`examples/mvp-http-client.mjs`、`docs/mvp-walkthrough.md`
- 创建 session
- 追加 `text` / `url` 输入
- LLM-compatible intent provider 接口
- 可配置 OpenAI-compatible LLM intent provider
- rule-based clarify
- URL metadata 降级诊断
- 可选受限 URL HTML metadata 抓取
- 可配置外部 URL parser
- 生成受限 `DesignDOMAST`
- 共享 `CompiledDocument` 编译中间结构
- 结构化视觉快照与 revise visual diff
- 生成本地 preview
- 基于自然语言 revise 并生成新版本
- confirm 指定设计版本
- export 最小交付包
- 三组 milestone 7-8 端到端 smoke 样例
- 可配置 runtime root：`SPEC_DESIGN_MCP_RUNTIME_DIR`
- GitHub Actions CI
- 发布前检查清单

当前主要边界：

- 当前提供本地 stdio MCP Server 和 stateless Streamable HTTP MCP Server。
- HTTP 入口仍默认监听 localhost；对外暴露前应配置 auth token、allowed origins 和 rate limit。
- 默认 intent provider 仍是 rule-based fallback，真实 LLM provider 需要显式环境变量启用。
- URL 默认只从 metadata 派生弱信号；远端 HTML metadata 抓取和外部 parser 需要显式环境变量启用。
- 设计产物以结构可用为主，不追求高保真视觉。
- preview/export 已共享基础编译核心；页面壳层和产物输出仍按模式分离。
- HTTP transport 仍是 stateless；业务 session 由现有持久化层管理，transport stateful session 仍不是 MVP 必需项。

已知非阻塞提醒：

- `node:sqlite` 会输出 `ExperimentalWarning`，当前阶段可接受。
- `node:sqlite` 仍是 experimental runtime 依赖。

## 执行规则

后续按下面阶段顺序推进。每个阶段结束时必须：

1. 更新本文件的阶段状态、完成内容、验证结果和下一步。
2. 运行对应验证命令。
3. 执行 `/commit-helper`，提交该阶段改动。

## 阶段计划

### 阶段 1：补齐真正 MCP Server 入口

状态：已完成

目标：

- 已引入官方 MCP SDK。
- 已增加可启动的 stdio server 入口：`src/server.ts`。
- 已将现有 7 个 handler 注册为 MCP tools：
  - `design.session.create`
  - `design.session.append_input`
  - `design.intent.clarify`
  - `design.design.generate`
  - `design.design.revise`
  - `design.design.confirm`
  - `design.export.package`
- 已在 `package.json` 增加 `start` 脚本和 `bin` 配置。
- 已增加 MCP server tool registration 测试。

验收：

- MCP server 可以通过本地 stdio 方式启动。
- 现有 handler 行为不回退。
- `npm test`、`npm run typecheck`、`npm run build` 通过。
- stdio smoke 通过：SDK client 可拉起 `dist/src/server.js` 并列出全部 7 个 tools。

### 阶段 2：更新和收敛文档

状态：已完成

目标：

- 已更新 README，补充 MCP server 启动、客户端配置和最小调用流程。
- 已替换过期的 `.feats/01.md` 暂停点说明。
- 已明确当前 v0 完成 confirm/export 和 stdio MCP Server，不再保留旧的“未完成”状态。
- 已补充运行时目录、导出包结构和调试说明。

验收：

- 文档状态与代码实际能力一致。
- 新人可按 README 启动并理解最小链路。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

### 阶段 3：统一 preview/export 编译管线

状态：已完成

目标：

- 已参考 `.feats/mileston-7-8-C.md` 的方案 C。
- 已抽公共 HTML 节点渲染，降低 preview/export 重复逻辑。
- 已引入统一中间结构 `CompiledDocument`。
- 已让 annotation、binding、HTML 输出从统一编译结果派生。
- 已增加结构一致性测试，防止 preview/export 漂移。

验收：

- preview/export 节点层级、`data-node-id` 和基础标签映射保持一致。
- 现有导出包契约不破坏。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

### 阶段 4：增强真实可用性

状态：已完成

目标：

- 已定义 LLM-compatible intent provider 接口并保留 rule-based fallback。
- 已增强 URL parser 的降级与错误提示。
- 已扩充固定样例集到 3 组。
- 已提升 export CSS 的基础视觉质量，并支持基础 AST style 映射。
- 已继续保持单页 Landing Page v0 范围，不提前扩到多页面。

验收：

- 新能力有清晰 fallback。
- 样例覆盖更多输入组合。
- 设计质量提升不破坏 AST 契约。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

### 阶段 5：工程化收尾

状态：已完成

目标：

- 已清理 `.npmrc` 过期配置 warning。
- 已增加 GitHub Actions CI，覆盖 `npm ci`、`npm run typecheck`、`npm test`、`npm run build`。
- 已将 `.runtime` 路径做成可配置项：`SPEC_DESIGN_MCP_RUNTIME_DIR`。
- 已补充发布前检查清单：`docs/release-checklist.md`。

验收：

- 常用命令不再输出旧 `.npmrc` unknown config warning。
- 本地和 CI 验证路径一致。
- 运行时目录配置清晰。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

### 阶段 6：接入真实 LLM provider 通道

状态：已完成

目标：

- 已新增 OpenAI-compatible chat completions intent provider。
- 已通过环境变量选择真实 LLM provider 或默认 rule-based fallback。
- 已在 LLM 配置缺失、HTTP 失败或响应异常时自动 fallback。
- 已补充 provider 配置和 HTTP provider 测试。

验收：

- 默认无配置时仍完全本地可跑。
- 配置 `SPEC_DESIGN_MCP_INTENT_PROVIDER=openai_compatible` 后可调用真实 LLM endpoint。
- LLM 失败不会破坏 clarify 主链路。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

### 阶段 7：增强 URL 抓取治理

状态：已完成

目标：

- 已新增可配置 URL signal resolver，默认保持不联网。
- 已通过 `SPEC_DESIGN_MCP_URL_FETCH=metadata` 启用受限 HTML metadata 抓取。
- 已支持超时、最大读取字节数、HTML content-type 检查。
- 已拒绝 localhost、loopback 和常见 private IP 目标。
- 已把 URL resolver 接入 clarify 主链路，并保留所有 fallback。

验收：

- 默认无配置时仍只从 hostname/path 派生弱信号。
- 开启 URL 抓取后可提取 `<title>`、`description`、`og:description` 和首个 `<h1>`。
- 不安全目标、非 HTML 响应和抓取失败都不会破坏 clarify 主链路。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

### 阶段 8：扩展视觉快照与 visual diff

状态：已完成

目标：

- 已从共享 `CompiledDocument` 派生结构化 `visual-snapshot.json`。
- 已在 preview 产物中输出 `visual-snapshot.json`。
- 已在 revise 版本中输出 `visual-diff.json`，比较上一版本与新版本的节点、层级、文案和样式指纹。
- 已在 export 交付包 manifest 中纳入 `visual-snapshot.json`。
- 已补充视觉快照、preview、revise、export 和 smoke 回归测试。

验收：

- preview/export 的视觉快照来自同一编译管线。
- revise 后可以生成结构化 visual diff，供下游做回归判断。
- export manifest 可发现并消费 `visual-snapshot.json`。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

### 阶段 9：补齐 HTTP transport

状态：已完成

目标：

- 已新增 `src/http-server.ts`，提供 stateless Streamable HTTP MCP endpoint。
- 已新增 `npm run start:http` 和 `spec-design-mcp-http` bin 入口。
- 已支持 `SPEC_DESIGN_MCP_HTTP_HOST`、`SPEC_DESIGN_MCP_HTTP_PORT`、`SPEC_DESIGN_MCP_HTTP_PATH` 配置。
- 已提供 `/healthz` 健康检查。
- 已用官方 SDK `StreamableHTTPClientTransport` 覆盖 HTTP client 连接和 7 个 tools 注册。

验收：

- 构建后可通过 HTTP endpoint 连接 MCP server。
- stdio 入口保持不变。
- HTTP 入口默认不维护 transport session 状态，业务 session 仍由现有持久化层管理。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

### 阶段 10：接入外部 URL parser

状态：已完成

目标：

- 已新增 `SPEC_DESIGN_MCP_URL_PARSER=external` 外部 parser 模式。
- 已支持 `SPEC_DESIGN_MCP_URL_PARSER_ENDPOINT`、`SPEC_DESIGN_MCP_URL_PARSER_API_KEY`、`SPEC_DESIGN_MCP_URL_PARSER_TIMEOUT_MS` 配置。
- 已向外部 parser 发送 URL 和本地 fallback signal。
- 已归一化外部 JSON 中的 `summaryText` / `summary`、`title`、`description`、`heading` / `h1`、`keywords` 字段。
- 已在外部 parser 缺失、HTTP 失败、响应不可用或异常时回退到本地 URL signal。

验收：

- 默认无配置时仍完全本地可跑。
- 配置外部 parser 后 clarify 可消费外部 parser 增强后的 URL intent signal。
- 外部 parser 失败不会破坏 clarify 主链路。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

### 阶段 11：MVP readiness：配置、walkthrough 与 HTTP 暴露策略

状态：已完成

目标：

- 已新增 `.env.example`，集中记录 runtime、LLM provider、URL fetch/parser、HTTP transport、防护和 MVP client 配置。
- 已新增 `docs/mvp-walkthrough.md`，说明本地 MVP、真实 LLM MVP、HTTP 暴露防护和 client 联调流程。
- 已新增 `examples/mvp-http-client.mjs`，通过官方 SDK Streamable HTTP client 顺序调用 7 个 MCP tools。
- 已明确 MVP 默认策略：本地/internal MVP 默认 rule-based；真实 MVP demo 建议显式配置 OpenAI-compatible LLM provider。
- 已新增 HTTP Bearer auth、CORS allowlist 与 remote-address 基础限流，支持通过环境变量配置。

验收：

- `.env.example` 覆盖当前所有主要运行配置。
- HTTP endpoint 在配置 token 后拒绝未授权请求，并允许携带 Bearer token 的 SDK client 连接。
- CORS 只对配置的 browser origin 返回允许头；限流超过阈值返回 `429`。
- `npm test`、`npm run typecheck`、`npm run build` 通过。
- stdio smoke、HTTP auth smoke、MVP HTTP client walkthrough 通过。

## 当前下一步

阶段 11 已完成。以可以进行 MVP 为标准，当前剩余项已降为非阻塞增强：真实浏览器 screenshot 导出、stateful HTTP transport session 管理、外部 URL parser 响应契约进一步收敛，以及把当前分支推送/发版。
