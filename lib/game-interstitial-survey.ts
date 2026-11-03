import { sanitizeRichTextHtml } from "@/lib/sanitize-html";

export const DEFAULT_SURVEY_SHOW_EVERY_POLLS = 3;
export const SURVEY_OPTION_MIN = 2;
export const SURVEY_OPTION_MAX = 8;
export const SURVEY_QUESTION_MAX = 12;

export type SurveyQuestionOption = {
  id: string;
  label: string;
};

export type SurveyQuestion = {
  id: string;
  prompt: string;
  options: SurveyQuestionOption[];
};

export type GameInterstitialSurveyConfig = {
  headerLabel: string;
  instructionsHtml: string;
  showEveryPolls: number;
  questions: SurveyQuestion[];
};

export type SurveyInterstitialClient = {
  id: string;
  name: string;
  headerLabel: string;
  instructionsHtml: string;
  questions: SurveyQuestion[];
};

function safeText(value: unknown, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safePositiveInteger(value: unknown, fallback: number, max = 100) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 1), max);
}

function normalizeSurveyOption(value: unknown, index: number): SurveyQuestionOption | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const label = safeText(record.label, 240);

  if (!label) {
    return null;
  }

  const id = safeText(record.id, 80) || `option-${index + 1}`;

  return { id, label };
}

function normalizeSurveyQuestion(value: unknown, index: number): SurveyQuestion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const prompt = safeText(record.prompt, 500);

  if (!prompt) {
    return null;
  }

  const rawOptions = Array.isArray(record.options) ? record.options : [];
  const options = rawOptions
    .map((option, optionIndex) => normalizeSurveyOption(option, optionIndex))
    .filter((option): option is SurveyQuestionOption => Boolean(option))
    .slice(0, SURVEY_OPTION_MAX);

  if (options.length < SURVEY_OPTION_MIN) {
    return null;
  }

  const id = safeText(record.id, 80) || `question-${index + 1}`;

  return { id, prompt, options };
}

export function createDefaultSurveyQuestion(order = 1): SurveyQuestion {
  return {
    id: crypto.randomUUID(),
    prompt: order === 1 ? "How are you finding the poll experience so far?" : "",
    options: [
      { id: crypto.randomUUID(), label: "Great" },
      { id: crypto.randomUUID(), label: "Good" },
      { id: crypto.randomUUID(), label: "Needs work" }
    ]
  };
}

export function createDefaultSurveyConfig(): GameInterstitialSurveyConfig {
  return {
    headerLabel: "Quick Survey",
    instructionsHtml: "<p>Share a little feedback before the next question. Your answers help us improve the experience.</p>",
    showEveryPolls: DEFAULT_SURVEY_SHOW_EVERY_POLLS,
    questions: [createDefaultSurveyQuestion(1)]
  };
}

export function normalizeSurveyConfig(value: unknown): GameInterstitialSurveyConfig {
  const defaults = createDefaultSurveyConfig();

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaults;
  }

  const record = value as Record<string, unknown>;
  const rawQuestions = Array.isArray(record.questions) ? record.questions : [];
  const questions = rawQuestions
    .map((question, index) => normalizeSurveyQuestion(question, index))
    .filter((question): question is SurveyQuestion => Boolean(question))
    .slice(0, SURVEY_QUESTION_MAX);

  const headerLabel = safeText(record.headerLabel, 120) || defaults.headerLabel;
  const instructionsSource = safeText(record.instructionsHtml, 12000) || defaults.instructionsHtml;
  const instructionsHtml = sanitizeRichTextHtml(instructionsSource) || defaults.instructionsHtml;

  return {
    headerLabel,
    instructionsHtml,
    showEveryPolls: safePositiveInteger(record.showEveryPolls, defaults.showEveryPolls),
    questions: questions.length > 0 ? questions : defaults.questions
  };
}

export function readSurveyConfigFromMetadata(metadata: Record<string, unknown> | undefined): GameInterstitialSurveyConfig {
  const survey = metadata?.survey;
  return normalizeSurveyConfig(survey);
}

export function writeSurveyConfigToMetadata(
  metadata: Record<string, unknown> | undefined,
  survey: GameInterstitialSurveyConfig
): Record<string, unknown> {
  const normalized = normalizeSurveyConfig(survey);

  return {
    ...(metadata ?? {}),
    survey: normalized
  };
}

export function buildSurveyInterstitialClient(
  interstitial: { id: string; name: string; metadata: Record<string, unknown> }
): SurveyInterstitialClient | null {
  const survey = readSurveyConfigFromMetadata(interstitial.metadata);

  if (survey.questions.length === 0) {
    return null;
  }

  return {
    id: interstitial.id,
    name: interstitial.name,
    headerLabel: survey.headerLabel,
    instructionsHtml: survey.instructionsHtml,
    questions: survey.questions
  };
}

export function instructionsHtmlToPlainText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function plainTextToInstructionsHtml(value: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "<p></p>";
  }

  return lines.map((line) => `<p>${line}</p>`).join("");
}

export function validateSurveyAnswers(
  questions: SurveyQuestion[],
  answers: Record<string, string>
): { ok: true; answers: Record<string, string> } | { ok: false; error: string } {
  const normalizedAnswers: Record<string, string> = {};

  for (const question of questions) {
    const selectedOptionId = safeText(answers[question.id], 80);
    const matchingOption = question.options.find((option) => option.id === selectedOptionId);

    if (!matchingOption) {
      return { ok: false, error: `Please answer: ${question.prompt}` };
    }

    normalizedAnswers[question.id] = matchingOption.id;
  }

  return { ok: true, answers: normalizedAnswers };
}
