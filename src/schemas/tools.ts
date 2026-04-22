import { z } from "zod";

import { errorResponseSchema } from "../lib/errors/error-schema.js";
import { designAstSchema } from "./ast.js";
import { artifactManifestSchema } from "./artifacts.js";
import {
  designVersionSchema,
  isoDatetimeSchema,
  sessionIdSchema,
  sessionStatusSchema,
  urlSchema
} from "./common.js";

const textInputSchema = z
  .object({
    type: z.literal("text"),
    text: z.string().min(1)
  })
  .strict();

const urlInputSchema = z
  .object({
    type: z.literal("url"),
    url: urlSchema
  })
  .strict();

export const inputItemSchema = z.discriminatedUnion("type", [
  textInputSchema,
  urlInputSchema
]);

/** 中文说明：创建会话工具的输入契约。 */
export const createSessionParamsSchema = z
  .object({
    projectName: z.string().min(1),
    goal: z.string().min(1)
  })
  .strict();

export const createSessionResultSchema = z
  .object({
    sessionId: sessionIdSchema,
    status: sessionStatusSchema
  })
  .strict();

/** 中文说明：追加输入工具的输入契约。 */
export const appendInputParamsSchema = z
  .object({
    sessionId: sessionIdSchema,
    inputs: z.array(inputItemSchema).min(1)
  })
  .strict();

/** 中文说明：追加输入工具的输出契约。 */
export const appendInputResultSchema = z
  .object({
    acceptedInputs: z.array(inputItemSchema),
    updatedStatus: sessionStatusSchema
  })
  .strict();

/** 中文说明：clarify 工具的输入契约。 */
export const clarifyIntentParamsSchema = z
  .object({
    sessionId: sessionIdSchema
  })
  .strict();

/** 中文说明：clarify 工具的输出契约。 */
export const clarifyIntentResultSchema = z
  .object({
    isReady: z.boolean(),
    missingFields: z.array(z.string()),
    questions: z.array(z.string()),
    interimIntentModel: z.record(z.string(), z.unknown())
  })
  .strict();

/** 中文说明：generate 工具的输入契约。 */
export const generateDesignParamsSchema = z
  .object({
    sessionId: sessionIdSchema
  })
  .strict();

/** 中文说明：generate 工具的输出契约。 */
export const generateDesignResultSchema = z
  .object({
    designVersion: designVersionSchema,
    designAst: designAstSchema,
    sectionSummary: z.array(z.string()),
    previewRef: z.string().min(1),
    previewArtifacts: z.array(z.string())
  })
  .strict();

/** 中文说明：revise 工具的输入契约。 */
export const reviseDesignParamsSchema = z
  .object({
    sessionId: sessionIdSchema,
    baseVersion: designVersionSchema,
    revisionInstruction: z.string().min(1)
  })
  .strict();

/** 中文说明：revise 工具的输出契约。 */
export const reviseDesignResultSchema = z
  .object({
    baseVersion: designVersionSchema,
    newVersion: designVersionSchema,
    designAst: designAstSchema,
    diffSummary: z.array(z.string()),
    nodeDiffs: z.array(z.record(z.string(), z.unknown())),
    previewRef: z.string().min(1),
    previewArtifacts: z.array(z.string())
  })
  .strict();

/** 中文说明：confirm 工具的输入契约。 */
export const confirmDesignParamsSchema = z
  .object({
    sessionId: sessionIdSchema,
    designVersion: designVersionSchema
  })
  .strict();

/** 中文说明：confirm 工具的输出契约。 */
export const confirmDesignResultSchema = z
  .object({
    confirmedVersion: designVersionSchema,
    status: sessionStatusSchema
  })
  .strict();

/** 中文说明：export 工具的输入契约。 */
export const exportPackageParamsSchema = z
  .object({
    sessionId: sessionIdSchema,
    designVersion: designVersionSchema
  })
  .strict();

/** 中文说明：export 工具的输出契约。 */
export const exportPackageResultSchema = z
  .object({
    deliveryPackageRef: z.string().min(1),
    artifactManifest: artifactManifestSchema,
    artifacts: z.array(z.string())
  })
  .strict();

/** 中文说明：统一错误结果契约，供各工具失败时复用。 */
export const toolErrorResultSchema = errorResponseSchema.extend({
  occurredAt: isoDatetimeSchema.optional()
});
