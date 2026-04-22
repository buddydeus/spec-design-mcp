import { designAstSchema } from "../../schemas/ast.js";

type NodeKind =
  | "page"
  | "section"
  | "container"
  | "heading"
  | "paragraph"
  | "button"
  | "image"
  | "list"
  | "list_item"
  | "link";

interface DesignNode {
  id: string;
  kind: NodeKind;
  name: string;
  tag: string;
  text: string | null;
  props: Record<string, string | number | boolean | null>;
  style: {
    width?: string;
    maxWidth?: string;
    minHeight?: string;
    padding?: string;
    margin?: string;
    gap?: number;
    fontSize?: string;
    fontWeight?: string | number;
    lineHeight?: string | number;
    color?: string;
    backgroundColor?: string;
    borderRadius?: string;
    border?: string;
    textAlign?: "left" | "center" | "right";
  };
  layout: {
    mode: "block" | "flex" | "grid";
    direction?: "row" | "column";
    gap?: number;
    align?: "start" | "center" | "end" | "stretch";
    justify?: "start" | "center" | "end" | "between" | "around";
    columns?: number;
  };
  meta: {
    componentName: string;
    editable: boolean;
    bindingKey: string | null;
    repeatSource: string | null;
  };
  children: DesignNode[];
}

interface DesignAst {
  version: "v1";
  root: DesignNode;
}

/** 中文说明：单条修订指令应用到 AST 后的稳定差异描述。 */
export type RevisionOperation =
  | {
      type: "update_text";
      summary: string;
      nodeId: string;
      field: "text";
      from: string | null;
      to: string;
    }
  | {
      type: "add_section";
      summary: string;
      nodeId: string;
      sectionName: string;
      index: number;
    }
  | {
      type: "remove_section";
      summary: string;
      nodeId: string;
      sectionName: string;
      index: number;
    }
  | {
      type: "move_section";
      summary: string;
      nodeId: string;
      sectionName: string;
      fromIndex: number;
      toIndex: number;
    }
  | {
      type: "update_style";
      summary: string;
      nodeId: string;
      field: "backgroundColor" | "color";
      from: string | null;
      to: string;
    };

/** 中文说明：AST 修订后的结构与操作清单。 */
export interface ReviseAstResult {
  designAst: DesignAst;
  operations: RevisionOperation[];
}

function cloneAst(designAst: unknown): DesignAst {
  return designAstSchema.parse(JSON.parse(JSON.stringify(designAst))) as DesignAst;
}

function createSectionNode(name: string): DesignNode {
  return {
    id: `node_${name}`,
    kind: "section",
    name,
    tag: "section",
    text: null,
    props: {},
    style: {},
    layout: { mode: "flex", direction: "column", gap: 16 },
    meta: {
      componentName: `${name[0]?.toUpperCase() ?? "S"}${name.slice(1)}Section`,
      editable: false,
      bindingKey: null,
      repeatSource: null
    },
    children: [
      {
        id: `node_${name}_title`,
        kind: "heading",
        name: `${name}_title`,
        tag: "h2",
        text: name[0]?.toUpperCase() ? `${name[0].toUpperCase()}${name.slice(1)}` : name,
        props: {},
        style: {},
        layout: { mode: "block" },
        meta: {
          componentName: `${name[0]?.toUpperCase() ?? "S"}${name.slice(1)}Title`,
          editable: true,
          bindingKey: null,
          repeatSource: null
        },
        children: []
      },
      {
        id: `node_${name}_body`,
        kind: "paragraph",
        name: `${name}_body`,
        tag: "p",
        text: `Content for ${name}.`,
        props: {},
        style: {},
        layout: { mode: "block" },
        meta: {
          componentName: `${name[0]?.toUpperCase() ?? "S"}${name.slice(1)}Body`,
          editable: true,
          bindingKey: null,
          repeatSource: null
        },
        children: []
      }
    ]
  };
}

function getSectionNodes(designAst: DesignAst): DesignNode[] {
  return designAst.root.children.filter((node) => node.kind === "section");
}

function findSectionIndex(sections: DesignNode[], name: string): number {
  return sections.findIndex((section) => section.name === name);
}

function findNodeById(node: DesignNode, nodeId: string): DesignNode | null {
  if (node.id === nodeId) {
    return node;
  }

  for (const child of node.children) {
    const matchedNode = findNodeById(child, nodeId);

    if (matchedNode) {
      return matchedNode;
    }
  }

  return null;
}

function findFirstNodeByKind(node: DesignNode, kind: DesignNode["kind"]): DesignNode | null {
  if (node.kind === kind) {
    return node;
  }

  for (const child of node.children) {
    const matchedNode = findFirstNodeByKind(child, kind);

    if (matchedNode) {
      return matchedNode;
    }
  }

  return null;
}

function normalizeInstruction(rawInstruction: string): string[] {
  return rawInstruction
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * 中文说明：
 * revise v0 仅支持受限规则，目标是稳定地产生新版本和差异，而不是做自由文本理解。
 */
export function reviseDesignAst(designAst: unknown, revisionInstruction: string): ReviseAstResult {
  const nextAst = cloneAst(designAst);
  const operations: RevisionOperation[] = [];
  const clauses = normalizeInstruction(revisionInstruction);

  for (const clause of clauses) {
    const updateTitleMatch = clause.match(/^change\s+([a-z0-9_-]+)\s+title\s+to\s+(.+)$/i);

    if (updateTitleMatch) {
      const sectionName = updateTitleMatch[1]!.toLowerCase();
      const nextText = updateTitleMatch[2]!.trim();
      const targetNode = findNodeById(nextAst.root, `node_${sectionName}_title`);

      if (targetNode) {
        operations.push({
          type: "update_text",
          summary: `Updated ${sectionName} title text`,
          nodeId: targetNode.id,
          field: "text",
          from: targetNode.text,
          to: nextText
        });
        targetNode.text = nextText;
      }

      continue;
    }

    const updateBodyMatch = clause.match(/^change\s+([a-z0-9_-]+)\s+body\s+to\s+(.+)$/i);

    if (updateBodyMatch) {
      const sectionName = updateBodyMatch[1]!.toLowerCase();
      const nextText = updateBodyMatch[2]!.trim();
      const targetNode = findNodeById(nextAst.root, `node_${sectionName}_body`);

      if (targetNode) {
        operations.push({
          type: "update_text",
          summary: `Updated ${sectionName} body text`,
          nodeId: targetNode.id,
          field: "text",
          from: targetNode.text,
          to: nextText
        });
        targetNode.text = nextText;
      }

      continue;
    }

    const updateCtaMatch = clause.match(/^change\s+cta\s+to\s+(.+)$/i);

    if (updateCtaMatch) {
      const nextText = updateCtaMatch[1]!.trim();
      const ctaNode = findFirstNodeByKind(nextAst.root, "button");

      if (ctaNode) {
        operations.push({
          type: "update_text",
          summary: "Updated primary CTA text",
          nodeId: ctaNode.id,
          field: "text",
          from: ctaNode.text,
          to: nextText
        });
        ctaNode.text = nextText;
      }

      continue;
    }

    const addSectionMatch = clause.match(/^add\s+section\s+([a-z0-9_-]+)$/i);

    if (addSectionMatch) {
      const sectionName = addSectionMatch[1]!.toLowerCase();
      const sections = getSectionNodes(nextAst);
      const existingIndex = findSectionIndex(sections, sectionName);

      if (existingIndex === -1) {
        const nextSection = createSectionNode(sectionName);
        nextAst.root.children.push(nextSection);
        operations.push({
          type: "add_section",
          summary: `Added section ${sectionName}`,
          nodeId: nextSection.id,
          sectionName,
          index: nextAst.root.children.length - 1
        });
      }

      continue;
    }

    const removeSectionMatch = clause.match(/^remove\s+section\s+([a-z0-9_-]+)$/i);

    if (removeSectionMatch) {
      const sectionName = removeSectionMatch[1]!.toLowerCase();
      const sections = getSectionNodes(nextAst);
      const sectionIndex = findSectionIndex(sections, sectionName);

      if (sectionIndex >= 0) {
        const targetSection = sections[sectionIndex]!;
        nextAst.root.children = nextAst.root.children.filter((node) => node.id !== targetSection.id);
        operations.push({
          type: "remove_section",
          summary: `Removed section ${sectionName}`,
          nodeId: targetSection.id,
          sectionName,
          index: sectionIndex
        });
      }

      continue;
    }

    const moveSectionMatch = clause.match(
      /^move\s+([a-z0-9_-]+)\s+(before|after)\s+([a-z0-9_-]+)$/i
    );

    if (moveSectionMatch) {
      const sectionName = moveSectionMatch[1]!.toLowerCase();
      const mode = moveSectionMatch[2]!.toLowerCase();
      const targetName = moveSectionMatch[3]!.toLowerCase();
      const sections = getSectionNodes(nextAst);
      const fromIndex = findSectionIndex(sections, sectionName);
      const anchorIndex = findSectionIndex(sections, targetName);

      if (fromIndex >= 0 && anchorIndex >= 0 && fromIndex !== anchorIndex) {
        const movingSection = sections[fromIndex]!;
        const retainedSections = sections.filter((section) => section.id !== movingSection.id);
        const anchorPosition = retainedSections.findIndex((section) => section.name === targetName);
        const insertionIndex = mode === "before" ? anchorPosition : anchorPosition + 1;

        retainedSections.splice(insertionIndex, 0, movingSection);
        nextAst.root.children = retainedSections;
        operations.push({
          type: "move_section",
          summary: `Moved section ${sectionName} ${mode} ${targetName}`,
          nodeId: movingSection.id,
          sectionName,
          fromIndex,
          toIndex: insertionIndex
        });
      }

      continue;
    }

    const backgroundColorMatch = clause.match(/^change\s+background\s+color\s+to\s+(.+)$/i);

    if (backgroundColorMatch) {
      const nextColor = backgroundColorMatch[1]!.trim();

      operations.push({
        type: "update_style",
        summary: "Updated page background color",
        nodeId: nextAst.root.id,
        field: "backgroundColor",
        from: nextAst.root.style.backgroundColor ?? null,
        to: nextColor
      });
      nextAst.root.style.backgroundColor = nextColor;

      continue;
    }

    const textColorMatch = clause.match(/^change\s+text\s+color\s+to\s+(.+)$/i);

    if (textColorMatch) {
      const nextColor = textColorMatch[1]!.trim();

      operations.push({
        type: "update_style",
        summary: "Updated page text color",
        nodeId: nextAst.root.id,
        field: "color",
        from: nextAst.root.style.color ?? null,
        to: nextColor
      });
      nextAst.root.style.color = nextColor;
    }
  }

  return {
    designAst: designAstSchema.parse(nextAst) as DesignAst,
    operations
  };
}
