import { z } from "zod";
import { sanitizeText } from "@/lib/jobpilot/sanitize";
import { APPLICATION_STATUSES, QUESTION_CATEGORIES } from "@/lib/jobpilot/types";

export const idSchema = z.string().trim().regex(/^[a-z]{3}_[a-f0-9]{16}$/, "Invalid record id.");

function isCalendarDate(value: string) {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function hasDefinedPatchValue(value: Record<string, unknown>) {
  return Object.values(value).some((item) => item !== undefined);
}

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
  .refine(isCalendarDate, "Enter a valid date.");

const singleLine = (maxLength: number) =>
  z.string().transform((value) => sanitizeText(value, { maxLength })).pipe(z.string().max(maxLength));

const requiredSingleLine = (field: string, maxLength: number) =>
  singleLine(maxLength).pipe(z.string().min(1, `${field} is required.`).max(maxLength));

const optionalSingleLine = (maxLength: number) =>
  z
    .string()
    .optional()
    .default("")
    .transform((value) => sanitizeText(value, { maxLength }));

const optionalSingleLinePatch = (maxLength: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : sanitizeText(value, { maxLength })));

const optionalLongText = (maxLength: number) =>
  z
    .string()
    .optional()
    .default("")
    .transform((value) => sanitizeText(value, { maxLength, multiline: true }));

const optionalLongTextPatch = (maxLength: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : sanitizeText(value, { maxLength, multiline: true })));

export const guestNameSchema = z.object({
  name: singleLine(40).pipe(z.string().min(2, "Enter at least 2 characters.").max(40, "Keep the name under 40 characters.")),
}).strict();

export const applicationSchema = z.object({
  companyName: requiredSingleLine("Company", 80),
  role: requiredSingleLine("Role", 100),
  location: optionalSingleLine(100),
  salary: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce
      .number("Salary must be a number.")
      .int("Salary must be a whole number.")
      .positive("Salary must be greater than 0.")
      .max(10_000_000, "Salary is outside the expected range.")
      .nullable(),
  ),
  sourcePlatform: optionalSingleLine(80),
  jobUrl: z
    .string()
    .optional()
    .default("")
    .transform((value) => sanitizeText(value, { maxLength: 2048 }))
    .pipe(z.string().url("Enter a valid job URL.").or(z.literal(""))),
  applicationDate: dateSchema,
  status: z.enum(APPLICATION_STATUSES).default("Wishlist"),
  notes: optionalLongText(4000),
  followUpDate: z.preprocess((value) => (value === "" || value === undefined ? null : value), dateSchema.nullable()),
}).strict();

export const applicationPatchSchema = z.object({
  companyName: requiredSingleLine("Company", 80).optional(),
  role: requiredSingleLine("Role", 100).optional(),
  location: optionalSingleLinePatch(100),
  salary: z
    .preprocess(
      (value) => (value === "" || value === null || value === undefined ? null : value),
      z.coerce
        .number("Salary must be a number.")
        .int("Salary must be a whole number.")
        .positive("Salary must be greater than 0.")
        .max(10_000_000, "Salary is outside the expected range.")
        .nullable(),
    )
    .optional(),
  sourcePlatform: optionalSingleLinePatch(80),
  jobUrl: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : sanitizeText(value, { maxLength: 2048 })))
    .pipe(z.string().url("Enter a valid job URL.").or(z.literal("")).optional()),
  applicationDate: dateSchema.optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  notes: optionalLongTextPatch(4000),
  followUpDate: z.preprocess((value) => (value === "" || value === undefined ? null : value), dateSchema.nullable()).optional(),
}).strict().refine(hasDefinedPatchValue, "Provide at least one field to update.");

export const resumeAnalyzeSchema = z.object({
  applicationId: idSchema.nullable().optional(),
  resumeText: z
    .string()
    .transform((value) => sanitizeText(value, { maxLength: 20_000, multiline: true }))
    .pipe(z.string().min(80, "Paste more resume detail before analyzing.").max(20_000, "Resume text is too long.")),
  jobDescription: z
    .string()
    .transform((value) => sanitizeText(value, { maxLength: 12_000, multiline: true }))
    .pipe(z.string().min(80, "Paste the job description before analyzing.").max(12_000, "Job description is too long.")),
}).strict();

export const interviewGenerateSchema = z.object({
  applicationId: idSchema,
}).strict();

export const interviewPatchSchema = z.object({
  practiced: z.boolean().optional(),
  answerNotes: optionalLongTextPatch(4000),
  category: z.enum(QUESTION_CATEGORIES).optional(),
}).strict().refine(hasDefinedPatchValue, "Provide at least one field to update.");

export const onboardingSchema = z.object({
  onboardingCompleted: z.literal(true),
}).strict();
