import { bindingSchemaSchema } from "../../schemas/artifacts.js";
import { designAstSchema } from "../../schemas/ast.js";

interface BindingNode {
  kind: string;
  meta: {
    bindingKey: string | null;
  };
  children: BindingNode[];
}

function inferBindingType(kind: string): "text" | "image" | "link" | "list" {
  if (kind === "image") {
    return "image";
  }

  if (kind === "link") {
    return "link";
  }

  if (kind === "list" || kind === "list_item") {
    return "list";
  }

  return "text";
}

function collectBindings(
  node: BindingNode,
  seen = new Set<string>()
): Array<{ key: string; type: "text" | "image" | "link" | "list" }> {
  const fields: Array<{ key: string; type: "text" | "image" | "link" | "list" }> = [];

  if (node.meta.bindingKey && !seen.has(node.meta.bindingKey)) {
    seen.add(node.meta.bindingKey);
    fields.push({
      key: node.meta.bindingKey,
      type: inferBindingType(node.kind)
    });
  }

  for (const child of node.children) {
    fields.push(...collectBindings(child, seen));
  }

  return fields;
}

/**
 * 中文说明：
 * 当前 binding schema 只输出最小字段清单，便于后续下游消费。
 */
export function buildBindingSchema(designAst: unknown) {
  const validatedAst = designAstSchema.parse(designAst) as {
    root: BindingNode;
  };

  return bindingSchemaSchema.parse({
    version: "v0",
    fields: collectBindings(validatedAst.root)
  });
}
