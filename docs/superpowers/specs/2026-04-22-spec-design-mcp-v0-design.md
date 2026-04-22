# Spec Design MCP V0 设计说明

## 1. 范围

本文档定义 `Spec Design MCP` 的 `v0` 实现设计。

`v0` 的范围刻意收敛，只做一个可用的最小闭环：

- 仅支持单页 `Landing Page`
- 输入支持 `text` 和 `url`
- 输出为受限的 `DesignDOMAST`
- 预览与导出都必须由同一份 AST 派生
- 修订由自然语言驱动，并且必须显式版本化
- 所有本地产物最终由 `artifact-manifest.json` 索引

`v0` 明确不做：

- 图片主链路输入
- 多页面站点编排
- 平台级资源治理
- 签名 URL、TTL 清理、对象存储
- 面向人的可视化编辑器

## 2. 目标

`v0` 必须先为外部 AI Agent 提供一条稳定的端到端链路：

1. 创建设计会话
2. 追加需求输入
3. 在信息不足时给出结构化澄清问题
4. 生成首版 AST
5. 产出可供人类查看的预览
6. 根据自然语言反馈进行修订
7. 确认某个设计版本
8. 导出面向开发消费的交付包

`v0` 的第一优先级是契约稳定，不是能力广度。

## 3. 选定方案

本项目 `v0` 采用“契约优先的分层单体”方案，在单一 `TypeScript` 代码库内完成实现。

选择该方案的原因：

- 当前仓库仍处于零代码起点，单体分层更适合快速建立稳定基线
- 可以先保证本地可跑，不需要过早引入多包或平台级复杂度
- 能保留清晰的服务边界，同时避免过度抽象
- 适合按里程碑顺序逐步推进，从 `schema` 一直到导出产物

已考虑但不采用的方案：

- 强领域拆包方案：长期边界更干净，但对 `v0` 来说过重
- 脚本式快速原型方案：初期会更快，但后续极易出现契约漂移和返工

## 4. 架构设计

建议的项目结构如下：

```text
src/
  index.ts
  schemas/
  tools/
  services/
    conversation/
    ast/
    preview/
    export/
  storage/
    sqlite/
    files/
  providers/
    llm/
    parser/
  lib/
  types/
.runtime/
  sessions/
  artifacts/
  exports/
```

模块职责边界如下：

- `schemas`
  - 唯一契约源
  - 定义 tool 输入输出、AST、manifest、error schema
- `tools`
  - 仅负责 MCP tool handler
  - 参数校验、调用 service、返回结构化结果
- `services/conversation`
  - 主协调层
  - 负责 clarify、generate、revise、confirm、export 的流程编排
- `services/ast`
  - AST 校验
  - 设计版本化
  - diff 生成
- `services/preview`
  - AST 到本地预览产物的编译
- `services/export`
  - AST 到交付包产物的编译
- `storage/sqlite`
  - 保存结构化元数据
- `storage/files`
  - 落盘预览文件和导出文件
- `providers/llm`
  - 定义 provider 接口
  - 提供默认 `mock/rule-based` 实现
- `providers/parser`
  - 负责 `text` 与基础 `url` 输入解析

架构约束：

- 不允许在 `schemas` 外重复定义核心契约类型
- `preview` 和 `export` 只能依赖显式输入，不能偷读隐式状态
- 业务规则不能下沉到 `storage` 或 `tools`
- `v0` 保持单进程、同步优先

## 5. 核心数据模型

### 5.1 Session

`Session` 最少包含以下字段：

- `sessionId`
- `projectName`
- `goal`
- `status`
- `createdAt`
- `updatedAt`
- `confirmedVersion`

允许的 `status`：

- `created`
- `collecting_inputs`
- `clarifying`
- `draft_ready`
- `confirmed`
- `exported`
- `failed`

### 5.2 InputItem

`design.session.append_input` 使用判别联合类型：

- `type: "text"` 时包含 `text`
- `type: "url"` 时包含 `url`

`url` 从现在起进入正式 `v0` 契约，但首版实现允许基础提取能力有限，并在失败时做明确降级。

### 5.3 DesignVersion

`DesignVersion` 最少包含以下字段：

- `sessionId`
- `designVersion`
- `baseVersion`
- `sourceType`
- `designAst`
- `sectionSummary`
- `diffSummary`
- `nodeDiffs`
- `previewRef`
- `createdAt`

规则：

- 首版生成的设计版本从 `v1` 开始
- 每次 generate 或 revise 都必须创建新版本记录
- 历史版本不可覆盖

### 5.4 ArtifactRecord

`ArtifactRecord` 最少包含以下字段：

- `artifactId`
- `sessionId`
- `designVersion`
- `artifactType`
- `filePath`
- `createdAt`

## 6. MCP Tool 契约

`v0` 固定暴露以下 7 个工具：

1. `design.session.create`
2. `design.session.append_input`
3. `design.intent.clarify`
4. `design.design.generate`
5. `design.design.revise`
6. `design.design.confirm`
7. `design.export.package`

必须在契约层固定以下约束：

- `design.design.revise` 必须显式传入 `baseVersion`
- `design.design.confirm` 必须引用一个存在的 `designVersion`
- `design.export.package` 只能导出已确认版本

## 7. 生成、修订与导出流程

### 7.1 Clarify

`design.intent.clarify` 读取会话的全部输入，并返回：

- `isReady`
- `missingFields[]`
- `questions[]`
- `interimIntentModel`

默认先使用本地 `mock/rule-based` provider，并通过 `LLM adapter` 接口隔离。这样可以先把 MCP 契约、AST、预览和导出链路稳定下来，再考虑接入真实模型服务。

### 7.2 Generate

只有在意图信息满足要求时，`design.design.generate` 才允许执行。

主流程：

1. 将累计输入解析成意图模型
2. 生成受限的 `DesignDOMAST v0`
3. 使用 schema 校验 AST
4. 生成 `sectionSummary[]`
5. 生成预览产物
6. 持久化新的 `DesignVersion`

### 7.3 Revise

`design.design.revise` 输入包含：

- `sessionId`
- `baseVersion`
- `revisionInstruction`

主流程：

1. 检查 `baseVersion` 是否为当前最新草稿版本
2. 在受限规则下对 AST 进行修订
3. 重新校验 AST
4. 生成 `diffSummary[]` 与 `nodeDiffs[]`
5. 重新生成预览产物
6. 落盘新的不可变版本记录

首版修订能力必须刻意收敛，只支持以下几类：

- 文案调整
- 区块增删
- 区块顺序调整
- CTA 调整
- 基础样式和配色调整

### 7.4 Confirm

`design.design.confirm` 只负责将某个已存在的版本标记为确认版本，并更新会话状态。

确认后的版本视为导出基线，不允许原地修改。如果后续还要变更，必须在最新草稿基础上继续修订，再重新确认。

### 7.5 Export

`design.export.package` 只能针对已确认版本执行。

交付包最少包含：

- `artifact-manifest.json`
- `design-ast.json`
- `compiled.html`
- `compiled.css`
- `annotation-manifest.json`
- `binding.schema.json`

其中 `artifact-manifest.json` 是唯一交付入口。

## 8. 版本控制规则

以下写操作必须带显式版本前置条件：

- `design.design.revise`
- `design.design.confirm`
- `design.export.package`

冲突规则：

- 修订时若 `baseVersion` 不是最新草稿版本，返回 `VERSION_CONFLICT`
- 版本不存在时返回 `VERSION_NOT_FOUND`
- 试图导出未确认版本时返回 `VERSION_NOT_CONFIRMED`

确认版本被冻结为导出基线。后续修改只能产生新草稿版本，不能覆盖确认版本本身。

## 9. AST 与产物规则

### 9.1 AST

`v0` AST 必须持续保持收敛：

- 节点类型有限
- 布局模式有限
- 样式字段有限
- 禁止任意 style key
- 禁止绝对定位

这是为了保证生成端和编译端规则一致，不把复杂度转移到后续渲染和导出阶段。

### 9.2 Preview

预览产物最少包含：

- `preview.html`
- `section-summary.json`
- 可选 `preview.png`

生成方式：

1. 将 AST 编译成简化 HTML
2. 注入基础 CSS
3. 输出本地预览文件
4. 若启用 Playwright，则生成截图

人类查看入口要求：

- `v0` 必须始终返回一个本地文件路径，或一个可直接打开的静态预览目录路径

### 9.3 Export

交付包中的 `artifact-manifest.json` 最少包含：

- `sessionId`
- `designVersion`
- `generatedAt`
- `artifacts[]`

对齐规则：

- 每个可标注节点在 HTML 中必须保留 `data-node-id`
- `annotation-manifest.json` 必须复用同一组 `nodeId`
- 下游 Agent 不允许依赖 DOM 顺序去猜测结构关系

## 10. 持久化策略

已确认的 `v0` 持久化方案：

- `SQLite` 保存元数据
- 本地文件系统保存预览与导出产物

`SQLite` 保存：

- `sessions`
- `design_versions`
- `artifacts`

文件系统保存：

- preview 相关文件
- export 相关文件
- 其他生成产物

建议的运行目录：

```text
.runtime/
  sessions/
  artifacts/
  exports/
```

该方案实现门槛低，查询和版本检查都比纯 JSON 更稳定，也不需要额外平台基础设施。

## 11. 错误模型

所有 MCP tools 都应返回统一错误结构，最少包含：

- `code`
- `message`
- `details`
- `retryable`

`v0` 最少定义以下错误码：

- `INPUT_INVALID`
- `CLARIFICATION_REQUIRED`
- `GENERATION_FAILED`
- `AST_INVALID`
- `VERSION_CONFLICT`
- `VERSION_NOT_FOUND`
- `VERSION_NOT_CONFIRMED`
- `PREVIEW_FAILED`
- `EXPORT_FAILED`

错误处理规则：

- 业务前置条件不满足时，必须返回明确的契约错误
- 不允许把“需要补充信息”和“系统内部异常”混成同一类失败
- 外部 Agent 必须能够基于错误码区分“应补输入”“可重试”“应终止”

## 12. 测试策略

`v0` 测试建议分 4 层：

- `schema tests`
  - 验证所有 Zod 契约、AST、manifest、tool I/O
- `service tests`
  - 验证 session、clarify、generate、revise、confirm、export 的主流程规则
- `artifact tests`
  - 验证 preview 和 export 产物的完整性与一致性
- `smoke tests`
  - 验证从创建 session 到导出 package 的端到端链路

建议的样例分类：

- 极简 Landing Page
- 标准 SaaS Landing Page
- 内容较多的营销页

必须重点验证：

- AST schema 是否合法
- AST 到 preview 是否一致
- AST 到 export 是否一致
- 版本链是否不可变
- confirm / export 的前置校验是否生效
- manifest 是否完整且可读

## 13. 里程碑实施顺序

实现必须按以下顺序推进：

1. 契约层：`schema`、tool types、error codes
2. 会话与存储
3. clarify 与 `interimIntentModel`
4. 首版 AST 生成
5. 预览生成
6. 自然语言修订
7. confirm 与 export
8. 回归样例与冒烟验证

只有满足以下条件，才进入下一里程碑：

- 当前契约已定型
- 当前主链路可跑
- 至少有 1 个样例通过验证

## 14. 文档与代码约定

从当前版本开始，项目约定如下：

- 需要留存的设计、规划、评审、说明类文档默认使用中文
- 代码内的标识符、schema 字段名、错误码、工具名、文件名继续使用英文
- 代码实现中应补充必要的中文注释，避免后续维护者只能通过实现细节猜测意图
- 对外暴露的核心模块、公共函数、重要类型和关键流程方法，应补充中文 `JSDoc`

注释约束：

- 注释只解释“为什么这样做”或“不直观的边界条件”
- 不添加低价值注释，不重复代码表面含义
- `JSDoc` 重点覆盖输入、输出、前置条件、副作用和错误语义

## 15. 当前立即执行建议

下一轮实现只做 `Milestone 1`，不顺带实现业务流程：

- Zod schemas
- tool 输入输出契约
- AST `v0` schema
- artifact 与 manifest schema
- error code 定义

暂不在同一轮中实现 session workflow、真实生成逻辑或导出逻辑。

原因很明确：后续所有里程碑都依赖稳定契约，如果首轮先把 schema 和协议定稳，后续实现会明显更可控。
