import { createRuntimeDatabase, type RuntimeDatabase } from "./sqlite/database.js";

export interface SessionRepository {
  readonly database: RuntimeDatabase;
  close(): void;
}

/**
 * 中文说明：
 * 这里先返回最小 repository 外壳，让运行时存储初始化有统一入口。
 * 具体的 create/get/append 行为在下一个任务补齐。
 */
export async function createSessionRepository(): Promise<SessionRepository> {
  const database = await createRuntimeDatabase();

  return {
    database,
    close() {
      database.db.close();
    }
  };
}
