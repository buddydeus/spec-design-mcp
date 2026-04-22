# Spec Design MCP V0 Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 `Spec Design MCP` 的契约层基线，完成 `schema`、tool 输入输出类型、AST v0、artifact/manifest 契约、错误码以及对应测试，不实现业务流程。

**Architecture:** 本轮只建设“契约优先”的底座：先完成 `TypeScript + Zod + Vitest` 工程骨架，再把所有外部可见协议统一收敛到 `src/schemas` 与 `src/lib/errors`。所有代码只做类型、校验与导出，不接入真实 MCP server 行为、会话存储或生成逻辑。

**Tech Stack:** Node.js, TypeScript, Zod, Vitest, npm

---

## 文件结构规划

本轮计划新增或修改的文件如下：

- `package.json`
  - 定义最小 Node/TypeScript 项目
  - 提供 `test`、`typecheck`、`build` 脚本
- `tsconfig.json`
  - 定义 TypeScript 编译选项
- `vitest.config.ts`
  - 定义测试运行配置
- `.gitignore`
  - 忽略 `node_modules`、`dist`、`.runtime` 等输出目录
- `src/index.ts`
  - 当前仅用于导出契约层公共入口
- `src/lib/errors/error-codes.ts`
  - 统一错误码枚举
- `src/lib/errors/error-schema.ts`
  - 统一错误返回 schema
- `src/schemas/common.ts`
  - 公共基础 schema，例如时间戳、ID、状态、URL
- `src/schemas/ast.ts`
  - `DesignDOMAST v0` 契约
- `src/schemas/artifacts.ts`
  - `preview`、`artifact-manifest.json`、`annotation-manifest.json`、`binding.schema.json` 契约
- `src/schemas/tools.ts`
  - 7 个 MCP tools 的输入输出 schema
- `src/schemas/index.ts`
  - `schemas` 聚合导出
- `tests/lib/errors/error-schema.test.ts`
  - 错误码与错误结构测试
- `tests/schemas/ast.test.ts`
  - AST schema 测试
- `tests/schemas/artifacts.test.ts`
  - artifact 与 manifest schema 测试
- `tests/schemas/tools.test.ts`
  - MCP tool schema 测试
- `tests/smoke/contracts.test.ts`
  - 契约层基础冒烟测试

边界约束：

- 不实现 `services/`、`storage/`、`providers/` 业务逻辑
- 不引入 SQLite、Playwright、MCP SDK
- 不在本轮落地 session 或 version 的持久化行为
- 所有公共导出都必须带中文 `JSDoc`
- 所有关键边界判断都用中文注释说明“为什么”

## 约定的目录骨架

在开始任务前，目标目录结构应为：

```text
src/
  index.ts
  lib/
    errors/
      error-codes.ts
      error-schema.ts
  schemas/
    common.ts
    ast.ts
    artifacts.ts
    tools.ts
    index.ts
tests/
  lib/
    errors/
      error-schema.test.ts
  schemas/
    ast.test.ts
    artifacts.test.ts
    tools.test.ts
  smoke/
    contracts.test.ts
```

### Task 1: 初始化 TypeScript 契约工程

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/index.ts`
- Test: `tests/smoke/contracts.test.ts`

- [ ] **Step 1: 写一个失败的冒烟测试，证明当前工程还没有契约入口**

```ts
import { describe, expect, it } from "vitest";

describe("contract entry", () => {
  it("exports a schema namespace", async () => {
    const entry = await import("../../src/index");

    expect(entry.schemas).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `npm test -- tests/smoke/contracts.test.ts`
Expected: FAIL，提示 `Cannot find module '../../src/index'` 或测试环境尚未初始化

- [ ] **Step 3: 写最小工程配置，让测试框架和 TS 编译可运行**

`package.json`

```json
{
  "name": "spec-design-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0",
    "zod": "^4.0.0"
  }
}
```

`tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": ".",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

`vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
```

`.gitignore`

```gitignore
node_modules
dist
.runtime
.DS_Store
coverage
```

`src/index.ts`

```ts
/**
 * 中文说明：
 * 当前入口只负责聚合导出契约层内容。
 * 业务实现会在后续里程碑补入，不在本轮引入。
 */
export const schemas = {};
```

- [ ] **Step 4: 运行测试，确认冒烟测试通过**

Run: `npm test -- tests/smoke/contracts.test.ts`
Expected: PASS，显示 `1 passed`

- [ ] **Step 5: 做一次基础类型检查**

Run: `npm run typecheck`
Expected: PASS，无 TypeScript 错误

- [ ] **Step 6: 提交初始化工程**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore src/index.ts tests/smoke/contracts.test.ts
git commit -m "chore: bootstrap contract schema workspace"
```

### Task 2: 建立统一错误码与错误返回契约

**Files:**
- Create: `src/lib/errors/error-codes.ts`
- Create: `src/lib/errors/error-schema.ts`
- Modify: `src/index.ts`
- Test: `tests/lib/errors/error-schema.test.ts`

- [ ] **Step 1: 写错误契约失败测试**

```ts
import { describe, expect, it } from "vitest";
import { errorResponseSchema, ErrorCode } from "../../../src/lib/errors/error-schema";

describe("error schema", () => {
  it("accepts VERSION_CONFLICT as a valid error code", () => {
    const result = errorResponseSchema.safeParse({
      code: ErrorCode.VERSION_CONFLICT,
      message: "baseVersion is stale",
      details: { expectedVersion: "v2" },
      retryable: false
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown error codes", () => {
    const result = errorResponseSchema.safeParse({
      code: "UNKNOWN",
      message: "bad code",
      details: null,
      retryable: false
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/lib/errors/error-schema.test.ts`
Expected: FAIL，提示找不到 `error-schema` 模块

- [ ] **Step 3: 实现错误码枚举与统一错误 schema**

`src/lib/errors/error-codes.ts`

```ts
/**
 * 中文说明：
 * 统一维护可由外部 Agent 识别的错误码。
 * 这些值属于稳定契约，新增或修改都要谨慎。
 */
export const errorCodes = [
  "INPUT_INVALID",
  "CLARIFICATION_REQUIRED",
  "GENERATION_FAILED",
  "AST_INVALID",
  "VERSION_CONFLICT",
  "VERSION_NOT_FOUND",
  "VERSION_NOT_CONFIRMED",
  "PREVIEW_FAILED",
  "EXPORT_FAILED"
] as const;

export type ErrorCode = (typeof errorCodes)[number];
```

`src/lib/errors/error-schema.ts`

```ts
import { z } from "zod";
import { errorCodes } from "./error-codes";

/**
 * 中文说明：
 * 所有 tool 失败返回统一结构。
 * details 使用宽松 JSON 值，避免本轮为不同工具提前过度建模。
 */
export const jsonValueSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema)
  ])
);

export const ErrorCode = z.enum(errorCodes);

export const errorResponseSchema = z.object({
  code: ErrorCode,
  message: z.string().min(1),
  details: jsonValueSchema.optional(),
  retryable: z.boolean()
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
```

`src/index.ts`

```ts
export * from "./lib/errors/error-codes";
export * from "./lib/errors/error-schema";
export const schemas = {};
```

- [ ] **Step 4: 运行测试，确认错误契约通过**

Run: `npm test -- tests/lib/errors/error-schema.test.ts`
Expected: PASS，显示 `2 passed`

- [ ] **Step 5: 运行类型检查，确认导出没有问题**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: 提交错误契约**

```bash
git add src/lib/errors/error-codes.ts src/lib/errors/error-schema.ts src/index.ts tests/lib/errors/error-schema.test.ts
git commit -m "feat: add shared error contract schemas"
```

### Task 3: 定义公共 schema 与 AST v0 契约

**Files:**
- Create: `src/schemas/common.ts`
- Create: `src/schemas/ast.ts`
- Modify: `src/index.ts`
- Test: `tests/schemas/ast.test.ts`

- [ ] **Step 1: 写 AST 契约失败测试**

```ts
import { describe, expect, it } from "vitest";
import { designAstSchema } from "../../src/schemas/ast";

describe("designAstSchema", () => {
  it("accepts a minimal page tree", () => {
    const result = designAstSchema.safeParse({
      version: "v1",
      root: {
        id: "node_page",
        kind: "page",
        name: "landing-page",
        tag: "main",
        text: null,
        props: {},
        style: {},
        layout: { mode: "block" },
        meta: {
          componentName: "LandingPage",
          editable: false,
          bindingKey: null,
          repeatSource: null
        },
        children: []
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported style keys", () => {
    const result = designAstSchema.safeParse({
      version: "v1",
      root: {
        id: "node_page",
        kind: "page",
        name: "landing-page",
        tag: "main",
        text: null,
        props: {},
        style: {
          position: "absolute"
        },
        layout: { mode: "block" },
        meta: {
          componentName: "LandingPage",
          editable: false,
          bindingKey: null,
          repeatSource: null
        },
        children: []
      }
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/schemas/ast.test.ts`
Expected: FAIL，提示找不到 `designAstSchema`

- [ ] **Step 3: 实现公共 schema 和 AST v0**

`src/schemas/common.ts`

```ts
import { z } from "zod";

/** 中文说明：统一复用的基础标量契约。 */
export const isoDatetimeSchema = z.string().datetime({ offset: true });
export const sessionIdSchema = z.string().min(1).regex(/^session_[a-zA-Z0-9_-]+$/);
export const designVersionSchema = z.string().regex(/^v\d+$/);
export const nodeIdSchema = z.string().min(1).regex(/^node_[a-zA-Z0-9_-]+$/);
export const urlSchema = z.url();

export const sessionStatusSchema = z.enum([
  "created",
  "collecting_inputs",
  "clarifying",
  "draft_ready",
  "confirmed",
  "exported",
  "failed"
]);
```

`src/schemas/ast.ts`

```ts
import { z } from "zod";
import { nodeIdSchema } from "./common";

const nodeKindSchema = z.enum([
  "page",
  "section",
  "container",
  "heading",
  "paragraph",
  "button",
  "image",
  "list",
  "list_item",
  "link"
]);

const layoutModeSchema = z.enum(["block", "flex", "grid"]);

const styleSchema = z.object({
  width: z.string().optional(),
  maxWidth: z.string().optional(),
  minHeight: z.string().optional(),
  padding: z.string().optional(),
  margin: z.string().optional(),
  gap: z.number().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.union([z.string(), z.number()]).optional(),
  lineHeight: z.union([z.string(), z.number()]).optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  borderRadius: z.string().optional(),
  border: z.string().optional(),
  textAlign: z.enum(["left", "center", "right"]).optional()
}).strict();

const layoutSchema = z.object({
  mode: layoutModeSchema,
  direction: z.enum(["row", "column"]).optional(),
  gap: z.number().optional(),
  align: z.enum(["start", "center", "end", "stretch"]).optional(),
  justify: z.enum(["start", "center", "end", "between", "around"]).optional(),
  columns: z.number().int().positive().optional()
}).strict();

const metaSchema = z.object({
  componentName: z.string().min(1),
  editable: z.boolean(),
  bindingKey: z.string().min(1).nullable(),
  repeatSource: z.string().min(1).nullable()
}).strict();

export const designNodeSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    id: nodeIdSchema,
    kind: nodeKindSchema,
    name: z.string().min(1),
    tag: z.string().min(1),
    text: z.string().nullable(),
    props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
    style: styleSchema,
    layout: layoutSchema,
    meta: metaSchema,
    children: z.array(designNodeSchema)
  }).strict()
);

export const designAstSchema = z.object({
  version: z.literal("v1"),
  root: designNodeSchema
}).strict();
```

`src/index.ts`

```ts
export * from "./lib/errors/error-codes";
export * from "./lib/errors/error-schema";
export * from "./schemas/ast";
export * from "./schemas/common";

export const schemas = {
  name: "spec-design-mcp-contracts"
};
```

- [ ] **Step 4: 运行 AST 测试，确认 schema 行为符合预期**

Run: `npm test -- tests/schemas/ast.test.ts`
Expected: PASS，显示 `2 passed`

- [ ] **Step 5: 做一次全量类型检查**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: 提交 AST 契约**

```bash
git add src/schemas/common.ts src/schemas/ast.ts src/index.ts tests/schemas/ast.test.ts
git commit -m "feat: add design ast v0 schemas"
```

### Task 4: 定义 preview 与 delivery artifact 契约

**Files:**
- Create: `src/schemas/artifacts.ts`
- Modify: `src/index.ts`
- Test: `tests/schemas/artifacts.test.ts`

- [ ] **Step 1: 写 artifact 契约失败测试**

```ts
import { describe, expect, it } from "vitest";
import { artifactManifestSchema, annotationManifestSchema } from "../../src/schemas/artifacts";

describe("artifact schemas", () => {
  it("accepts a minimal artifact manifest", () => {
    const result = artifactManifestSchema.safeParse({
      sessionId: "session_demo",
      designVersion: "v1",
      generatedAt: "2026-04-22T00:00:00.000Z",
      artifacts: [
        {
          artifactType: "compiled.html",
          filePath: ".runtime/exports/session_demo/v1/compiled.html"
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("requires annotation node ids to match node_ prefix", () => {
    const result = annotationManifestSchema.safeParse([
      {
        nodeId: "hero",
        componentName: "HeroSection",
        bindingKey: null,
        repeatSource: null,
        editable: false
      }
    ]);

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/schemas/artifacts.test.ts`
Expected: FAIL，提示找不到 `artifacts` schema

- [ ] **Step 3: 实现 preview 与 delivery 契约**

`src/schemas/artifacts.ts`

```ts
import { z } from "zod";
import {
  designVersionSchema,
  isoDatetimeSchema,
  nodeIdSchema,
  sessionIdSchema
} from "./common";

const artifactItemSchema = z.object({
  artifactType: z.enum([
    "design-ast.json",
    "preview.html",
    "preview.png",
    "section-summary.json",
    "revision-diff.json",
    "node-diffs.json",
    "compiled.html",
    "compiled.css",
    "annotation-manifest.json",
    "binding.schema.json",
    "artifact-manifest.json"
  ]),
  filePath: z.string().min(1)
}).strict();

export const artifactManifestSchema = z.object({
  sessionId: sessionIdSchema,
  designVersion: designVersionSchema,
  generatedAt: isoDatetimeSchema,
  artifacts: z.array(artifactItemSchema).min(1)
}).strict();

export const annotationItemSchema = z.object({
  nodeId: nodeIdSchema,
  componentName: z.string().min(1),
  bindingKey: z.string().min(1).nullable(),
  repeatSource: z.string().min(1).nullable(),
  editable: z.boolean()
}).strict();

export const annotationManifestSchema = z.array(annotationItemSchema);

export const bindingFieldSchema = z.object({
  key: z.string().min(1),
  type: z.enum(["text", "image", "link", "list"])
}).strict();

export const bindingSchemaSchema = z.object({
  version: z.literal("v0"),
  fields: z.array(bindingFieldSchema)
}).strict();
```

`src/index.ts`

```ts
export * from "./lib/errors/error-codes";
export * from "./lib/errors/error-schema";
export * from "./schemas/ast";
export * from "./schemas/artifacts";
export * from "./schemas/common";

export const schemas = {
  name: "spec-design-mcp-contracts"
};
```

- [ ] **Step 4: 运行 artifact 测试，确认契约通过**

Run: `npm test -- tests/schemas/artifacts.test.ts`
Expected: PASS，显示 `2 passed`

- [ ] **Step 5: 跑一次类型检查**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: 提交 artifact 契约**

```bash
git add src/schemas/artifacts.ts src/index.ts tests/schemas/artifacts.test.ts
git commit -m "feat: add preview and delivery artifact schemas"
```

### Task 5: 定义 7 个 MCP tools 的输入输出 schema

**Files:**
- Create: `src/schemas/tools.ts`
- Create: `src/schemas/index.ts`
- Modify: `src/index.ts`
- Test: `tests/schemas/tools.test.ts`

- [ ] **Step 1: 写 tool 契约失败测试**

```ts
import { describe, expect, it } from "vitest";
import {
  appendInputParamsSchema,
  exportPackageParamsSchema,
  reviseDesignParamsSchema
} from "../../src/schemas/tools";

describe("tool schemas", () => {
  it("accepts text and url inputs in append_input", () => {
    const result = appendInputParamsSchema.safeParse({
      sessionId: "session_demo",
      inputs: [
        { type: "text", text: "Build a SaaS landing page" },
        { type: "url", url: "https://example.com" }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("requires baseVersion for revise", () => {
    const result = reviseDesignParamsSchema.safeParse({
      sessionId: "session_demo",
      revisionInstruction: "make the hero shorter"
    });

    expect(result.success).toBe(false);
  });

  it("accepts versioned export params", () => {
    const result = exportPackageParamsSchema.safeParse({
      sessionId: "session_demo",
      designVersion: "v1"
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- tests/schemas/tools.test.ts`
Expected: FAIL，提示找不到 tool schemas

- [ ] **Step 3: 实现 tool 输入输出契约**

`src/schemas/tools.ts`

```ts
import { z } from "zod";
import { errorResponseSchema } from "../lib/errors/error-schema";
import {
  designVersionSchema,
  isoDatetimeSchema,
  sessionIdSchema,
  sessionStatusSchema,
  urlSchema
} from "./common";
import { designAstSchema } from "./ast";
import { artifactManifestSchema } from "./artifacts";

const textInputSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1)
}).strict();

const urlInputSchema = z.object({
  type: z.literal("url"),
  url: urlSchema
}).strict();

export const inputItemSchema = z.discriminatedUnion("type", [
  textInputSchema,
  urlInputSchema
]);

export const createSessionParamsSchema = z.object({
  projectName: z.string().min(1),
  goal: z.string().min(1)
}).strict();

export const createSessionResultSchema = z.object({
  sessionId: sessionIdSchema,
  status: sessionStatusSchema
}).strict();

export const appendInputParamsSchema = z.object({
  sessionId: sessionIdSchema,
  inputs: z.array(inputItemSchema).min(1)
}).strict();

export const appendInputResultSchema = z.object({
  acceptedInputs: z.array(inputItemSchema),
  updatedStatus: sessionStatusSchema
}).strict();

export const clarifyIntentParamsSchema = z.object({
  sessionId: sessionIdSchema
}).strict();

export const clarifyIntentResultSchema = z.object({
  isReady: z.boolean(),
  missingFields: z.array(z.string()),
  questions: z.array(z.string()),
  interimIntentModel: z.record(z.string(), z.unknown())
}).strict();

export const generateDesignParamsSchema = z.object({
  sessionId: sessionIdSchema
}).strict();

export const generateDesignResultSchema = z.object({
  designVersion: designVersionSchema,
  designAst: designAstSchema,
  sectionSummary: z.array(z.string()),
  previewRef: z.string().min(1),
  previewArtifacts: z.array(z.string())
}).strict();

export const reviseDesignParamsSchema = z.object({
  sessionId: sessionIdSchema,
  baseVersion: designVersionSchema,
  revisionInstruction: z.string().min(1)
}).strict();

export const reviseDesignResultSchema = z.object({
  baseVersion: designVersionSchema,
  newVersion: designVersionSchema,
  designAst: designAstSchema,
  diffSummary: z.array(z.string()),
  nodeDiffs: z.array(z.record(z.string(), z.unknown())),
  previewRef: z.string().min(1),
  previewArtifacts: z.array(z.string())
}).strict();

export const confirmDesignParamsSchema = z.object({
  sessionId: sessionIdSchema,
  designVersion: designVersionSchema
}).strict();

export const confirmDesignResultSchema = z.object({
  confirmedVersion: designVersionSchema,
  status: sessionStatusSchema
}).strict();

export const exportPackageParamsSchema = z.object({
  sessionId: sessionIdSchema,
  designVersion: designVersionSchema
}).strict();

export const exportPackageResultSchema = z.object({
  deliveryPackageRef: z.string().min(1),
  artifactManifest: artifactManifestSchema,
  artifacts: z.array(z.string())
}).strict();

export const toolErrorResultSchema = errorResponseSchema.extend({
  occurredAt: isoDatetimeSchema.optional()
});
```

`src/schemas/index.ts`

```ts
export * from "./ast";
export * from "./artifacts";
export * from "./common";
export * from "./tools";
```

`src/index.ts`

```ts
export * from "./lib/errors/error-codes";
export * from "./lib/errors/error-schema";
export * from "./schemas";

export const schemas = {
  name: "spec-design-mcp-contracts"
};
```

- [ ] **Step 4: 运行 tool schema 测试**

Run: `npm test -- tests/schemas/tools.test.ts`
Expected: PASS，显示 `3 passed`

- [ ] **Step 5: 做一次全量类型检查**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: 提交 tool 契约**

```bash
git add src/schemas/tools.ts src/schemas/index.ts src/index.ts tests/schemas/tools.test.ts
git commit -m "feat: add mcp tool contract schemas"
```

### Task 6: 建立契约层回归与构建验证

**Files:**
- Modify: `tests/smoke/contracts.test.ts`
- Modify: `src/index.ts`
- Test: `tests/smoke/contracts.test.ts`

- [ ] **Step 1: 扩展契约冒烟测试，覆盖关键导出**

```ts
import { describe, expect, it } from "vitest";
import {
  artifactManifestSchema,
  createSessionParamsSchema,
  designAstSchema,
  errorResponseSchema,
  schemas
} from "../../src/index";

describe("contract entry", () => {
  it("exports the shared schema namespace marker", () => {
    expect(schemas.name).toBe("spec-design-mcp-contracts");
  });

  it("re-exports core schemas from the entrypoint", () => {
    expect(designAstSchema).toBeDefined();
    expect(createSessionParamsSchema).toBeDefined();
    expect(artifactManifestSchema).toBeDefined();
    expect(errorResponseSchema).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行冒烟测试，确认新增断言先失败或未完全通过**

Run: `npm test -- tests/smoke/contracts.test.ts`
Expected: 若导出不完整则 FAIL；若前面任务已完成但入口未聚合全量导出，也应 FAIL

- [ ] **Step 3: 补齐入口导出与中文 JSDoc**

`src/index.ts`

```ts
/**
 * 中文说明：
 * 这是当前仓库对外暴露的契约层统一入口。
 * 后续业务实现可以依赖这里聚合的稳定 schema，而不是跨目录直接取内部文件。
 */
export * from "./lib/errors/error-codes";
export * from "./lib/errors/error-schema";
export * from "./schemas";

/** 中文说明：用于冒烟验证和外部识别当前导出集合。 */
export const schemas = {
  name: "spec-design-mcp-contracts"
};
```

- [ ] **Step 4: 运行全量测试**

Run: `npm test`
Expected: PASS，所有测试通过

- [ ] **Step 5: 运行构建与类型检查**

Run: `npm run typecheck && npm run build`
Expected: PASS，生成 `dist/`

- [ ] **Step 6: 提交 Milestone 1 完成结果**

```bash
git add src tests package.json tsconfig.json vitest.config.ts .gitignore
git commit -m "feat: complete milestone 1 contract schemas"
```

## 自检结论

### Spec Coverage

本计划已覆盖 `Milestone 1` 需要的全部能力：

- Zod schemas：Task 2-5
- tool 输入输出契约：Task 5
- AST `v0` schema：Task 3
- artifact / manifest 契约：Task 4
- error code 定义：Task 2
- 测试与可编译验证：Task 1、Task 6

本计划刻意不覆盖以下后续能力，避免越界：

- session workflow
- clarify 逻辑实现
- AST 生成逻辑
- preview 生成逻辑
- export 生成逻辑

### Placeholder Scan

已检查本计划中没有出现 `TODO`、`TBD`、`implement later`、`write tests for above` 之类占位描述。每个任务都给出了明确文件、代码片段、运行命令和预期结果。

### Type Consistency

本计划统一使用以下命名，不在任务间漂移：

- `designAstSchema`
- `artifactManifestSchema`
- `errorResponseSchema`
- `createSessionParamsSchema`
- `appendInputParamsSchema`
- `reviseDesignParamsSchema`
- `exportPackageParamsSchema`

这些名称在后续实现中不得私自变更，否则会破坏计划中的测试与导出路径。
