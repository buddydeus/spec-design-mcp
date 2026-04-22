import {
  annotationManifestSchema
} from "../../schemas/artifacts.js";
import { designAstSchema } from "../../schemas/ast.js";

interface AnnotationNode {
  id: string;
  meta: {
    componentName: string;
    bindingKey: string | null;
    repeatSource: string | null;
    editable: boolean;
  };
  children: AnnotationNode[];
}

function collectAnnotations(node: AnnotationNode): Array<{
  nodeId: string;
  componentName: string;
  bindingKey: string | null;
  repeatSource: string | null;
  editable: boolean;
}> {
  return [
    {
      nodeId: node.id,
      componentName: node.meta.componentName,
      bindingKey: node.meta.bindingKey,
      repeatSource: node.meta.repeatSource,
      editable: node.meta.editable
    },
    ...node.children.flatMap((child) => collectAnnotations(child))
  ];
}

/**
 * 中文说明：
 * annotation manifest 复用 AST 中已有的节点元信息，不额外推导复杂语义。
 */
export function buildAnnotationManifest(designAst: unknown) {
  const validatedAst = designAstSchema.parse(designAst) as {
    root: AnnotationNode;
  };

  return annotationManifestSchema.parse(collectAnnotations(validatedAst.root));
}
