import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { sanitizeText, sanitizeTextList } from "@/lib/jobpilot/sanitize";
import type { Application, InterviewQuestion, QuestionCategory, ResumeAnalysis } from "@/lib/jobpilot/types";
import { QUESTION_CATEGORIES } from "@/lib/jobpilot/types";
import { createId, nowIso } from "@/lib/jobpilot/store";

type ResumeFeedback = Pick<
  ResumeAnalysis,
  "score" | "strengths" | "missingKeywords" | "suggestions" | "rewrittenBullets" | "finalRecommendation"
>;

type GeneratedQuestion = {
  category: QuestionCategory;
  question: string;
};

type AiGenerationResult<T> = {
  data: T;
  usedModel: boolean;
};

const resumeFeedbackSchema = z.object({
  score: z.coerce.number().catch(64),
  strengths: z.array(z.string()).catch([]),
  missingKeywords: z.array(z.string()).catch([]),
  suggestions: z.array(z.string()).catch([]),
  rewrittenBullets: z.array(z.string()).catch([]),
  finalRecommendation: z.string().catch(""),
}).passthrough();

const generatedQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      category: z.enum(QUESTION_CATEGORIES),
      question: z.string(),
    }),
  ).catch([]),
}).passthrough();

function clampScore(score: number) {
  if (!Number.isFinite(score)) return 64;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const character = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = inString;
      continue;
    }

    if (character === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) continue;
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;

    if (depth === 0) {
      try {
        return JSON.parse(text.slice(start, index + 1)) as unknown;
      } catch {
        return null;
      }
    }
  }

  return null;
}

function isGeneratedQuestion(item: unknown): item is GeneratedQuestion {
  if (!item || typeof item !== "object") return false;
  const candidate = item as { category?: unknown; question?: unknown };
  return (
    typeof candidate.category === "string" &&
    QUESTION_CATEGORIES.includes(candidate.category as QuestionCategory) &&
    typeof candidate.question === "string" &&
    Boolean(candidate.question.trim())
  );
}

export function fallbackResumeFeedback(resumeText: string, jobDescription: string): ResumeFeedback {
  const resumeLower = resumeText.toLowerCase();
  const keywords = Array.from(
    new Set(
      jobDescription
        .toLowerCase()
        .match(/\b(react|next\.js|typescript|javascript|tailwind|node|api|testing|accessibility|performance|sql|postgres|prisma|frontend|backend|full-stack|git|ci\/cd)\b/g) ??
        [],
    ),
  );
  const missingKeywords = keywords.filter((keyword) => !resumeLower.includes(keyword)).slice(0, 8);
  const score = Math.max(46, Math.min(86, 78 - missingKeywords.length * 4));

  return {
    score,
    strengths: [
      "Your resume gives enough context for an initial recruiter scan.",
      "The experience section can be shaped into outcome-first bullets.",
      "The role alignment is clear enough to tailor without inventing new skills.",
    ],
    missingKeywords: missingKeywords.length ? missingKeywords : ["role-specific metrics", "testing evidence"],
    suggestions: [
      "Lead each bullet with the business or user outcome before naming the implementation detail.",
      "Mirror the job description language where it truthfully matches your experience.",
      "Add measurable scope such as number of users, pages, APIs, or performance improvement.",
      "Group the most relevant technologies near the top so ATS and recruiters see alignment quickly.",
    ],
    rewrittenBullets: [
      "Built a responsive application workflow with React and TypeScript, improving recruiter-facing clarity across the core user journey.",
      "Implemented reusable UI components and validation patterns that reduced repeated form logic across product screens.",
      "Improved page performance and interaction feedback by tightening render boundaries and loading states.",
    ],
    finalRecommendation:
      "Tailor the top third of the resume to the target role, add truthful metrics, and use the missing keywords only where they reflect work you have actually done.",
  };
}

function normalizeResumeFeedback(input: unknown, fallback: ResumeFeedback): ResumeFeedback | null {
  const parsed = resumeFeedbackSchema.safeParse(input);
  if (!parsed.success) return null;

  const strengths = sanitizeTextList(parsed.data.strengths, { maxLength: 240 }).slice(0, 6);
  const missingKeywords = sanitizeTextList(parsed.data.missingKeywords, { maxLength: 80 }).slice(0, 10);
  const suggestions = sanitizeTextList(parsed.data.suggestions, { maxLength: 320 }).slice(0, 8);
  const rewrittenBullets = sanitizeTextList(parsed.data.rewrittenBullets, { maxLength: 360 }).slice(0, 5);
  const finalRecommendation = sanitizeText(parsed.data.finalRecommendation, { maxLength: 500 });

  return {
    score: clampScore(parsed.data.score),
    strengths: strengths.length ? strengths : fallback.strengths,
    missingKeywords: missingKeywords.length ? missingKeywords : fallback.missingKeywords,
    suggestions: suggestions.length ? suggestions : fallback.suggestions,
    rewrittenBullets: rewrittenBullets.length ? rewrittenBullets : fallback.rewrittenBullets,
    finalRecommendation: finalRecommendation || fallback.finalRecommendation,
  };
}

export async function analyzeResumeWithAI(
  resumeText: string,
  jobDescription: string,
): Promise<AiGenerationResult<ResumeFeedback>> {
  const fallback = fallbackResumeFeedback(resumeText, jobDescription);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { data: fallback, usedModel: false };

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(`
You are a truthful resume reviewer for junior technology job seekers.
Return only JSON with this exact shape:
{
  "score": number,
  "strengths": string[],
  "missingKeywords": string[],
  "suggestions": string[],
  "rewrittenBullets": string[],
  "finalRecommendation": string
}
Rules:
- Score from 0 to 100.
- Be specific to the job description.
- Do not invent credentials, experience, education, or skills.
- Rewritten bullets must stay truthful to the resume content.

Resume:
${resumeText}

Job description:
${jobDescription}
`);

    const feedback = normalizeResumeFeedback(extractJson(result.response.text()), fallback);
    return feedback ? { data: feedback, usedModel: true } : { data: fallback, usedModel: false };
  } catch {
    return { data: fallback, usedModel: false };
  }
}

function fallbackQuestions(application: Application): Array<{ category: QuestionCategory; question: string }> {
  return [
    {
      category: "Behavioral",
      question: `Tell me about a time you stayed organized while managing several deadlines. How would that help you at ${application.companyName}?`,
    },
    {
      category: "Behavioral",
      question: "Describe a project where you had to recover from unclear requirements.",
    },
    {
      category: "Technical",
      question: `Walk through how you would structure a maintainable ${application.role} codebase for a product team.`,
    },
    {
      category: "Technical",
      question: "How do you debug a production issue when the first error message is misleading?",
    },
    {
      category: "Role-specific",
      question: `What parts of your experience most directly prepare you for this ${application.role} role?`,
    },
    {
      category: "Company-specific",
      question: `What would you want to learn about ${application.companyName}'s engineering culture before joining?`,
    },
    {
      category: "Questions to ask the interviewer",
      question: "What does success look like for someone in this role after the first 90 days?",
    },
  ];
}

export async function generateInterviewQuestionsWithAI(
  application: Application,
): Promise<AiGenerationResult<Array<{ category: QuestionCategory; question: string }>>> {
  const fallback = fallbackQuestions(application);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { data: fallback, usedModel: false };

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(`
Generate interview prep questions for this application.
Return only JSON:
{
  "questions": [
    { "category": "Behavioral" | "Technical" | "Role-specific" | "Company-specific" | "Questions to ask the interviewer", "question": string }
  ]
}
Create 2 Behavioral, 3 Technical, 2 Role-specific, 2 Company-specific, and 2 Questions to ask the interviewer.
Match junior-to-mid job seeker seniority. Do not guarantee outcomes.

Company: ${application.companyName}
Role: ${application.role}
Location: ${application.location || "Not specified"}
Source: ${application.sourcePlatform || "Not specified"}
Notes: ${application.notes || "None"}
`);

    const parsed = generatedQuestionsSchema.safeParse(extractJson(result.response.text()));
    const valid = (parsed.success ? parsed.data.questions : [])
      .filter(isGeneratedQuestion)
      .slice(0, 14)
      .map((question) => ({
        category: question.category,
        question: sanitizeText(question.question, { maxLength: 280 }),
      }))
      .filter((question) => question.question);

    return valid.length ? { data: valid, usedModel: true } : { data: fallback, usedModel: false };
  } catch {
    return { data: fallback, usedModel: false };
  }
}

export function toInterviewRecords(
  guestId: string,
  applicationId: string,
  questions: Array<{ category: QuestionCategory; question: string }>,
): InterviewQuestion[] {
  const timestamp = nowIso();
  return questions.map((question) => ({
    id: createId("int"),
    guestId,
    applicationId,
    category: question.category,
    question: sanitizeText(question.question, { maxLength: 280 }),
    answerNotes: "",
    practiced: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}
