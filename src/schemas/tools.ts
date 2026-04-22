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

export const appendInputParamsSchema = z
  .object({
    sessionId: sessionIdSchema,
    inputs: z.array(inputItemSchema).min(1)
  })
  .strict();

export const appendInputResultSchema = z
  .object({
    acceptedInputs: z.array(inputItemSchema),
    updatedStatus: sessionStatusSchema
  })
  .strict();

export const clarifyIntentParamsSchema = z
  .object({
    sessionId: sessionIdSchema
  })
  .strict();

export const clarifyIntentResultSchema = z
  .object({
    isReady: z.boolean(),
    missingFields: z.array(z.string()),
    questions: z.array(z.string()),
    interimIntentModel: z.record(z.string(), z.unknown())
  })
  .strict();

export const generateDesignParamsSchema = z
  .object({
    sessionId: sessionIdSchema
  })
  .strict();

export const generateDesignResultSchema = z
  .object({
    designVersion: designVersionSchema,
    designAst: designAstSchema,
    sectionSummary: z.array(z.string()),
    previewRef: z.string().min(1),
    previewArtifacts: z.array(z.string())
  })
  .strict();

export const reviseDesignParamsSchema = z
  .object({
    sessionId: sessionIdSchema,
    baseVersion: designVersionSchema,
    revisionInstruction: z.string().min(1)
  })
  .strict();

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

export const confirmDesignParamsSchema = z
  .object({
    sessionId: sessionIdSchema,
    designVersion: designVersionSchema
  })
  .strict();

export const confirmDesignResultSchema = z
  .object({
    confirmedVersion: designVersionSchema,
    status: sessionStatusSchema
  })
  .strict();

export const exportPackageParamsSchema = z
  .object({
    sessionId: sessionIdSchema,
    designVersion: designVersionSchema
  })
  .strict();

export const exportPackageResultSchema = z
  .object({
    deliveryPackageRef: z.string().min(1),
    artifactManifest: artifactManifestSchema,
    artifacts: z.array(z.string())
  })
  .strict();

export const toolErrorResultSchema = errorResponseSchema.extend({
  occurredAt: isoDatetimeSchema.optional()
});
