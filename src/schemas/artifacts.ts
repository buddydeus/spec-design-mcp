import { z } from "zod";

import {
  designVersionSchema,
  isoDatetimeSchema,
  nodeIdSchema,
  sessionIdSchema
} from "./common.js";

const artifactTypeSchema = z.enum([
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
]);

const artifactItemSchema = z
  .object({
    artifactType: artifactTypeSchema,
    filePath: z.string().min(1)
  })
  .strict();

/** 中文说明：artifact-manifest.json 是所有交付物的唯一入口。 */
export const artifactManifestSchema = z
  .object({
    sessionId: sessionIdSchema,
    designVersion: designVersionSchema,
    generatedAt: isoDatetimeSchema,
    artifacts: z.array(artifactItemSchema).min(1)
  })
  .strict();

const annotationItemSchema = z
  .object({
    nodeId: nodeIdSchema,
    componentName: z.string().min(1),
    bindingKey: z.string().min(1).nullable(),
    repeatSource: z.string().min(1).nullable(),
    editable: z.boolean()
  })
  .strict();

export const annotationManifestSchema = z.array(annotationItemSchema);

const bindingFieldSchema = z
  .object({
    key: z.string().min(1),
    type: z.enum(["text", "image", "link", "list"])
  })
  .strict();

export const bindingSchemaSchema = z
  .object({
    version: z.literal("v0"),
    fields: z.array(bindingFieldSchema)
  })
  .strict();
