import type {
  IntentModel,
  IntentProvider,
  IntentProviderInput,
  IntentProviderResult
} from "./intent-provider.js";

function detectAudience(text: string): string | null {
  if (text.includes("developers") || text.includes("developer")) {
    return "developers";
  }

  if (text.includes("founders") || text.includes("startup")) {
    return "founders";
  }

  if (text.includes("marketers") || text.includes("marketing")) {
    return "marketers";
  }

  return null;
}

function detectSections(text: string): string[] {
  const candidates = [
    "hero",
    "features",
    "pricing",
    "testimonials",
    "faq",
    "cta"
  ];

  return candidates.filter((section) => text.includes(section));
}

function detectPrimaryCta(rawText: string): string | null {
  const explicitCtaMatch = rawText.match(/(?:primary cta|cta)\s+([A-Za-z][A-Za-z ]{2,40})/i);

  if (explicitCtaMatch) {
    return explicitCtaMatch[1].trim();
  }

  const commonCtas = ["Start Free Trial", "Get Started", "Book Demo", "Contact Sales"];

  return commonCtas.find((cta) => rawText.toLowerCase().includes(cta.toLowerCase())) ?? null;
}

function detectStyleTone(text: string): string {
  if (text.includes("minimal")) {
    return "minimal";
  }

  if (text.includes("bold")) {
    return "bold";
  }

  return "professional";
}

function buildQuestions(missingFields: string[]): string[] {
  return missingFields.map((field) => {
    switch (field) {
      case "audience":
        return "这个 Landing Page 主要面向哪类用户？";
      case "sections":
        return "你希望页面至少包含哪些核心区块？例如 hero、features、pricing。";
      case "primaryCta":
        return "页面的主 CTA 是什么？例如 Start Free Trial 或 Book Demo。";
      default:
        return `请补充 ${field}。`;
    }
  });
}

export function createRuleBasedIntentProvider(): IntentProvider {
  return {
    async extractIntent(input: IntentProviderInput): Promise<IntentProviderResult> {
      const combinedText = [
        input.goal,
        ...input.textInputs,
        ...input.urlSignals.map((signal) => signal.summaryText)
      ].join(" ");
      const lowerText = combinedText.toLowerCase();
      const audience = detectAudience(lowerText);
      const sections = detectSections(lowerText);
      const primaryCta = detectPrimaryCta(input.textInputs.join(" "));
      const styleTone = detectStyleTone(lowerText);
      const intentModel: IntentModel = {
        pageType: "landing_page",
        audience,
        sections,
        primaryCta,
        styleTone,
        sourceUrls: input.urlSignals.map((signal) => signal.normalizedUrl),
        urlSignals: input.urlSignals.map((signal) => ({
          normalizedUrl: signal.normalizedUrl,
          hostname: signal.hostname,
          path: signal.path,
          sourceType: signal.sourceType,
          fallbackReason: signal.fallbackReason
        })),
        provider: {
          name: "rule-based-intent-provider",
          mode: "rule_based",
          fallbackReason: "LLM provider is not configured; using deterministic rule-based extraction."
        }
      };
      const missingFields: string[] = [];

      if (!audience) {
        missingFields.push("audience");
      }

      if (sections.length < 3) {
        missingFields.push("sections");
      }

      if (!primaryCta) {
        missingFields.push("primaryCta");
      }

      return {
        intentModel,
        missingFields,
        questions: buildQuestions(missingFields)
      };
    }
  };
}
