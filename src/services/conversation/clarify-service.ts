import { z } from "zod";

import { parseUrlSignal } from "../../providers/parser/url-parser.js";
import { createSessionRepository, type SessionRepository } from "../../storage/session-repository.js";
import {
  clarifyIntentParamsSchema,
  clarifyIntentResultSchema
} from "../../schemas/tools.js";

type ClarifyIntentParams = z.infer<typeof clarifyIntentParamsSchema>;
type ClarifyIntentResult = z.infer<typeof clarifyIntentResultSchema>;

/** 中文说明：clarify service 的最小调用接口。 */
export interface ClarifyService {
  clarify(params: ClarifyIntentParams): Promise<ClarifyIntentResult>;
  close(): void;
}

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

/**
 * 中文说明：
 * clarify service 只做本地 rule-based 意图提取，优先产出稳定结构而非复杂理解能力。
 */
export async function createClarifyService(
  repository?: SessionRepository
): Promise<ClarifyService> {
  const sessionRepository = repository ?? (await createSessionRepository());

  return {
    async clarify(params) {
      const validatedParams = clarifyIntentParamsSchema.parse(params);
      const session = await sessionRepository.getSession(validatedParams.sessionId);

      if (!session) {
        throw new Error(`Session not found: ${validatedParams.sessionId}`);
      }

      const textInputs = session.inputs
        .filter((input): input is Extract<(typeof session.inputs)[number], { type: "text" }> => input.type === "text")
        .map((input) => input.text);
      const urlInputs = session.inputs
        .filter((input): input is Extract<(typeof session.inputs)[number], { type: "url" }> => input.type === "url")
        .map((input) => parseUrlSignal(input.url));

      const combinedText = [
        session.goal,
        ...textInputs,
        ...urlInputs.map((signal) => signal.summaryText)
      ].join(" ");
      const lowerText = combinedText.toLowerCase();
      const audience = detectAudience(lowerText);
      const sections = detectSections(lowerText);
      const primaryCta = detectPrimaryCta(textInputs.join(" "));
      const styleTone = detectStyleTone(lowerText);

      const interimIntentModel = {
        pageType: "landing_page",
        audience,
        sections,
        primaryCta,
        styleTone,
        sourceUrls: urlInputs.map((signal) => signal.normalizedUrl)
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

      return clarifyIntentResultSchema.parse({
        isReady: missingFields.length === 0,
        missingFields,
        questions: buildQuestions(missingFields),
        interimIntentModel
      });
    },
    close() {
      sessionRepository.close();
    }
  };
}
