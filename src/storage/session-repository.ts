import { createRuntimeDatabase, type RuntimeDatabase } from "./sqlite/database.js";
import { inputItemSchema } from "../schemas/tools.js";
import { sessionStatusSchema } from "../schemas/common.js";
import { getNowIsoString } from "../lib/runtime/ids.js";

type SessionStatus = (typeof sessionStatusSchema)["enum"][keyof (typeof sessionStatusSchema)["enum"]];
type InputItem = ReturnType<typeof inputItemSchema.parse>;

export interface StoredSession {
  sessionId: string;
  projectName: string;
  goal: string;
  status: SessionStatus;
  confirmedVersion: string | null;
  inputs: InputItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoredSessionInput {
  sessionId: string;
  projectName: string;
  goal: string;
  status: SessionStatus;
}

export interface SessionRepository {
  readonly database: RuntimeDatabase;
  createSession(input: CreateStoredSessionInput): Promise<StoredSession>;
  getSession(sessionId: string): Promise<StoredSession | null>;
  appendInputs(sessionId: string, inputs: InputItem[]): Promise<StoredSession>;
  confirmVersion(sessionId: string, designVersion: string): Promise<StoredSession>;
  markExported(sessionId: string): Promise<StoredSession>;
  close(): void;
}

/**
 * 中文说明：
 * session repository 负责最小元数据读写，不承载业务编排。
 */
export async function createSessionRepository(): Promise<SessionRepository> {
  const database = await createRuntimeDatabase();
  const insertSessionStatement = database.db.prepare(`
    INSERT INTO sessions (
      session_id,
      project_name,
      goal,
      status,
      confirmed_version,
      inputs_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const selectSessionStatement = database.db.prepare(`
    SELECT
      session_id,
      project_name,
      goal,
      status,
      confirmed_version,
      inputs_json,
      created_at,
      updated_at
    FROM sessions
    WHERE session_id = ?
  `);
  const updateInputsStatement = database.db.prepare(`
    UPDATE sessions
    SET
      status = ?,
      inputs_json = ?,
      updated_at = ?
    WHERE session_id = ?
  `);
  const confirmVersionStatement = database.db.prepare(`
    UPDATE sessions
    SET
      status = ?,
      confirmed_version = ?,
      updated_at = ?
    WHERE session_id = ?
  `);
  const markExportedStatement = database.db.prepare(`
    UPDATE sessions
    SET
      status = ?,
      updated_at = ?
    WHERE session_id = ?
  `);

  const readSession = (sessionId: string): StoredSession | null => {
    const row = selectSessionStatement.get(sessionId) as
      | {
          session_id: string;
          project_name: string;
          goal: string;
          status: string;
          confirmed_version: string | null;
          inputs_json: string;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      sessionId: row.session_id,
      projectName: row.project_name,
      goal: row.goal,
      status: sessionStatusSchema.parse(row.status),
      confirmedVersion: row.confirmed_version,
      inputs: inputItemSchema.array().parse(JSON.parse(row.inputs_json)),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  };

  return {
    database,
    async createSession(input) {
      const createdAt = getNowIsoString();
      const storedSession: StoredSession = {
        sessionId: input.sessionId,
        projectName: input.projectName,
        goal: input.goal,
        status: input.status,
        confirmedVersion: null,
        inputs: [],
        createdAt,
        updatedAt: createdAt
      };

      insertSessionStatement.run(
        storedSession.sessionId,
        storedSession.projectName,
        storedSession.goal,
        storedSession.status,
        storedSession.confirmedVersion,
        JSON.stringify(storedSession.inputs),
        storedSession.createdAt,
        storedSession.updatedAt
      );

      return storedSession;
    },
    async getSession(sessionId) {
      return readSession(sessionId);
    },
    async appendInputs(sessionId, inputs) {
      const existingSession = readSession(sessionId);

      if (!existingSession) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const nextInputs = [...existingSession.inputs, ...inputs];
      const updatedAt = getNowIsoString();
      const nextStatus = sessionStatusSchema.parse("collecting_inputs");

      updateInputsStatement.run(
        nextStatus,
        JSON.stringify(nextInputs),
        updatedAt,
        sessionId
      );

      return {
        ...existingSession,
        status: nextStatus,
        inputs: nextInputs,
        updatedAt
      };
    },
    async confirmVersion(sessionId, designVersion) {
      const existingSession = readSession(sessionId);

      if (!existingSession) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const updatedAt = getNowIsoString();
      const nextStatus = sessionStatusSchema.parse("confirmed");

      confirmVersionStatement.run(
        nextStatus,
        designVersion,
        updatedAt,
        sessionId
      );

      return {
        ...existingSession,
        status: nextStatus,
        confirmedVersion: designVersion,
        updatedAt
      };
    },
    async markExported(sessionId) {
      const existingSession = readSession(sessionId);

      if (!existingSession) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const updatedAt = getNowIsoString();
      const nextStatus = sessionStatusSchema.parse("exported");

      markExportedStatement.run(
        nextStatus,
        updatedAt,
        sessionId
      );

      return {
        ...existingSession,
        status: nextStatus,
        updatedAt
      };
    },
    close() {
      database.db.close();
    }
  };
}
