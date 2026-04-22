# Milestone 7-8 优化预案：方案 C

更新时间：2026-04-22
适用阶段：`Milestone 7` 与 `Milestone 8` 完成之后
当前建议状态：暂不实施，作为后续优化方向保留

## 目标

方案 C 的目标不是补功能，而是统一当前已经分开的 `preview` 与 `export` 编译链路，使二者共享一套稳定的 AST 编译核心，减少重复逻辑、降低后续演进成本，并为更高保真的交付格式做准备。

换句话说：

- `Milestone 7` 先用最小静态交付方案完成 `v0`
- `方案 C` 用于 `v0+` 阶段清理结构和提升一致性

## 为什么后续值得做

当前按 `方案 A` 落地后，系统会存在两条相邻但不完全相同的派生链路：

1. `preview`
   - AST -> `preview.html`
   - 偏向“人类快速查看”

2. `export`
   - AST -> `compiled.html` / `compiled.css` / manifest
   - 偏向“开发消费与交付”

这在 `v0` 是合理的，因为能最快闭环；但继续演进时会逐步出现这些问题：

- 相同节点的 HTML 结构在 preview/export 中可能产生漂移
- 样式规则会开始重复维护
- `data-node-id`、annotation、binding 的一致性校验会分散
- 后续如果要补 screenshot、design review、diff preview，会出现第三套派生逻辑

方案 C 的价值就在于：

- 让 preview/export 共用一套“结构编译核心”
- 保证节点输出、属性注入、样式映射的一致性
- 把差异限制在“输出模式”，而不是“整套实现”

## 核心思路

### 1. 引入统一编译管线

新增一个共享的 compile pipeline，而不是让 `preview` 与 `export` 分别各自产生 HTML：

- 输入：`DesignDOMAST`
- 中间结果：`CompiledDocument`
- 输出：
  - preview mode
  - export mode

建议结构：

```text
src/services/compiler/
  ast-compiler.ts
  html-fragment-renderer.ts
  css-emitter.ts
  annotation-builder.ts
  binding-builder.ts
  document-types.ts
```

其中：

- `ast-compiler.ts`
  - 负责 AST -> `CompiledDocument`
- `html-fragment-renderer.ts`
  - 负责把统一文档结构渲染成 HTML
- `css-emitter.ts`
  - 负责生成基础 CSS
- `annotation-builder.ts`
  - 负责节点标注索引
- `binding-builder.ts`
  - 负责绑定字段清单

### 2. 把 preview/export 的差异收敛为“模式”

未来不要再让 preview/export 各自理解 AST，而应改为：

- preview service:
  - 调 compiler
  - 以 `preview` mode 渲染
  - 输出 `preview.html`

- export service:
  - 调 compiler
  - 以 `export` mode 渲染
  - 输出 `compiled.html`、`compiled.css`、manifests

建议模式差异只保留在这些地方：

- 页面 title
- 包裹壳层和调试辅助信息
- preview 是否附带更宽松的默认视觉样式
- export 是否输出完整交付物索引

不应该保留差异的地方：

- 节点层级
- `data-node-id`
- section/container/button 等标签映射
- 基础结构顺序

## 推荐数据结构

建议未来增加统一中间结构：

```ts
interface CompiledDocument {
  htmlTree: CompiledNode;
  styles: string[];
  annotations: AnnotationItem[];
  bindings: BindingField[];
}
```

`CompiledNode` 最少包含：

- `nodeId`
- `tag`
- `attributes`
- `text`
- `children`

这样后续 preview/export/diff/screenshot 都可以共享同一个结构源。

## 预期改造顺序

如果未来要实施方案 C，建议按以下顺序，不要一次性全翻：

### 第一步：抽公共 HTML 节点渲染

先把 preview/export 都会用到的节点渲染抽出来，但暂时不改现有调用入口。

目标：

- 不改变现有外部行为
- 先减少重复代码

### 第二步：引入统一 `CompiledDocument`

把 AST 编译结果收敛为统一中间结构，再让 preview/export 分别消费它。

目标：

- 把结构规则与文件输出规则拆开

### 第三步：让 annotation/binding 从统一编译结果派生

目标：

- 消除 export 中的重复遍历
- 保证 nodeId 与 manifest 完全一致

### 第四步：让 preview/export 共用同一套 smoke 基线

目标：

- 一个样例即可同时断言 preview/export 的结构一致性

## 预期收益

如果方案 C 落地，未来会得到这些好处：

- preview 与 export 的结构一致性明显提高
- 新增导出格式时只扩展输出器，不必重写 AST 遍历
- `annotation-manifest` 与 `binding.schema` 的生成更稳定
- 后续加入视觉 diff、截图、审阅页时可以复用同一编译核心
- 测试可以从“多链路分别断言”逐步收敛为“统一编译结果 + 各输出模式断言”

## 当前不建议立即实施的原因

现在不应该直接做方案 C，原因很明确：

- `confirm/export` 还没落地，先重构会拖慢 `v0` 交付
- 当前 preview 已经稳定，过早重构会扩大回归面
- `v0` 的首要目标是交付闭环，不是结构最优

因此更合理的做法是：

1. 先用 `方案 A` 补齐 `confirm/export`
2. 用 `Milestone 8` 固定最小回归样例
3. 再基于稳定样例执行 `方案 C`

## 触发实施方案 C 的建议时机

出现以下任一情况时，可以正式启动方案 C：

- preview/export 出现明显重复逻辑并开始频繁同时改动
- 导出格式需要增加更多产物类型
- 需要引入 screenshot、design review、visual diff
- 节点映射或样式规则开始在多处漂移
- `Milestone 8` 已经有足够稳定的样例回归保护

## 与当前方案 A 的关系

方案 A 是交付基线。
方案 C 是结构优化方向。

两者不是竞争关系，而是先后关系：

- 先 `A`
- 后 `C`

如果未来开始执行方案 C，建议在新的 `.feats` 或设计文档中引用本文件，作为统一编译管线重构的起点。
