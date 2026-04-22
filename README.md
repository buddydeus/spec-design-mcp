# Spec Design MCP

面向 AI Agent 的 `v0` 设计生成最小闭环实现。

当前版本重点不是设计能力上限，而是契约稳定和端到端可交付。项目已经支持从需求输入到最小交付包导出的完整链路，适合作为原型验证、集成联调和回归测试基线。

## 当前 `v0` 能力

- 创建设计会话
- 追加 `text` / `url` 输入
- rule-based clarify，返回缺失字段与问题
- 生成首版 `DesignDOMAST`
- 生成本地 preview
- 基于自然语言做 revise
- confirm 某个设计版本
- export 最小静态交付包

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
```

只跑最小交付回归：

```bash
npm test -- tests/smoke/milestone-7-8.test.ts
```

## 对外工具

当前 `v0` 暴露以下工具入口：

- `design.session.create`
- `design.session.append_input`
- `design.intent.clarify`
- `design.design.generate`
- `design.design.revise`
- `design.design.confirm`
- `design.export.package`

对应导出入口统一聚合在 `src/index.ts`。

## 最小流程

1. `createSessionTool`
2. `appendInputTool`
3. `clarifyIntentTool`
4. `generateDesignTool`
5. `reviseDesignTool`
6. `confirmDesignTool`
7. `exportPackageTool`

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

当前 `Milestone 7-8` smoke 已覆盖 `2` 组固定样例，用于证明 `v0` 最小交付闭环可在不同输入组合下稳定运行。

## 后续优化

- 增加更多固定样例
- 优化导出样式质量
- 接入真实 LLM provider
- 按 `.feats/mileston-7-8-C.md` 统一 preview/export 编译管线
