export const APPLICATION_STATUSES = [
  "Wishlist",
  "Applied",
  "Screening",
  "Technical Interview",
  "HR Interview",
  "Offer",
  "Rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const QUESTION_CATEGORIES = [
  "Behavioral",
  "Technical",
  "Role-specific",
  "Company-specific",
  "Questions to ask the interviewer",
] as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export type Guest = {
  id: string;
  name: string;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Application = {
  id: string;
  guestId: string;
  companyName: string;
  role: string;
  location: string;
  salary: number | null;
  sourcePlatform: string;
  jobUrl: string;
  applicationDate: string;
  status: ApplicationStatus;
  notes: string;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResumeAnalysis = {
  id: string;
  guestId: string;
  applicationId: string | null;
  resumeText: string;
  jobDescription: string;
  score: number;
  strengths: string[];
  missingKeywords: string[];
  suggestions: string[];
  rewrittenBullets: string[];
  finalRecommendation: string;
  createdAt: string;
};

export type InterviewQuestion = {
  id: string;
  guestId: string;
  applicationId: string;
  category: QuestionCategory;
  question: string;
  answerNotes: string;
  practiced: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ActivityEvent = {
  id: string;
  guestId: string;
  applicationId: string;
  label: string;
  createdAt: string;
};

export type AiUsage = {
  guestId: string;
  date: string;
  count: number;
};

export type JobPilotDatabase = {
  guests: Guest[];
  applications: Application[];
  resumeAnalyses: ResumeAnalysis[];
  interviewQuestions: InterviewQuestion[];
  activityEvents: ActivityEvent[];
  aiUsage: AiUsage[];
};

export type DashboardAnalytics = {
  totalApplications: number;
  applicationsThisWeek: number;
  interviewRate: number;
  offerRate: number;
  rejectedCount: number;
  overdueFollowUps: number;
  byStatus: Record<ApplicationStatus, number>;
};

export type AiQuota = {
  limit: number;
  used: number;
  remaining: number;
  date: string;
};
