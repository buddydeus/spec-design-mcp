# Spec Design MCP TODO

更新时间：2026-06-06

## 当前状态

项目当前是 `Spec Design MCP v0` 的核心闭环原型，用于把非结构化设计需求转成结构化页面设计产物，并在确认后导出给下游开发 Agent 消费。

当前仓库状态：

- 分支：`master`
- 远端跟踪：`origin/master`
- 最近检查：阶段 7 已完成，待规划下一阶段
- 最近验证：
  - `npm test`：32 个测试文件、64 个测试通过
  - `npm run typecheck`：通过
  - `npm run build`：通过
  - stdio smoke：SDK client 可拉起 `dist/src/server.js` 并列出 7 个 MCP tools

当前已实现能力：

- stdio MCP Server 入口
- 官方 MCP SDK tool 注册
- 创建 session
- 追加 `text` / `url` 输入
- LLM-compatible intent provider 接口
- 可配置 OpenAI-compatible LLM intent provider
- rule-based clarify
- URL metadata 降级诊断
- 可选受限 URL HTML metadata 抓取
- 生成受限 `DesignDOMAST`
- 共享 `CompiledDocument` 编译中间结构
- 生成本地 preview
- 基于自然语言 revise 并生成新版本
- confirm 指定设计版本
- export 最小交付包
- 三组 milestone 7-8 端到端 smoke 样例
- 可配置 runtime root：`SPEC_DESIGN_MCP_RUNTIME_DIR`
- GitHub Actions CI
- 发布前检查清单

当前主要边界：

- 当前只提供本地 stdio MCP Server，尚未提供 HTTP transport。
- 默认 intent provider 仍是 rule-based fallback，真实 LLM provider 需要显式环境变量启用。
- URL 默认只从 metadata 派生弱信号；远端 HTML metadata 抓取需要显式环境变量启用。
- 设计产物以结构可用为主，不追求高保真视觉。
- preview/export 已共享基础编译核心；页面壳层和产物输出仍按模式分离。

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

## 当前下一步

阶段 7 已完成。下一轮建议从截图/视觉 diff、HTTP transport 或外部 URL parser 中选择一个新阶段。
