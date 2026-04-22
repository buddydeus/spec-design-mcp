import { z } from "zod";

/** 中文说明：统一复用的基础标量契约。 */
export const isoDatetimeSchema = z.string().datetime({ offset: true });

/** 中文说明：会话 ID 使用稳定前缀，便于后续日志与产物定位。 */
export const sessionIdSchema = z.string().min(1).regex(/^session_[a-zA-Z0-9_-]+$/);

/** 中文说明：设计版本统一使用 v1、v2 这种显式版本格式。 */
export const designVersionSchema = z.string().regex(/^v\d+$/);

/** 中文说明：节点 ID 统一收敛到 node_ 前缀，避免下游猜测来源。 */
export const nodeIdSchema = z.string().min(1).regex(/^node_[a-zA-Z0-9_-]+$/);

/** 中文说明：URL 作为输入契约存在，但本轮只约束格式，不处理抓取逻辑。 */
export const urlSchema = z.string().url();

export const sessionStatusSchema = z.enum([
  "created",
  "collecting_inputs",
  "clarifying",
  "draft_ready",
  "confirmed",
  "exported",
  "failed"
]);
