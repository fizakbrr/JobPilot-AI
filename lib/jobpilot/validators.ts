import { z } from "zod";
import { APPLICATION_STATUSES, QUESTION_CATEGORIES } from "@/lib/jobpilot/types";

export const guestNameSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(40, "Keep the name under 40 characters."),
});

export const applicationSchema = z.object({
  companyName: z.string().trim().min(1, "Company is required."),
  role: z.string().trim().min(1, "Role is required."),
  location: z.string().trim().optional().default(""),
  salary: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce.number("Salary must be a number.").positive("Salary must be greater than 0.").nullable(),
  ),
  sourcePlatform: z.string().trim().optional().default(""),
  jobUrl: z.string().trim().url("Enter a valid job URL.").or(z.literal("")).optional().default(""),
  applicationDate: z.string().trim().min(1, "Application date is required."),
  status: z.enum(APPLICATION_STATUSES).default("Wishlist"),
  notes: z.string().trim().optional().default(""),
  followUpDate: z.string().trim().nullable().optional(),
});

export const applicationPatchSchema = applicationSchema.partial().extend({
  status: z.enum(APPLICATION_STATUSES).optional(),
});

export const resumeAnalyzeSchema = z.object({
  applicationId: z.string().nullable().optional(),
  resumeText: z.string().trim().min(80, "Paste more resume detail before analyzing."),
  jobDescription: z.string().trim().min(80, "Paste the job description before analyzing."),
});

export const interviewGenerateSchema = z.object({
  applicationId: z.string().min(1, "Select an application."),
});

export const interviewPatchSchema = z.object({
  practiced: z.boolean().optional(),
  answerNotes: z.string().optional(),
  category: z.enum(QUESTION_CATEGORIES).optional(),
});
