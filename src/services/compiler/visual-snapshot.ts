import { createHash } from "node:crypto";

import { compileDesignAst } from "./ast-compiler.js";
import type { CompiledDocument, CompiledNode } from "./document-types.js";

export interface VisualSnapshotNode {
  nodeId: string;
  name: string;
  tag: string;
  depth: number;
  childCount: number;
  textLength: number;
  textHash: string | null;
  styleHash: string | null;
}

export interface VisualSnapshot {
  version: "v0";
  fingerprint: string;
  nodeCount: number;
  maxDepth: number;
  editableNodeCount: number;
  bindingFieldCount: number;
  nodes: VisualSnapshotNode[];
}

export interface VisualDiffNodeChange {
  nodeId: string;
  changeType: "added" | "removed" | "changed";
  before?: VisualSnapshotNode;
  after?: VisualSnapshotNode;
  changedFields: string[];
}

export interface VisualDiff {
  version: "v0";
  beforeFingerprint: string;
  afterFingerprint: string;
  hasVisualChanges: boolean;
  summary: string[];
  nodeChanges: VisualDiffNodeChange[];
}

function createStableHash(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}

function collectSnapshotNodes(
  node: CompiledNode,
  depth: number,
  nodes: VisualSnapshotNode[]
): void {
  const style = node.attributes.style ?? null;
  const text = node.text?.trim() ?? null;

  nodes.push({
    nodeId: node.nodeId,
    name: node.name,
    tag: node.tag,
    depth,
    childCount: node.children.length,
    textLength: text?.length ?? 0,
    textHash: text ? createStableHash(text) : null,
    styleHash: style ? createStableHash(style) : null
  });

  node.children.forEach((child) => collectSnapshotNodes(child, depth + 1, nodes));
}

function buildSnapshotFromCompiledDocument(compiledDocument: CompiledDocument): VisualSnapshot {
  const nodes: VisualSnapshotNode[] = [];
  collectSnapshotNodes(compiledDocument.root, 0, nodes);

  return {
    version: "v0",
    fingerprint: createStableHash(nodes),
    nodeCount: nodes.length,
    maxDepth: nodes.reduce((maxDepth, node) => Math.max(maxDepth, node.depth), 0),
    editableNodeCount: compiledDocument.annotations.filter((annotation) => annotation.editable).length,
    bindingFieldCount: compiledDocument.bindingSchema.fields.length,
    nodes
  };
}

/** 中文说明：从共享编译树生成轻量视觉快照，供 preview/export 和回归比较复用。 */
export function createVisualSnapshot(designAst: unknown): VisualSnapshot {
  return buildSnapshotFromCompiledDocument(compileDesignAst(designAst));
}

function indexSnapshotNodes(snapshot: VisualSnapshot): Map<string, VisualSnapshotNode> {
  return new Map(snapshot.nodes.map((node) => [node.nodeId, node]));
}

function compareSnapshotNodes(
  before: VisualSnapshotNode,
  after: VisualSnapshotNode
): string[] {
  const changedFields: string[] = [];

  for (const field of ["name", "tag", "depth", "childCount", "textLength", "textHash", "styleHash"] as const) {
    if (before[field] !== after[field]) {
      changedFields.push(field);
    }
  }

  return changedFields;
}

export function createVisualDiff(
  beforeSnapshot: VisualSnapshot,
  afterSnapshot: VisualSnapshot
): VisualDiff {
  const beforeNodes = indexSnapshotNodes(beforeSnapshot);
  const afterNodes = indexSnapshotNodes(afterSnapshot);
  const nodeIds = new Set([...beforeNodes.keys(), ...afterNodes.keys()]);
  const nodeChanges = [...nodeIds]
    .sort()
    .flatMap((nodeId): VisualDiffNodeChange[] => {
      const before = beforeNodes.get(nodeId);
      const after = afterNodes.get(nodeId);

      if (!before && after) {
        return [{ nodeId, changeType: "added", after, changedFields: ["node"] }];
      }

      if (before && !after) {
        return [{ nodeId, changeType: "removed", before, changedFields: ["node"] }];
      }

      if (!before || !after) {
        return [];
      }

      const changedFields = compareSnapshotNodes(before, after);

      return changedFields.length > 0
        ? [{ nodeId, changeType: "changed", before, after, changedFields }]
        : [];
    });
  const summary = [
    `Node count ${beforeSnapshot.nodeCount} -> ${afterSnapshot.nodeCount}`,
    `Max depth ${beforeSnapshot.maxDepth} -> ${afterSnapshot.maxDepth}`,
    `Changed nodes ${nodeChanges.length}`
  ];

  return {
    version: "v0",
    beforeFingerprint: beforeSnapshot.fingerprint,
    afterFingerprint: afterSnapshot.fingerprint,
    hasVisualChanges: beforeSnapshot.fingerprint !== afterSnapshot.fingerprint,
    summary,
    nodeChanges
  };
}
