export interface CompiledNode {
  nodeId: string;
  name: string;
  tag: string;
  attributes: Record<string, string>;
  text: string | null;
  children: CompiledNode[];
}

export interface CompiledAnnotation {
  nodeId: string;
  componentName: string;
  bindingKey: string | null;
  repeatSource: string | null;
  editable: boolean;
}

export interface CompiledBindingField {
  key: string;
  type: "text" | "image" | "link" | "list";
}

export interface CompiledBindingSchema {
  version: "v0";
  fields: CompiledBindingField[];
}

/** 中文说明：preview/export 共享的 AST 编译中间结构。 */
export interface CompiledDocument {
  root: CompiledNode;
  annotations: CompiledAnnotation[];
  bindingSchema: CompiledBindingSchema;
}
