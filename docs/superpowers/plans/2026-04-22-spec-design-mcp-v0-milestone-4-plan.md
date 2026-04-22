# Spec Design MCP V0 Milestone 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 `design.design.generate` 的首版本地链路，基于当前会话输入生成合法 `DesignDOMAST v0`、`sectionSummary[]` 与版本记录。

**Architecture:** 复用现有 `clarify` 的 `interimIntentModel` 作为生成输入，不新增第二套意图结构。新增 `design_versions` 存储、rule-based AST draft builder、generation service 与 generate tool handler，先保证“稳定合法、可验证”，不追求复杂设计表达能力。

**Tech Stack:** Node.js, TypeScript, Zod, Vitest, node:sqlite

---

## 文件结构规划

- `src/storage/sqlite/database.ts`
  - 增加 `design_versions` 表
- `src/storage/design-version-repository.ts`
  - 设计版本持久化与读取
- `src/services/ast/ast-builder.ts`
  - 基于 `interimIntentModel` 生成首版 AST
- `src/services/ast/section-summary.ts`
  - 从 AST 派生 `sectionSummary[]`
- `src/services/conversation/generate-service.ts`
  - 编排 clarify -> AST -> version persistence
- `src/tools/generate-tools.ts`
  - `design.design.generate`
- `src/index.ts`
  - 导出 generation 相关能力
- `tests/storage/design-version-repository.test.ts`
  - 版本持久化测试
- `tests/services/generate-service.test.ts`
  - generation 业务测试
- `tests/tools/generate-tools.test.ts`
  - generate tool 测试
- `tests/smoke/milestone-4.test.ts`
  - 从 create session 到 generate result 的端到端冒烟

## 任务顺序

### Task 1: 增加 design_versions 存储

**Files:**
- Modify: `src/storage/sqlite/database.ts`
- Create: `src/storage/design-version-repository.ts`
- Test: `tests/storage/design-version-repository.test.ts`

- [ ] 写失败测试，验证可写入并读回 `v1` 版本记录
- [ ] 运行测试，确认失败
- [ ] 实现 `design_versions` 表和 repository
- [ ] 回跑测试
- [ ] `npm run typecheck`
- [ ] 提交

### Task 2: 实现 AST draft builder

**Files:**
- Create: `src/services/ast/ast-builder.ts`
- Create: `src/services/ast/section-summary.ts`
- Test: `tests/services/generate-service.test.ts`

- [ ] 写失败测试，验证基于 ready intent 可生成合法 AST 与 section summary
- [ ] 运行测试，确认失败
- [ ] 实现最小 AST builder
- [ ] 回跑测试
- [ ] `npm run typecheck`
- [ ] 提交

### Task 3: 实现 generate service

**Files:**
- Create: `src/services/conversation/generate-service.ts`
- Test: `tests/services/generate-service.test.ts`

- [ ] 写失败测试，验证 `generate` 会校验 ready intent、持久化 `v1`、返回 `sectionSummary`
- [ ] 运行测试，确认失败
- [ ] 实现 generate service
- [ ] 回跑测试
- [ ] `npm run typecheck`
- [ ] 提交

### Task 4: 实现 generate tool 与 smoke

**Files:**
- Create: `src/tools/generate-tools.ts`
- Modify: `src/index.ts`
- Create: `tests/tools/generate-tools.test.ts`
- Create: `tests/smoke/milestone-4.test.ts`

- [ ] 写失败测试，验证 `design.design.generate` 和端到端 smoke
- [ ] 运行测试，确认失败
- [ ] 实现 generate tool handler 和统一导出
- [ ] 跑全量 `npm test && npm run typecheck && npm run build`
- [ ] 提交

## 自检结论

本计划只覆盖 `Milestone 4`：

- `design.design.generate`
- AST validator 复用现有 schema
- `sectionSummary`
- `v1` 版本持久化

明确不覆盖：

- preview 生成
- revise / confirm / export
- 真实 LLM provider
