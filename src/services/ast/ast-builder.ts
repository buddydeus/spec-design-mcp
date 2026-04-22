import { designAstSchema } from "../../schemas/ast.js";

interface IntentModel {
  pageType?: string;
  audience?: string | null;
  sections?: string[];
  primaryCta?: string | null;
  styleTone?: string;
}

function createSectionNode(name: string, children: object[] = []) {
  return {
    id: `node_${name}`,
    kind: "section" as const,
    name,
    tag: "section",
    text: null,
    props: {},
    style: {},
    layout: { mode: "flex" as const, direction: "column" as const, gap: 16 },
    meta: {
      componentName: `${name[0].toUpperCase()}${name.slice(1)}Section`,
      editable: false,
      bindingKey: null,
      repeatSource: null
    },
    children
  };
}

function createTextNode(kind: "heading" | "paragraph" | "button", name: string, text: string) {
  const tag =
    kind === "heading" ? "h2" : kind === "paragraph" ? "p" : "button";

  return {
    id: `node_${name}`,
    kind,
    name,
    tag,
    text,
    props: {},
    style: {},
    layout: { mode: "block" as const },
    meta: {
      componentName: `${name[0].toUpperCase()}${name.slice(1)}`,
      editable: kind !== "button",
      bindingKey: null,
      repeatSource: null
    },
    children: []
  };
}

/**
 * 中文说明：
 * v0 只生成有限、稳定的 AST 草案，优先保证结构合法和后续可编译。
 */
export function buildDesignAst(intent: IntentModel) {
  const sectionNames = intent.sections && intent.sections.length >= 3
    ? intent.sections
    : ["hero", "features", "pricing"];

  const children = sectionNames.map((sectionName) => {
    if (sectionName === "hero") {
      return createSectionNode("hero", [
        createTextNode("heading", "hero_title", `Build for ${intent.audience ?? "your audience"}`),
        createTextNode("paragraph", "hero_body", "A focused landing page generated from structured intent."),
        createTextNode("button", "hero_cta", intent.primaryCta ?? "Get Started")
      ]);
    }

    if (sectionName === "features") {
      return createSectionNode("features", [
        createTextNode("heading", "features_title", "Core Features"),
        createTextNode("paragraph", "features_body", "Highlight the primary value propositions.")
      ]);
    }

    if (sectionName === "pricing") {
      return createSectionNode("pricing", [
        createTextNode("heading", "pricing_title", "Simple Pricing"),
        createTextNode("paragraph", "pricing_body", "Make the buying decision easy to understand.")
      ]);
    }

    return createSectionNode(sectionName, [
      createTextNode("heading", `${sectionName}_title`, sectionName),
      createTextNode("paragraph", `${sectionName}_body`, `Content for ${sectionName}.`)
    ]);
  });

  return designAstSchema.parse({
    version: "v1",
    root: {
      id: "node_page",
      kind: "page",
      name: intent.pageType ?? "landing-page",
      tag: "main",
      text: null,
      props: {},
      style: {},
      layout: { mode: "block" },
      meta: {
        componentName: "LandingPage",
        editable: false,
        bindingKey: null,
        repeatSource: null
      },
      children
    }
  });
}
