# Spec Design MCP V0 Milestone 7-8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 `v0` 的最小交付闭环，实现 `design.design.confirm`、`design.export.package`，并用 1 组固定样例验证从 session 到 export 的全链路可交付。

**Architecture:** 保持当前 `session -> clarify -> generate -> revise -> preview` 主链路不变，在其旁边新增 `confirm service` 与 `export service`。`confirm` 只负责写回 `confirmedVersion` 和会话状态；`export` 只允许导出已确认版本，并从同一份 AST 生成最小静态交付包到 `.runtime/artifacts/<sessionId>/<version>/export/`。

**Tech Stack:** Node.js, TypeScript, Vitest, Zod, node:sqlite, node:fs/promises

---

## 文件结构规划

- `src/storage/session-repository.ts`
  - 增加确认版本写回能力
- `src/services/export/html-exporter.ts`
  - AST -> `compiled.html`
- `src/services/export/css-emitter.ts`
  - 输出基础 `compiled.css`
- `src/services/export/annotation-builder.ts`
  - 生成 `annotation-manifest.json`
- `src/services/export/binding-builder.ts`
  - 生成 `binding.schema.json`
- `src/services/export/export-service.ts`
  - 校验 confirmed/export 规则并生成导出包
- `src/services/conversation/confirm-service.ts`
  - 负责确认版本并更新 session 状态
- `src/tools/confirm-tools.ts`
  - 对外提供 `design.design.confirm` handler
- `src/tools/export-tools.ts`
  - 对外提供 `design.export.package` handler
- `src/index.ts`
  - 导出 confirm/export tool
- `tests/storage/session-repository.test.ts`
  - 会话确认状态写回测试
- `tests/services/confirm-service.test.ts`
  - confirm 主路径和版本不存在测试
- `tests/services/export-service.test.ts`
  - export 主路径、未确认禁止导出测试
- `tests/tools/confirm-tools.test.ts`
  - confirm tool 返回结构测试
- `tests/tools/export-tools.test.ts`
  - export tool 返回结构测试
- `tests/smoke/milestone-7-8.test.ts`
  - 固定样例全链路回归测试

## 任务顺序

### Task 1: 先用失败测试锁定 confirm 的最小行为

**Files:**
- Modify: `tests/storage/session-repository.test.ts`
- Create: `tests/services/confirm-service.test.ts`
- Modify: `src/storage/session-repository.ts`

- [ ] 写失败测试，覆盖以下行为：
  - 可将某个存在的设计版本设为 `confirmedVersion`
  - session 状态推进到 `confirmed`
  - 不存在版本时抛出 `VERSION_NOT_FOUND`
- [ ] 运行 `npm test -- tests/storage/session-repository.test.ts tests/services/confirm-service.test.ts`
- [ ] 确认失败原因来自 confirm 能力缺失，而不是测试本身错误

### Task 2: 实现 confirm service 与 tool

**Files:**
- Create: `src/services/conversation/confirm-service.ts`
- Create: `src/tools/confirm-tools.ts`
- Modify: `src/index.ts`
- Create: `tests/tools/confirm-tools.test.ts`

- [ ] 以最小实现完成确认流程：
  - 读取设计版本
  - 校验版本存在
  - 写回 session 的 `confirmedVersion`
  - 更新 session 状态为 `confirmed`
- [ ] 先写并运行 `tests/tools/confirm-tools.test.ts`，确认失败
- [ ] 实现 tool 接线
- [ ] 回跑 `npm test -- tests/services/confirm-service.test.ts tests/tools/confirm-tools.test.ts`
- [ ] 跑 `npm run typecheck`

### Task 3: 用失败测试锁定 export 交付包结构

**Files:**
- Create: `tests/services/export-service.test.ts`
- Create: `tests/tools/export-tools.test.ts`
- Create: `tests/smoke/milestone-7-8.test.ts`

- [ ] 写失败测试，覆盖以下行为：
  - 未确认版本导出时报 `VERSION_NOT_CONFIRMED`
  - 已确认版本导出生成最小交付包
  - `artifact-manifest.json` 索引所有导出文件
  - 固定样例可从 create 一路走到 export
- [ ] 运行 `npm test -- tests/services/export-service.test.ts tests/tools/export-tools.test.ts tests/smoke/milestone-7-8.test.ts`
- [ ] 确认失败原因来自 export 能力缺失，而不是测试本身错误

### Task 4: 实现最小静态导出链路

**Files:**
- Create: `src/services/export/html-exporter.ts`
- Create: `src/services/export/css-emitter.ts`
- Create: `src/services/export/annotation-builder.ts`
- Create: `src/services/export/binding-builder.ts`
- Create: `src/services/export/export-service.ts`
- Create: `src/tools/export-tools.ts`
- Modify: `src/index.ts`

- [ ] 实现 `compiled.html`
  - 复用 AST 节点结构
  - 保留 `data-node-id`
- [ ] 实现 `compiled.css`
  - 只输出基础静态样式
- [ ] 实现 `annotation-manifest.json`
  - 为全部节点输出最小标注信息
- [ ] 实现 `binding.schema.json`
  - 从 AST 中提取最小绑定字段清单
- [ ] 实现 `design-ast.json` 与 `artifact-manifest.json`
- [ ] 通过 `export service` 写入 `.runtime/artifacts/<sessionId>/<version>/export/`
- [ ] 回跑 `npm test -- tests/services/export-service.test.ts tests/tools/export-tools.test.ts tests/smoke/milestone-7-8.test.ts`
- [ ] 跑 `npm run typecheck`

### Task 5: 完成最小交付验证

**Files:**
- Modify: `tests/smoke/milestone-7-8.test.ts`

- [ ] 固定 1 组样例输入，完整覆盖：
  - create
  - append_input
  - clarify
  - generate
  - revise
  - confirm
  - export
- [ ] 断言导出目录存在以下文件：
  - `artifact-manifest.json`
  - `design-ast.json`
  - `compiled.html`
  - `compiled.css`
  - `annotation-manifest.json`
  - `binding.schema.json`
- [ ] 跑全量 `npm test`
- [ ] 跑 `npm run typecheck`
- [ ] 跑 `npm run build`

## 自检结论

本计划只覆盖 `v0` 最小交付所需能力：

- `design.design.confirm`
- `design.export.package`
- 最小静态交付包
- 1 组固定样例回归

明确不覆盖：

- screenshot 导出
- 富样式或设计高保真还原
- preview/export 编译管线统一重构
- 多组回归样例扩展
