/**
 * 中文说明：
 * 统一生成运行时需要的标识和时间戳，避免服务层各自散落实现。
 */
export function createSessionId(): string {
  return `session_${crypto.randomUUID()}`;
}

/** 中文说明：统一输出 ISO 时间，便于持久化和调试。 */
export function getNowIsoString(): string {
  return new Date().toISOString();
}
