import { z } from "zod";

import { nodeIdSchema } from "./common.js";

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

const textAlignSchema = z.enum(["left", "center", "right"]);

const styleSchema = z
  .object({
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
    textAlign: textAlignSchema.optional()
  })
  .strict();

const layoutSchema = z
  .object({
    mode: layoutModeSchema,
    direction: z.enum(["row", "column"]).optional(),
    gap: z.number().optional(),
    align: z.enum(["start", "center", "end", "stretch"]).optional(),
    justify: z.enum(["start", "center", "end", "between", "around"]).optional(),
    columns: z.number().int().positive().optional()
  })
  .strict();

const metaSchema = z
  .object({
    componentName: z.string().min(1),
    editable: z.boolean(),
    bindingKey: z.string().min(1).nullable(),
    repeatSource: z.string().min(1).nullable()
  })
  .strict();

const propValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/**
 * 中文说明：
 * 节点递归定义保持在 schema 层统一收口，避免后续服务层各自放宽 AST 结构。
 */
export const designNodeSchema: z.ZodTypeAny = z.lazy(() =>
  z
    .object({
      id: nodeIdSchema,
      kind: nodeKindSchema,
      name: z.string().min(1),
      tag: z.string().min(1),
      text: z.string().nullable(),
      props: z.record(z.string(), propValueSchema),
      style: styleSchema,
      layout: layoutSchema,
      meta: metaSchema,
      children: z.array(designNodeSchema)
    })
    .strict()
);

/** 中文说明：DesignDOMAST v0 的根契约。 */
export const designAstSchema = z
  .object({
    version: z.literal("v1"),
    root: designNodeSchema
  })
  .strict();
