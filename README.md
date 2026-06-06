# Spec Design MCP

面向 AI Agent 的 `v0` 设计生成最小闭环 MCP Server 实现。

当前版本重点不是设计能力上限，而是契约稳定和端到端可交付。项目已经支持从需求输入到最小交付包导出的完整链路，并可通过 stdio MCP Server 被本地 MCP 客户端拉起，适合作为原型验证、集成联调和回归测试基线。

## 当前 `v0` 能力

- 创建设计会话
- 追加 `text` / `url` 输入
- rule-based clarify，返回缺失字段与问题
- 生成首版 `DesignDOMAST`
- 生成本地 preview
- 基于自然语言做 revise
- confirm 某个设计版本
- export 最小静态交付包
- stdio MCP Server 入口
- 官方 MCP SDK tool 注册

## 当前 `v0` 不做

- 多页面站点编排
- 图片输入主链路
- 可视化编辑器
- 高保真设计还原
- screenshot 导出
- preview/export 统一编译管线重构

## 环境要求

- Node.js 22+
- npm

项目当前使用 `node:sqlite`，运行测试时会看到 `ExperimentalWarning`，这是当前阶段可接受的已知现象。

## 安装

```bash
npm install
```

## 常用命令

```bash
npm test
npm run typecheck
npm run build
npm start
```

只跑最小交付回归：

```bash
npm test -- tests/smoke/milestone-7-8.test.ts
```

只跑 MCP server 注册测试：

```bash
npm test -- tests/mcp/server.test.ts
```

## MCP Server

项目使用官方 `@modelcontextprotocol/sdk` 暴露 stdio MCP Server。构建后可直接启动：

```bash
npm run build
node dist/src/server.js
```

`package.json` 同时提供：

```bash
npm start
```

本地 MCP 客户端可按进程方式配置：

```json
{
  "mcpServers": {
    "spec-design-mcp": {
      "command": "node",
      "args": ["/Users/buddy/Project/buddydeus/spec-design-mcp/dist/src/server.js"],
      "cwd": "/Users/buddy/Project/buddydeus/spec-design-mcp"
    }
  }
}
```

若在其他目录使用，请把 `args[0]` 与 `cwd` 换成实际仓库路径。

## 对外工具

当前 `v0` 暴露以下 MCP tools：

- `design.session.create`
- `design.session.append_input`
- `design.intent.clarify`
- `design.design.generate`
- `design.design.revise`
- `design.design.confirm`
- `design.export.package`

对应本地 handler 与 schema 导出入口统一聚合在 `src/index.ts`。MCP 注册工厂位于 `src/mcp/server.ts`，stdio 启动入口位于 `src/server.ts`。

## 最小流程

1. `createSessionTool`
2. `appendInputTool`
3. `clarifyIntentTool`
4. `generateDesignTool`
5. `reviseDesignTool`
6. `confirmDesignTool`
7. `exportPackageTool`

通过 MCP 调用时对应工具名为：

1. `design.session.create`
2. `design.session.append_input`
3. `design.intent.clarify`
4. `design.design.generate`
5. `design.design.revise`
6. `design.design.confirm`
7. `design.export.package`

## 运行时目录

项目运行时数据默认落在 `.runtime/`：

- `.runtime/sqlite/`
  - SQLite 元数据
- `.runtime/artifacts/<sessionId>/<version>/`
  - preview 与 export 产物

其中 export 目录最少包含：

- `artifact-manifest.json`
- `design-ast.json`
- `compiled.html`
- `compiled.css`
- `annotation-manifest.json`
- `binding.schema.json`

`artifact-manifest.json` 是最小交付包的唯一入口。

## 测试结构

- `tests/services/`
  - service 级行为测试
- `tests/tools/`
  - tool handler 输入输出测试
- `tests/storage/`
  - SQLite / 文件落盘相关测试
- `tests/smoke/`
  - 里程碑级端到端 smoke
- `tests/mcp/`
  - MCP server 注册与结构化返回测试

当前 `Milestone 7-8` smoke 已覆盖 `2` 组固定样例，用于证明 `v0` 最小交付闭环可在不同输入组合下稳定运行。MCP server 测试覆盖 7 个工具注册与结构化 tool result 包装。

## 后续优化

- 增加更多固定样例
- 优化导出样式质量
- 接入真实 LLM provider
- 按 `.feats/mileston-7-8-C.md` 统一 preview/export 编译管线
