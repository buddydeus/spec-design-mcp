import { designAstSchema } from "../schemas/ast.js";
import { designVersionSchema } from "../schemas/common.js";
import { createRuntimeDatabase, type RuntimeDatabase } from "./sqlite/database.js";
import { getNowIsoString } from "../lib/runtime/ids.js";

/** 中文说明：持久化后的设计版本完整记录。 */
export interface StoredDesignVersion {
  sessionId: string;
  designVersion: string;
  baseVersion: string | null;
  sourceType: "generate" | "revise";
  designAst: ReturnType<typeof designAstSchema.parse>;
  sectionSummary: string[];
  diffSummary: string[];
  nodeDiffs: Record<string, unknown>[];
  previewRef: string | null;
  createdAt: string;
}

/** 中文说明：保存设计版本时需要提供的输入结构。 */
export interface SaveDesignVersionInput {
  sessionId: string;
  designVersion: string;
  baseVersion: string | null;
  sourceType: "generate" | "revise";
  designAst: ReturnType<typeof designAstSchema.parse>;
  sectionSummary: string[];
  diffSummary: string[];
  nodeDiffs: Record<string, unknown>[];
  previewRef: string | null;
}

/** 中文说明：设计版本仓储的最小调用接口。 */
export interface DesignVersionRepository {
  readonly database: RuntimeDatabase;
  saveVersion(input: SaveDesignVersionInput): Promise<StoredDesignVersion>;
  getLatestVersion(sessionId: string): Promise<StoredDesignVersion | null>;
  getVersion(sessionId: string, designVersion: string): Promise<StoredDesignVersion | null>;
  close(): void;
}

/**
 * 中文说明：
 * 设计版本 repository 只负责版本记录存取，不做版本冲突判断。
 */
export async function createDesignVersionRepository(): Promise<DesignVersionRepository> {
  const database = await createRuntimeDatabase();
  const insertVersionStatement = database.db.prepare(`
    INSERT INTO design_versions (
      session_id,
      design_version,
      base_version,
      source_type,
      design_ast_json,
      section_summary_json,
      diff_summary_json,
      node_diffs_json,
      preview_ref,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const selectLatestVersionStatement = database.db.prepare(`
    SELECT
      session_id,
      design_version,
      base_version,
      source_type,
      design_ast_json,
      section_summary_json,
      diff_summary_json,
      node_diffs_json,
      preview_ref,
      created_at
    FROM design_versions
    WHERE session_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const selectVersionStatement = database.db.prepare(`
    SELECT
      session_id,
      design_version,
      base_version,
      source_type,
      design_ast_json,
      section_summary_json,
      diff_summary_json,
      node_diffs_json,
      preview_ref,
      created_at
    FROM design_versions
    WHERE session_id = ? AND design_version = ?
    LIMIT 1
  `);

  const mapRow = (
    row:
      | {
          session_id: string;
          design_version: string;
          base_version: string | null;
          source_type: "generate" | "revise";
          design_ast_json: string;
          section_summary_json: string;
          diff_summary_json: string;
          node_diffs_json: string;
          preview_ref: string | null;
          created_at: string;
        }
      | undefined
  ): StoredDesignVersion | null => {
    if (!row) {
      return null;
    }

    return {
      sessionId: row.session_id,
      designVersion: designVersionSchema.parse(row.design_version),
      baseVersion: row.base_version,
      sourceType: row.source_type,
      designAst: designAstSchema.parse(JSON.parse(row.design_ast_json)),
      sectionSummary: JSON.parse(row.section_summary_json) as string[],
      diffSummary: JSON.parse(row.diff_summary_json) as string[],
      nodeDiffs: JSON.parse(row.node_diffs_json) as Record<string, unknown>[],
      previewRef: row.preview_ref,
      createdAt: row.created_at
    };
  };

  return {
    database,
    async saveVersion(input) {
      const createdAt = getNowIsoString();
      const storedVersion: StoredDesignVersion = {
        sessionId: input.sessionId,
        designVersion: designVersionSchema.parse(input.designVersion),
        baseVersion: input.baseVersion,
        sourceType: input.sourceType,
        designAst: designAstSchema.parse(input.designAst),
        sectionSummary: input.sectionSummary,
        diffSummary: input.diffSummary,
        nodeDiffs: input.nodeDiffs,
        previewRef: input.previewRef,
        createdAt
      };

      insertVersionStatement.run(
        storedVersion.sessionId,
        storedVersion.designVersion,
        storedVersion.baseVersion,
        storedVersion.sourceType,
        JSON.stringify(storedVersion.designAst),
        JSON.stringify(storedVersion.sectionSummary),
        JSON.stringify(storedVersion.diffSummary),
        JSON.stringify(storedVersion.nodeDiffs),
        storedVersion.previewRef,
        storedVersion.createdAt
      );

      return storedVersion;
    },
    async getLatestVersion(sessionId) {
      const row = selectLatestVersionStatement.get(sessionId) as
        | {
            session_id: string;
            design_version: string;
            base_version: string | null;
            source_type: "generate" | "revise";
            design_ast_json: string;
            section_summary_json: string;
            diff_summary_json: string;
            node_diffs_json: string;
            preview_ref: string | null;
            created_at: string;
          }
        | undefined;

      return mapRow(row);
    },
    async getVersion(sessionId, designVersion) {
      const row = selectVersionStatement.get(sessionId, designVersion) as
        | {
            session_id: string;
            design_version: string;
            base_version: string | null;
            source_type: "generate" | "revise";
            design_ast_json: string;
            section_summary_json: string;
            diff_summary_json: string;
            node_diffs_json: string;
            preview_ref: string | null;
            created_at: string;
          }
        | undefined;

      return mapRow(row);
    },
    close() {
      database.db.close();
    }
  };
}
