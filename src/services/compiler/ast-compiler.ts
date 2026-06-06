import { annotationManifestSchema, bindingSchemaSchema } from "../../schemas/artifacts.js";
import { designAstSchema } from "../../schemas/ast.js";
import type {
  CompiledAnnotation,
  CompiledBindingField,
  CompiledDocument,
  CompiledNode
} from "./document-types.js";

interface DesignNode {
  id: string;
  kind: string;
  name: string;
  tag: string;
  text: string | null;
  style: Record<string, string | number | undefined>;
  meta: {
    componentName: string;
    bindingKey: string | null;
    repeatSource: string | null;
    editable: boolean;
  };
  children: DesignNode[];
}

const stylePropertyMap: Record<string, string> = {
  width: "width",
  maxWidth: "max-width",
  minHeight: "min-height",
  padding: "padding",
  margin: "margin",
  fontSize: "font-size",
  fontWeight: "font-weight",
  lineHeight: "line-height",
  color: "color",
  backgroundColor: "background-color",
  borderRadius: "border-radius",
  border: "border",
  textAlign: "text-align"
};

function inferBindingType(kind: string): CompiledBindingField["type"] {
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

function compileNode(
  node: DesignNode,
  annotations: CompiledAnnotation[],
  bindingFields: CompiledBindingField[],
  seenBindingKeys: Set<string>
): CompiledNode {
  annotations.push({
    nodeId: node.id,
    componentName: node.meta.componentName,
    bindingKey: node.meta.bindingKey,
    repeatSource: node.meta.repeatSource,
    editable: node.meta.editable
  });

  if (node.meta.bindingKey && !seenBindingKeys.has(node.meta.bindingKey)) {
    seenBindingKeys.add(node.meta.bindingKey);
    bindingFields.push({
      key: node.meta.bindingKey,
      type: inferBindingType(node.kind)
    });
  }

  const style = Object.entries(node.style)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([property, value]) => {
      const cssProperty = stylePropertyMap[property];

      return cssProperty ? `${cssProperty}: ${String(value)}` : null;
    })
    .filter((declaration): declaration is string => declaration !== null)
    .join("; ");
  const attributes: Record<string, string> = {
    "data-node-id": node.id,
    "data-node-name": node.name
  };

  if (style.length > 0) {
    attributes.style = style;
  }

  return {
    nodeId: node.id,
    name: node.name,
    tag: node.tag,
    attributes,
    text: node.text,
    children: node.children.map((child) =>
      compileNode(child, annotations, bindingFields, seenBindingKeys)
    )
  };
}

/**
 * 中文说明：
 * 将 DesignDOMAST 编译成 preview/export 共用的中间结构，确保节点、标注和绑定来自同一次遍历。
 */
export function compileDesignAst(designAst: unknown): CompiledDocument {
  const validatedAst = designAstSchema.parse(designAst) as {
    root: DesignNode;
  };
  const annotations: CompiledAnnotation[] = [];
  const bindingFields: CompiledBindingField[] = [];
  const root = compileNode(validatedAst.root, annotations, bindingFields, new Set<string>());

  return {
    root,
    annotations: annotationManifestSchema.parse(annotations),
    bindingSchema: bindingSchemaSchema.parse({
      version: "v0",
      fields: bindingFields
    })
  };
}
