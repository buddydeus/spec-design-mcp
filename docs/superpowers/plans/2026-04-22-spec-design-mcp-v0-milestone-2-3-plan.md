# Spec Design MCP V0 Milestone 2-3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 `Milestone 2` 与 `Milestone 3` 的本地可跑基线，交付 `design.session.create`、`design.session.append_input`、`design.intent.clarify` 及其 SQLite/文件系统支撑实现。

**Architecture:** 在当前契约层之上新增最小运行时实现，保持“单体分层、同步优先”。元数据使用内置 `node:sqlite` 保存，运行时目录用本地文件系统维护；tool handler 先实现为可直接调用的 TypeScript 函数，后续再挂到 MCP SDK 上。

**Tech Stack:** Node.js, TypeScript, Zod, Vitest, node:sqlite, node:fs/promises

---

## 文件结构规划

本轮新增或修改的文件如下：

- `src/lib/runtime/ids.ts`
  - 统一生成 `sessionId` 和时间戳
- `src/lib/runtime/paths.ts`
  - 统一管理 `.runtime`、数据库文件、会话目录路径
- `src/lib/errors/tool-error.ts`
  - 统一封装运行时错误到 `errorResponseSchema` 兼容结构
- `src/storage/sqlite/database.ts`
  - 初始化 SQLite、建表、执行基础查询
- `src/storage/session-repository.ts`
  - 持久化和读取 session 数据
- `src/services/conversation/session-service.ts`
  - 实现 create / append input 主流程
- `src/providers/parser/url-parser.ts`
  - 对 `url` 输入做基础标准化和降级
- `src/services/conversation/clarify-service.ts`
  - 汇总输入、生成 `interimIntentModel`、给出 `questions`
- `src/tools/session-tools.ts`
  - `design.session.create`、`design.session.append_input`
- `src/tools/clarify-tools.ts`
  - `design.intent.clarify`
- `src/index.ts`
  - 补充运行时导出
- `tests/storage/session-repository.test.ts`
  - SQLite session 存取测试
- `tests/services/session-service.test.ts`
  - session create / append 流程测试
- `tests/services/clarify-service.test.ts`
  - clarify 流程测试
- `tests/tools/session-tools.test.ts`
  - tool handler 测试
- `tests/tools/clarify-tools.test.ts`
  - clarify tool handler 测试
- `tests/smoke/milestone-2-3.test.ts`
  - 从创建会话到澄清结果的端到端冒烟

## 任务顺序

### Task 1: 搭建运行时路径与 SQLite 基础设施

**Files:**
- Create: `src/lib/runtime/ids.ts`
- Create: `src/lib/runtime/paths.ts`
- Create: `src/storage/sqlite/database.ts`
- Test: `tests/storage/session-repository.test.ts`

- [ ] **Step 1: 先写失败测试，验证仓库尚不能初始化 session 数据库**

```ts
import { describe, expect, it } from "vitest";

import { createSessionRepository } from "../../src/storage/session-repository.js";

describe("session repository", () => {
  it("initializes sqlite storage under .runtime", async () => {
    const repository = await createSessionRepository();

    expect(repository).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/storage/session-repository.test.ts`
Expected: FAIL，提示缺少 `session-repository` 或数据库初始化能力

- [ ] **Step 3: 实现最小运行时路径与 SQLite 基础设施**

关键约束：

- 数据库路径固定在 `.runtime/sqlite/spec-design-mcp.db`
- 目录不存在时自动创建
- 统一提供 `getRuntimePaths()`，避免后续服务层自己拼路径
- SQLite 初始化时创建 `sessions` 表

- [ ] **Step 4: 回跑测试，确认数据库基础设施可用**

Run: `npm test -- tests/storage/session-repository.test.ts`
Expected: PASS

- [ ] **Step 5: 运行类型检查**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: 提交 SQLite 基础设施**

```bash
git add src/lib/runtime src/storage/sqlite tests/storage/session-repository.test.ts
git commit -m "feat: add runtime paths and sqlite bootstrap"
```

### Task 2: 实现 session repository 与 create / append 输入持久化

**Files:**
- Create: `src/storage/session-repository.ts`
- Test: `tests/storage/session-repository.test.ts`

- [ ] **Step 1: 扩展失败测试，验证 session 创建后可重新读取，append 后输入会累积**

```ts
import { describe, expect, it } from "vitest";

import { createSessionRepository } from "../../src/storage/session-repository.js";

describe("session repository", () => {
  it("persists a created session", async () => {
    const repository = await createSessionRepository();
    const session = await repository.createSession({
      sessionId: "session_test_create",
      projectName: "Spec MCP",
      goal: "Create landing page",
      status: "created"
    });

    const stored = await repository.getSession(session.sessionId);

    expect(stored?.projectName).toBe("Spec MCP");
    expect(stored?.inputs).toEqual([]);
  });

  it("appends inputs without overwriting earlier entries", async () => {
    const repository = await createSessionRepository();
    await repository.createSession({
      sessionId: "session_test_append",
      projectName: "Spec MCP",
      goal: "Collect inputs",
      status: "created"
    });

    await repository.appendInputs("session_test_append", [
      { type: "text", text: "First" },
      { type: "url", url: "https://example.com" }
    ]);

    const stored = await repository.getSession("session_test_append");

    expect(stored?.inputs).toHaveLength(2);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/storage/session-repository.test.ts`
Expected: FAIL，因为 repository 尚未支持 create / get / append

- [ ] **Step 3: 实现 session repository**

关键约束：

- `sessions` 表至少包含 `session_id`、`project_name`、`goal`、`status`、`confirmed_version`、`inputs_json`、`created_at`、`updated_at`
- `inputs_json` 使用 JSON 数组存储，避免本轮额外引入关联表复杂度
- repository 返回值使用现有 `inputItemSchema` 兼容结构

- [ ] **Step 4: 回跑测试**

Run: `npm test -- tests/storage/session-repository.test.ts`
Expected: PASS

- [ ] **Step 5: 提交 session repository**

```bash
git add src/storage/session-repository.ts tests/storage/session-repository.test.ts
git commit -m "feat: add session repository persistence"
```

### Task 3: 实现 session service

**Files:**
- Create: `src/services/conversation/session-service.ts`
- Test: `tests/services/session-service.test.ts`

- [ ] **Step 1: 先写失败测试，定义 create / append 的业务行为**

```ts
import { describe, expect, it } from "vitest";

import { createSessionService } from "../../src/services/conversation/session-service.js";

describe("session service", () => {
  it("creates a new session with created status", async () => {
    const service = await createSessionService();
    const result = await service.createSession({
      projectName: "Acme",
      goal: "Generate landing page"
    });

    expect(result.sessionId).toMatch(/^session_/);
    expect(result.status).toBe("created");
  });

  it("append_input stores accepted inputs and moves status to collecting_inputs", async () => {
    const service = await createSessionService();
    const session = await service.createSession({
      projectName: "Acme",
      goal: "Generate landing page"
    });

    const result = await service.appendInput({
      sessionId: session.sessionId,
      inputs: [{ type: "text", text: "Landing page for developers" }]
    });

    expect(result.acceptedInputs).toHaveLength(1);
    expect(result.updatedStatus).toBe("collecting_inputs");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/services/session-service.test.ts`
Expected: FAIL，提示缺少 service 或业务逻辑

- [ ] **Step 3: 实现 session service**

关键约束：

- `createSession()` 内部生成合法 `sessionId`
- `appendInput()` 必须校验 session 存在
- 首次追加输入后把状态切到 `collecting_inputs`
- 所有方法补中文 `JSDoc`

- [ ] **Step 4: 回跑 service 测试**

Run: `npm test -- tests/services/session-service.test.ts`
Expected: PASS

- [ ] **Step 5: 提交 session service**

```bash
git add src/services/conversation/session-service.ts tests/services/session-service.test.ts
git commit -m "feat: add session workflow service"
```

### Task 4: 实现 session tool handlers

**Files:**
- Create: `src/tools/session-tools.ts`
- Modify: `src/index.ts`
- Test: `tests/tools/session-tools.test.ts`

- [ ] **Step 1: 写失败测试，定义 tool handler 行为**

```ts
import { describe, expect, it } from "vitest";

import { createSessionTool, appendInputTool } from "../../src/tools/session-tools.js";

describe("session tools", () => {
  it("creates a session from validated params", async () => {
    const result = await createSessionTool({
      projectName: "Acme",
      goal: "Build landing page"
    });

    expect(result.status).toBe("created");
  });

  it("appends validated inputs", async () => {
    const session = await createSessionTool({
      projectName: "Acme",
      goal: "Build landing page"
    });

    const result = await appendInputTool({
      sessionId: session.sessionId,
      inputs: [{ type: "text", text: "Hero with CTA" }]
    });

    expect(result.updatedStatus).toBe("collecting_inputs");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/tools/session-tools.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 session tool handlers**

关键约束：

- 入参必须经过现有 tool schema 校验
- 返回值必须再次通过 result schema 校验
- 暂不引入 MCP SDK，仅实现可调用函数

- [ ] **Step 4: 回跑测试**

Run: `npm test -- tests/tools/session-tools.test.ts`
Expected: PASS

- [ ] **Step 5: 提交 session tools**

```bash
git add src/tools/session-tools.ts src/index.ts tests/tools/session-tools.test.ts
git commit -m "feat: add session tool handlers"
```

### Task 5: 实现 clarify service 与基础 URL 降级解析

**Files:**
- Create: `src/providers/parser/url-parser.ts`
- Create: `src/services/conversation/clarify-service.ts`
- Test: `tests/services/clarify-service.test.ts`

- [ ] **Step 1: 写失败测试，定义 clarify 的最小行为**

```ts
import { describe, expect, it } from "vitest";

import { createSessionService } from "../../src/services/conversation/session-service.js";
import { createClarifyService } from "../../src/services/conversation/clarify-service.js";

describe("clarify service", () => {
  it("returns questions when required intent fields are missing", async () => {
    const sessionService = await createSessionService();
    const clarifyService = await createClarifyService();
    const session = await sessionService.createSession({
      projectName: "Acme",
      goal: "Landing page"
    });

    await sessionService.appendInput({
      sessionId: session.sessionId,
      inputs: [{ type: "text", text: "Build a landing page" }]
    });

    const result = await clarifyService.clarify({ sessionId: session.sessionId });

    expect(result.isReady).toBe(false);
    expect(result.questions.length).toBeGreaterThan(0);
  });

  it("returns ready intent when key fields are present in text and url inputs", async () => {
    const sessionService = await createSessionService();
    const clarifyService = await createClarifyService();
    const session = await sessionService.createSession({
      projectName: "Acme",
      goal: "Landing page"
    });

    await sessionService.appendInput({
      sessionId: session.sessionId,
      inputs: [
        {
          type: "text",
          text: "Create a SaaS landing page for developers with a hero, features, pricing and primary CTA Start Free Trial"
        },
        {
          type: "url",
          url: "https://example.com/product"
        }
      ]
    });

    const result = await clarifyService.clarify({ sessionId: session.sessionId });

    expect(result.isReady).toBe(true);
    expect(result.missingFields).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/services/clarify-service.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 clarify service**

关键约束：

- 不接真实 LLM，只做 rule-based intent 提取
- 至少识别 `pageType`、`audience`、`sections`、`primaryCta`、`styleTone`
- `url` 解析只做基础 hostname/path 标准化和文本化，不发网络请求
- 当字段不足时返回结构化 `missingFields[]` 与 `questions[]`

- [ ] **Step 4: 回跑 clarify 测试**

Run: `npm test -- tests/services/clarify-service.test.ts`
Expected: PASS

- [ ] **Step 5: 提交 clarify service**

```bash
git add src/providers/parser/url-parser.ts src/services/conversation/clarify-service.ts tests/services/clarify-service.test.ts
git commit -m "feat: add clarify service and url parsing"
```

### Task 6: 实现 clarify tool handler 与端到端冒烟

**Files:**
- Create: `src/tools/clarify-tools.ts`
- Modify: `src/index.ts`
- Create: `tests/tools/clarify-tools.test.ts`
- Create: `tests/smoke/milestone-2-3.test.ts`

- [ ] **Step 1: 写失败测试，验证 clarify tool 与端到端链路**

```ts
import { describe, expect, it } from "vitest";

import {
  appendInputTool,
  clarifyIntentTool,
  createSessionTool
} from "../../src/index.js";

describe("milestone 2-3 smoke", () => {
  it("goes from session creation to structured clarify result", async () => {
    const session = await createSessionTool({
      projectName: "Acme",
      goal: "Build landing page"
    });

    await appendInputTool({
      sessionId: session.sessionId,
      inputs: [{ type: "text", text: "Landing page for developer tools" }]
    });

    const result = await clarifyIntentTool({
      sessionId: session.sessionId
    });

    expect(result).toHaveProperty("isReady");
    expect(result).toHaveProperty("questions");
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/tools/clarify-tools.test.ts tests/smoke/milestone-2-3.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 clarify tool handler 与入口导出**

关键约束：

- 统一复用现有 clarify input/output schema
- 保持 `src/index.ts` 为统一导出入口
- 不引入任何多余 feature

- [ ] **Step 4: 运行全量验证**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: 提交 Milestone 2-3**

```bash
git add src tests docs/superpowers/plans/2026-04-22-spec-design-mcp-v0-milestone-2-3-plan.md
git commit -m "feat: complete milestone 2 and 3 baseline"
```

## 自检结论

### Spec Coverage

本计划覆盖：

- `Milestone 2`：session create、append input、本地持久化
- `Milestone 3`：clarify、`interimIntentModel`
- 本地可跑验证：tool handler + smoke test

刻意不覆盖：

- AST 生成
- preview
- revise / confirm / export
- 真实 LLM provider

### Placeholder Scan

未使用 `TODO`、`TBD`、`implement later` 等占位语句，所有任务都有文件、命令和期望结果。

### Type Consistency

计划统一使用：

- `createSessionTool`
- `appendInputTool`
- `clarifyIntentTool`
- `createSessionService`
- `createClarifyService`
- `createSessionRepository`

实现时应保持这些命名一致，避免测试和导出漂移。
