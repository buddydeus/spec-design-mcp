# spec-design-mcp — Agent Instructions

For humans: see [README.md](README.md).

## Project

面向 AI Agent 的 v0 设计生成 MCP Server：会话创建 → 输入追加 → intent clarify → 设计生成/修订 → 确认 → 导出最小静态交付包。

- **Stack:** Node.js 22+、TypeScript、Vitest、`@modelcontextprotocol/sdk`、`node:sqlite`
- **Transports:** stdio MCP（`src/server.ts`）与 stateless Streamable HTTP（`src/http-server.ts`）
- **Shape:** 单包仓库；MCP 工具注册在 `src/mcp/server.ts`，handler 聚合于 `src/index.ts`

## Environment

- **Node.js:** ≥22（`package.json` `engines`）
- **pnpm:** ≥10（`package.json` `engines`；**以 pnpm 为准**，README/CI 仍部分引用 npm）
- **Env vars:** 见 [`.env.example`](.env.example)；进程直接读取环境变量，无 dotenv 加载器
- **Runtime data:** 默认 `.runtime/`（SQLite + artifacts）；可用 `SPEC_DESIGN_MCP_RUNTIME_DIR` 指向仓库外路径
- **MVP 默认:** `SPEC_DESIGN_MCP_INTENT_PROVIDER=rule_based`；URL fetch 与外部 parser 默认关闭

## Commands

Run from repository root:

- `pnpm install` — 安装依赖
- `pnpm run build` — TypeScript 编译到 `dist/`（启动 MCP 前必需）
- `pnpm run typecheck` — `tsc --noEmit`，类型检查
- `pnpm test` — 运行全部 Vitest 测试（`fileParallelism: false`）
- `pnpm run test:watch` — Vitest watch 模式
- `pnpm test -- tests/smoke/milestone-7-8.test.ts` — 最小交付闭环 smoke
- `pnpm test -- tests/mcp/server.test.ts` — MCP 工具注册与结构化返回
- `pnpm test -- tests/mcp/http-server.test.ts` — Streamable HTTP transport
- `pnpm run dev` — 监听 `src/` 变化，自动 rebuild 并重启 HTTP MCP（默认 `http://127.0.0.1:3010/mcp`）
- `pnpm start` — 启动 stdio MCP（需先 build）
- `pnpm run start:http` — 启动 HTTP MCP（需先 build）
- `node examples/mvp-http-client.mjs` — 端到端 HTTP 联调 walkthrough（需 HTTP server 运行中）

## Structure

| Path | Role |
| ---- | ---- |
| `src/mcp/` | MCP server 工厂与 tool 注册 |
| `src/tools/` | 7 个 MCP tool handlers |
| `src/services/` | clarify/generate/revise/confirm/export、compiler、preview |
| `src/providers/` | Intent provider 与 URL parser |
| `src/schemas/` | Zod schema 与 AST 类型 |
| `src/storage/` | SQLite 与文件 artifact 存储 |
| `src/lib/` | runtime paths、错误模型 |
| `tests/` | Vitest 测试（services/tools/storage/providers/smoke/mcp） |
| `scripts/dev-http.mjs` | dev 模式 watch + rebuild |
| `examples/` | MVP HTTP 客户端示例 |
| `docs/` | walkthrough、release checklist、设计 spec/plan |
| `.runtime/` | 运行时 SQLite 与 preview/export 产物（gitignored） |

## Boundaries

### Always do

- 使用 `pnpm` 安装与运行脚本（非 README/CI 中的 `npm`）
- 改 `src/` 或 `tests/` 后按顺序验证：`pnpm run typecheck` → `pnpm test` → `pnpm run build`
- MCP 相关改动额外跑 `pnpm test -- tests/mcp/server.test.ts`
- 保持 MCP tool 名与契约一致：`design.session.create`、`design.session.append_input`、`design.intent.clarify`、`design.design.generate`、`design.design.revise`、`design.design.confirm`、`design.export.package`
- preview/export 共享编译核心（`src/services/compiler/`）；勿在 preview/export 各写一套 AST 规则
- 运行时数据写入 `.runtime/` 或 `SPEC_DESIGN_MCP_RUNTIME_DIR`，不提交到 git

### Ask first

- 新增依赖或修改 `pnpm-lock.yaml`
- 修改 `.github/workflows/` 或 CI 命令
- 默认启用 LLM provider、URL fetch 或外部 URL parser
- 将 HTTP 绑定到非 localhost 或移除 Bearer auth
- 删除、重命名或变更 MCP tool 输入/输出 schema

### Never do

- `git push --force` 到 `main` / `master`
- 提交 `.env`、API key、`.runtime/` 产物或 `node_modules`
- 修改用户 git config
- 未经确认对公网暴露 HTTP endpoint
- 在 AGENTS.md 或代码注释中粘贴完整外部文档（只链接 SSOT）

## Verification

After code changes:

1. `pnpm run typecheck`
2. `pnpm test`
3. `pnpm run build`
4. （可选）`pnpm run dev` 或 `node examples/mvp-http-client.mjs` 验证 HTTP 联调

## Known fixes

| Symptom | Fix |
| ------- | --- |
| `Cannot find module` / `dist/` 不存在 | 先 `pnpm run build` |
| README 写 `npm install` 但 engines 要求 pnpm | 用 `pnpm install` |
| 测试出现 `ExperimentalWarning: node:sqlite` | 当前阶段已知可接受 |
| HTTP MCP 连接失败 | 确认 server 已启动；默认 `http://127.0.0.1:3010/mcp`，见 `.env.example` |
| dev 修改后 server 未更新 | `pnpm run dev` 监听 `src/`；检查 tsc 是否报错 |
| 端口占用 | 调整 `SPEC_DESIGN_MCP_HTTP_PORT` 或释放 3010 |

## Document map

| Doc | Purpose |
| --- | ------- |
| [README.md](README.md) | 人类安装、能力边界、Intent Provider 配置 |
| [`.env.example`](.env.example) | 全部环境变量样例 |
| [docs/mvp-walkthrough.md](docs/mvp-walkthrough.md) | HTTP 客户端联调流程 |
| [docs/release-checklist.md](docs/release-checklist.md) | 发布/交付前检查 |
| [docs/superpowers/specs/2026-04-22-spec-design-mcp-v0-design.md](docs/superpowers/specs/2026-04-22-spec-design-mcp-v0-design.md) | v0 设计 spec（勿在此重复） |
| [.prd/PRD.md](.prd/PRD.md) | 产品需求 |
| [.prd/TSD.md](.prd/TSD.md) | 技术方案 |

## Done checklist

- [ ] `pnpm run typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm run build` 通过
- [ ] MCP tool 名与 schema 未无意破坏（如有改动，smoke/mcp 测试已更新）
- [ ] 未提交 `.runtime/`、`.env` 或密钥
