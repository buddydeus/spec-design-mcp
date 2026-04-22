# Spec Design MCP V0 Milestone 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为已生成设计增加自然语言修订链路，基于 `baseVersion` 生成新草稿版本，输出 `diffSummary`、`nodeDiffs` 和新的 preview 产物。

**Architecture:** 保持当前 `generate -> AST -> preview -> version persistence` 主链路不变，在其旁边新增 `revise service` 编排。`revise service` 只允许在“当前最新版本”基础上修订，并复用 AST schema、section summary、preview service 与 design version repository，确保新旧版本都不可变保存。

**Tech Stack:** Node.js, TypeScript, Vitest, Zod, node:sqlite

---

## 文件结构规划

- `src/services/ast/ast-reviser.ts`
  - 负责将受限自然语言修订指令应用到现有 AST
- `src/services/ast/ast-diff.ts`
  - 负责生成 `diffSummary` 与 `nodeDiffs`
- `src/services/conversation/revise-service.ts`
  - 负责版本冲突校验、版本号递增、preview 重生成与新版本持久化
- `src/tools/revise-tools.ts`
  - 对外提供 `design.design.revise` handler
- `src/index.ts`
  - 导出 revise tool
- `tests/services/revise-service.test.ts`
  - revise service 主路径、版本冲突与预览更新测试
- `tests/tools/revise-tools.test.ts`
  - revise tool 参数和返回结构测试
- `tests/smoke/milestone-6.test.ts`
  - 从 create -> append -> generate -> revise 的端到端冒烟测试

## 任务顺序

### Task 1: 先用失败测试锁定 revise service 的核心行为

**Files:**
- Create: `tests/services/revise-service.test.ts`
- Modify: `src/storage/design-version-repository.ts`
- Modify: `src/services/conversation/generate-service.ts`

- [ ] 写失败测试，覆盖以下行为：
  - `v1` 基础上修订生成 `v2`
  - `baseVersion` 不是最新版本时抛出 `VERSION_CONFLICT`
  - 修订后返回新的 `previewRef`
- [ ] 运行 `npm test -- tests/services/revise-service.test.ts`
- [ ] 确认测试因为 revise 能力缺失而失败，而不是因为测试本身写错

### Task 2: 实现 AST 修订与差异摘要

**Files:**
- Create: `src/services/ast/ast-reviser.ts`
- Create: `src/services/ast/ast-diff.ts`
- Create: `src/services/conversation/revise-service.ts`

- [ ] 用最小规则实现首版修订：
  - 文案调整
  - 区块新增
  - 区块删除
  - 区块顺序调整
  - CTA 文案与基础配色调整
- [ ] 为修订结果重新生成 `sectionSummary`
- [ ] 生成可稳定断言的 `diffSummary` 和 `nodeDiffs`
- [ ] 回跑 `npm test -- tests/services/revise-service.test.ts`
- [ ] 跑 `npm run typecheck`

### Task 3: 接入 tool 导出与端到端 smoke

**Files:**
- Create: `src/tools/revise-tools.ts`
- Modify: `src/index.ts`
- Create: `tests/tools/revise-tools.test.ts`
- Create: `tests/smoke/milestone-6.test.ts`

- [ ] 先写失败测试，验证 `reviseDesignTool` 返回契约字段和 preview 文件
- [ ] 运行相关测试，确认失败
- [ ] 完成 tool 接线与统一导出
- [ ] 跑 `npm test -- tests/tools/revise-tools.test.ts tests/smoke/milestone-6.test.ts`
- [ ] 跑全量 `npm test`
- [ ] 跑 `npm run typecheck`
- [ ] 跑 `npm run build`

## 自检结论

本计划只覆盖 `Milestone 6`：

- `design.design.revise`
- `diffSummary`
- `nodeDiffs`
- 新版本 preview 重生成
- 基于最新草稿的版本冲突校验

明确不覆盖：

- 已确认版本的冻结规则
- 导出交付包
- 图片截图或视觉级 diff
