# Spec Design MCP V0 Milestone 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为已生成的 AST 增加本地预览链路，产出 `preview.html` 和 `section-summary.json`，并让 `design.design.generate` 返回真实 preview 引用。

**Architecture:** 复用当前 AST 生成结果，不新增第二套视图模型。新增 preview renderer、preview service 和本地 artifact 写入能力，让 generate service 在保存版本后同时产出 preview 目录与文件索引。

**Tech Stack:** Node.js, TypeScript, Vitest, node:fs/promises

---

## 文件结构规划

- `src/storage/file-artifact-store.ts`
  - 统一写入 preview 目录和 JSON 文件
- `src/services/preview/html-renderer.ts`
  - AST -> 简化 HTML
- `src/services/preview/preview-service.ts`
  - 生成 `preview.html`、`section-summary.json`
- `src/services/conversation/generate-service.ts`
  - 接入 preview 生成和 artifact 引用
- `src/tools/generate-tools.ts`
  - 返回更新后的 preview 结果
- `src/index.ts`
  - 导出 preview 相关能力
- `tests/services/preview-service.test.ts`
  - preview 文件生成测试
- `tests/services/generate-service.test.ts`
  - generate 返回 preview 引用测试
- `tests/tools/generate-tools.test.ts`
  - generate tool 结果测试
- `tests/smoke/milestone-5.test.ts`
  - 从 create -> append -> generate -> preview 文件存在的端到端冒烟

## 任务顺序

### Task 1: 实现 preview 文件渲染与落盘

**Files:**
- Create: `src/storage/file-artifact-store.ts`
- Create: `src/services/preview/html-renderer.ts`
- Create: `src/services/preview/preview-service.ts`
- Create: `tests/services/preview-service.test.ts`

- [ ] 写失败测试，验证可从 AST 生成 `preview.html` 和 `section-summary.json`
- [ ] 运行测试，确认失败
- [ ] 实现 renderer、artifact store、preview service
- [ ] 回跑测试
- [ ] `npm run typecheck`
- [ ] 提交

### Task 2: 让 generate service 接入 preview

**Files:**
- Modify: `src/services/conversation/generate-service.ts`
- Modify: `tests/services/generate-service.test.ts`

- [ ] 扩展失败测试，验证 generate 返回真实 `previewRef` 和 `previewArtifacts`
- [ ] 运行测试，确认失败
- [ ] 实现 generate 与 preview 的编排
- [ ] 回跑测试
- [ ] `npm run typecheck`
- [ ] 提交

### Task 3: 更新 generate tool 与 smoke

**Files:**
- Modify: `src/tools/generate-tools.ts`
- Modify: `src/index.ts`
- Modify: `tests/tools/generate-tools.test.ts`
- Create: `tests/smoke/milestone-5.test.ts`

- [ ] 写失败测试，验证 tool 和端到端 smoke 可以看到 preview 文件
- [ ] 运行测试，确认失败
- [ ] 实现 tool 结果更新与导出
- [ ] 跑全量 `npm test && npm run typecheck && npm run build`
- [ ] 提交

## 自检结论

本计划只覆盖 `Milestone 5`：

- `preview.html`
- `section-summary.json`
- generate 返回真实 preview 引用

明确不覆盖：

- `preview.png`
- Playwright 截图
- revise / confirm / export
