# Spec Design MCP TODO

更新时间：2026-06-06

## 当前状态

项目当前是 `Spec Design MCP v0` 的核心闭环原型，用于把非结构化设计需求转成结构化页面设计产物，并在确认后导出给下游开发 Agent 消费。

当前仓库状态：

- 分支：`master`
- 远端跟踪：`origin/master`
- 最近检查：阶段 1 已完成，待开始阶段 2
- 最近验证：
  - `npm test`：26 个测试文件、43 个测试通过
  - `npm run typecheck`：通过
  - `npm run build`：通过
  - stdio smoke：SDK client 可拉起 `dist/src/server.js` 并列出 7 个 MCP tools

当前已实现能力：

- stdio MCP Server 入口
- 官方 MCP SDK tool 注册
- 创建 session
- 追加 `text` / `url` 输入
- rule-based clarify
- 生成受限 `DesignDOMAST`
- 生成本地 preview
- 基于自然语言 revise 并生成新版本
- confirm 指定设计版本
- export 最小交付包
- 两组 milestone 7-8 端到端 smoke 样例

当前主要边界：

- 当前只提供本地 stdio MCP Server，尚未提供 HTTP transport。
- 生成、澄清、修订仍是 rule-based，不是真实 LLM provider。
- URL 解析能力较基础。
- 设计产物以结构可用为主，不追求高保真视觉。
- preview/export 当前是两条相邻编译链路，后续可能出现结构漂移。

已知非阻塞提醒：

- `node:sqlite` 会输出 `ExperimentalWarning`，当前阶段可接受。
- `.npmrc` 中部分 npm 配置会触发未来版本兼容性 warning，后续工程化阶段处理。

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

状态：待开始

目标：

- 更新 README，补充 MCP server 启动、客户端配置和最小调用流程。
- 更新或替换过期的 `.feats/01.md` 暂停点说明。
- 明确当前 v0 已完成 confirm/export，不再保留旧的“未完成”状态。
- 补充运行时目录、导出包结构和调试说明。

验收：

- 文档状态与代码实际能力一致。
- 新人可按 README 启动并理解最小链路。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

### 阶段 3：统一 preview/export 编译管线

状态：待开始

目标：

- 参考 `.feats/mileston-7-8-C.md` 的方案 C。
- 先抽公共 HTML 节点渲染，降低 preview/export 重复逻辑。
- 再引入统一中间结构，例如 `CompiledDocument`。
- 让 annotation、binding、HTML 输出逐步从统一编译结果派生。
- 增加结构一致性测试，防止 preview/export 漂移。

验收：

- preview/export 节点层级、`data-node-id` 和基础标签映射保持一致。
- 现有导出包契约不破坏。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

### 阶段 4：增强真实可用性

状态：待开始

目标：

- 定义 LLM provider 接口并保留 rule-based fallback。
- 增强 URL parser 的降级与错误提示。
- 扩充固定样例集。
- 提升 export CSS 的基础视觉质量。
- 继续保持单页 Landing Page v0 范围，不提前扩到多页面。

验收：

- 新能力有清晰 fallback。
- 样例覆盖更多输入组合。
- 设计质量提升不破坏 AST 契约。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

### 阶段 5：工程化收尾

状态：待开始

目标：

- 清理 `.npmrc` 过期配置 warning。
- 增加 CI 建议或配置，至少覆盖 test/typecheck/build。
- 将 `.runtime` 路径做成可配置项。
- 补充发布前检查清单。

验收：

- 常用命令 warning 明显减少。
- 本地和 CI 验证路径一致。
- 运行时目录配置清晰。
- `npm test`、`npm run typecheck`、`npm run build` 通过。

## 当前下一步

开始阶段 2：更新和收敛文档。
