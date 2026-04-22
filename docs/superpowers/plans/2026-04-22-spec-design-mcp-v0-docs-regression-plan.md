# Spec Design MCP V0 Docs And Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将最小交付回归样例扩到 2 组，并补齐 `src/` 公共导出的中文 `JSDoc`、必要代码注释和一份面向使用者的 `README.md`。

**Architecture:** 不改变既有业务边界，只增强验证覆盖和文档可读性。回归扩展集中在 `Milestone 7-8` smoke；文档增强集中在 `src/` 的公共导出和仓库根目录 `README.md`，测试文件只补文件级说明和少量关键注释，避免噪音。

**Tech Stack:** Node.js, TypeScript, Vitest, Markdown

---

## 文件结构规划

- `tests/smoke/milestone-7-8.test.ts`
  - 增加第 2 组固定样例，覆盖另一条完整交付路径
- `src/**/*.ts`
  - 为公共导出补中文 `JSDoc`
  - 为复杂逻辑补必要的简洁注释
- `tests/**/*.test.ts`
  - 只补文件级说明和关键注释
- `README.md`
  - 新增项目说明、快速开始、工具流程、产物说明、测试命令

## 任务顺序

### Task 1: 先用失败测试把回归覆盖扩到 2 组

**Files:**
- Modify: `tests/smoke/milestone-7-8.test.ts`

- [ ] 新增第 2 组完整样例，要求覆盖：
  - 不同 audience
  - 不同 revise 指令组合
  - confirm/export 全链路
- [ ] 运行 `npm test -- tests/smoke/milestone-7-8.test.ts`
- [ ] 确认新增样例先失败，再根据真实失败原因修正测试或实现

### Task 2: 补齐 `src/` 公共导出说明

**Files:**
- Modify: `src/index.ts`
- Modify: `src/lib/**/*.ts`
- Modify: `src/providers/**/*.ts`
- Modify: `src/schemas/**/*.ts`
- Modify: `src/services/**/*.ts`
- Modify: `src/storage/**/*.ts`
- Modify: `src/tools/**/*.ts`

- [ ] 为公共 `interface`、`type`、工厂函数、对外工具函数补中文 `JSDoc`
- [ ] 为复杂实现补必要的行内注释
- [ ] 保持英文标识不变，不修改外部契约字段
- [ ] 运行 `npm run typecheck`

### Task 3: 补 README 与测试说明

**Files:**
- Create: `README.md`
- Modify: `tests/**/*.test.ts`

- [ ] 新增 `README.md`，至少包含：
  - 项目定位
  - 当前 `v0` 能力边界
  - 安装与运行
  - 主要工具流程
  - 产物目录说明
  - 测试命令
- [ ] 为测试文件补文件级说明和必要关键注释
- [ ] 运行 `npm test`
- [ ] 运行 `npm run typecheck`
- [ ] 运行 `npm run build`

## 自检结论

本计划只覆盖：

- 2 组固定回归样例
- `src/` 公共导出说明增强
- `README.md`
- 测试文件的最小说明增强

明确不覆盖：

- 业务逻辑新增
- preview/export 编译管线重构
- 更多样例扩展到 3 组以上
- 视觉风格或导出质量优化
