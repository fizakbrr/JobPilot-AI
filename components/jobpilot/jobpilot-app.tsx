"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Database,
  FileSearch,
  FileText,
  Filter,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Menu,
  NotebookPen,
  PanelRightOpen,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  APP_CONFIG,
  DEFAULT_DAILY_AI_ACTION_LIMIT,
  createAiQuotaSnapshot,
  getQuotaProgressValue,
  normalizeAiQuota,
} from "@/lib/jobpilot/config";
import {
  APPLICATION_STATUSES,
  QUESTION_CATEGORIES,
  type AiQuota,
  type Application,
  type ApplicationStatus,
  type DashboardAnalytics,
  type Guest,
  type InterviewQuestion,
  type ResumeAnalysis,
} from "@/lib/jobpilot/types";
import { applicationSchema } from "@/lib/jobpilot/validators";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type View = "dashboard" | "applications" | "resume" | "interviews" | "settings";

type AppData = {
  applications: Application[];
  analytics: DashboardAnalytics;
  analyses: ResumeAnalysis[];
  questions: InterviewQuestion[];
};

const emptyAnalytics: DashboardAnalytics = {
  totalApplications: 0,
  applicationsThisWeek: 0,
  interviewRate: 0,
  offerRate: 0,
  rejectedCount: 0,
  overdueFollowUps: 0,
  byStatus: APPLICATION_STATUSES.reduce(
    (accumulator, status) => ({ ...accumulator, [status]: 0 }),
    {} as Record<ApplicationStatus, number>,
  ),
};

const initialApplicationForm = {
  companyName: "",
  role: "",
  location: "",
  salary: "",
  sourcePlatform: "",
  jobUrl: "",
  applicationDate: new Date().toISOString().slice(0, 10),
  status: "Wishlist" as ApplicationStatus,
  notes: "",
  followUpDate: "",
};

type ApplicationFormState = typeof initialApplicationForm;
type ApplicationFormErrors = Partial<Record<keyof ApplicationFormState, string>>;

const springTransition = { type: "spring", stiffness: 260, damping: 30, mass: 0.82 } as const;
const viewTransition = { type: "spring", stiffness: 220, damping: 28, mass: 0.9 } as const;

const statusMeta: Record<ApplicationStatus, { dot: string; border: string; label: string; stripe: string; wash: string }> = {
  Wishlist: {
    dot: "bg-[#87927E]",
    border: "border-[#DDD3C1]",
    label: "Queued",
    stripe: "bg-[#87927E]",
    wash: "bg-[#F1EBDD]",
  },
  Applied: {
    dot: "bg-[#8EB0D6]",
    border: "border-[#C8D9E8]",
    label: "Sent",
    stripe: "bg-[#8EB0D6]",
    wash: "bg-[#F1F6FA]",
  },
  Screening: {
    dot: "bg-[#D7D8A3]",
    border: "border-[#D5E5C2]",
    label: "Screen",
    stripe: "bg-[#D7D8A3]",
    wash: "bg-[#FAFBE8]",
  },
  "Technical Interview": {
    dot: "bg-[#D26F48]",
    border: "border-[#E7B49D]",
    label: "Tech",
    stripe: "bg-[#D26F48]",
    wash: "bg-[#FFF2EA]",
  },
  "HR Interview": {
    dot: "bg-[#62675F]",
    border: "border-[#BFB5A4]",
    label: "HR",
    stripe: "bg-[#62675F]",
    wash: "bg-[#F0F5EF]",
  },
  Offer: {
    dot: "bg-[#2F6B4F]",
    border: "border-[#91C3A8]",
    label: "Offer",
    stripe: "bg-[#2F6B4F]",
    wash: "bg-[#EBF7EF]",
  },
  Rejected: {
    dot: "bg-[#B94A48]",
    border: "border-[#E3AAA8]",
    label: "Closed",
    stripe: "bg-[#B94A48]",
    wash: "bg-[#FFF4F2]",
  },
};

const onboardingSteps = [
  {
    view: "dashboard",
    title: "Start with the overview.",
    body: "See your pipeline, follow-ups, interview progress, and AI usage at a glance.",
    outcome: "Use this screen when you need to decide what deserves attention next.",
  },
  {
    view: "applications",
    title: "Track each application once.",
    body: "Save company, role, source, dates, salary, link, and notes in one record.",
    outcome: "Update the status when the role moves forward, stalls, or closes.",
  },
  {
    view: "resume",
    title: "Review your resume against a role.",
    body: "Paste a job description and resume to get targeted feedback before you apply.",
    outcome: "Use the suggestions as editing notes, not as automatic replacements.",
  },
  {
    view: "interviews",
    title: "Prepare for the interview.",
    body: "Generate role-specific questions and keep practice notes beside each role.",
    outcome: "Mark answers as practiced so preparation stays visible.",
  },
  {
    view: "settings",
    title: "Control your demo workspace.",
    body: "Update your display name, replay onboarding, monitor AI usage, or clear local data.",
    outcome: "No account is required, and manual tracking keeps working after AI actions run out.",
  },
] as const satisfies ReadonlyArray<{ view: View; title: string; body: string; outcome: string }>;

const firstTimeChecklist = [
  "Add your first application",
  "Set a follow-up date",
  "Paste resume text",
  "Generate interview questions",
] as const;

function formatCurrency(value: number | null) {
  if (!value) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function sanitizeSalary(value: string) {
  return value.replace(/[^\d]/g, "");
}

function toApplicationPayload(form: ApplicationFormState) {
  return {
    ...form,
    salary: form.salary.trim() ? Number(form.salary) : null,
    followUpDate: form.followUpDate || null,
  };
}

function validateApplicationForm(form: ApplicationFormState) {
  const parsed = applicationSchema.safeParse(toApplicationPayload(form));
  if (parsed.success) return { success: true as const, payload: parsed.data, errors: {} };

  const errors: ApplicationFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof ApplicationFormState | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }

  return {
    success: false as const,
    errors,
    message: parsed.error.issues[0]?.message ?? "Check the highlighted fields.",
  };
}

function formatAiActionsLeft(quota: AiQuota) {
  return `${quota.remaining} AI ${quota.remaining === 1 ? "action" : "actions"} left today`;
}

function isApplicationFormDirty(form: ApplicationFormState) {
  return (Object.keys(initialApplicationForm) as Array<keyof ApplicationFormState>).some(
    (key) => form[key] !== initialApplicationForm[key],
  );
}

function statusToastMessage(status: ApplicationStatus) {
  if (status === "Applied") return "Application logged. Great work.";
  if (status === "Rejected") return "Archived. Keep the momentum going on your other applications.";
  if (status === "Offer") return "Offer saved. Review the details when you are ready.";
  if (status === "Screening") return "Screening step saved. Note the next follow-up while it is fresh.";
  if (status === "Technical Interview" || status === "HR Interview") return "Interview stage saved. Add preparation notes when you can.";
  return "Application stage updated.";
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    pages.push(pageText);
  }

  return pages.join("\n\n").replace(/\s+\n/g, "\n").trim();
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload as T;
}

export function JobPilotApp() {
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [guest, setGuest] = useState<Guest | null>(null);
  const [quota, setQuota] = useState<AiQuota>(() => createAiQuotaSnapshot(DEFAULT_DAILY_AI_ACTION_LIMIT));
  const [data, setData] = useState<AppData>({
    applications: [],
    analytics: emptyAnalytics,
    analyses: [],
    questions: [],
  });
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [applicationForm, setApplicationForm] = useState(initialApplicationForm);
  const [applicationFormErrors, setApplicationFormErrors] = useState<ApplicationFormErrors>({});
  const [applicationFormError, setApplicationFormError] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [activeAnalysis, setActiveAnalysis] = useState<ResumeAnalysis | null>(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeFileError, setResumeFileError] = useState<string | null>(null);
  const [resumeFileLoading, setResumeFileLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const normalizedQuota = normalizeAiQuota(quota);

  const selectedApplication =
    data.applications.find((application) => application.id === selectedApplicationId) ?? data.applications[0] ?? null;
  const selectedApplicationAnalysis =
    data.analyses.find((analysis) => analysis.applicationId === (selectedApplication?.id ?? null)) ?? null;
  const visibleAnalysis =
    activeAnalysis?.applicationId === (selectedApplication?.id ?? null) ? activeAnalysis : selectedApplicationAnalysis;

  const sources = useMemo(
    () => Array.from(new Set(data.applications.map((application) => application.sourcePlatform).filter(Boolean))),
    [data.applications],
  );

  const filteredApplications = useMemo(() => {
    return data.applications.filter((application) => {
      const haystack =
        `${application.companyName} ${application.role} ${application.sourcePlatform} ${application.status}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || application.status === statusFilter;
      const matchesSource = sourceFilter === "All" || application.sourcePlatform === sourceFilter;
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [data.applications, search, sourceFilter, statusFilter]);

  const upcomingFollowUps = useMemo(() => {
    return [...data.applications]
      .filter((application) => application.followUpDate)
      .sort((left, right) => Date.parse(left.followUpDate ?? "") - Date.parse(right.followUpDate ?? ""))
      .slice(0, 5);
  }, [data.applications]);

  async function refreshData() {
    const payload = await readJson<AppData>(await fetch("/api/applications"));
    setData(payload);
    if (!selectedApplicationId && payload.applications[0]) setSelectedApplicationId(payload.applications[0].id);
  }

  async function refreshSession() {
    const payload = await readJson<{ guest: Guest | null; quota: AiQuota }>(await fetch("/api/session"));
    setGuest(payload.guest);
    setQuota(normalizeAiQuota(payload.quota));
    setName(payload.guest?.name ?? "");
    if (payload.guest) await refreshData();
  }

  useEffect(() => {
    // Initial client bootstrap reads the guest cookie and hydrates the workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshSession()
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && showWorkspace && guest && !guest.onboardingCompletedAt) {
      queueMicrotask(() => {
        setOnboardingStep(0);
        setView(onboardingSteps[0].view);
        setOnboardingOpen(true);
      });
    }
  }, [guest, loading, showWorkspace]);

  async function saveName() {
    setBusyAction("name");
    try {
      const payload = await readJson<{ guest: Guest; quota: AiQuota }>(
        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }),
      );
      setGuest(payload.guest);
      setQuota(normalizeAiQuota(payload.quota));
      setName(payload.guest.name);
      await refreshData();
      toast.success("Workspace ready. Add one application when you are ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your name.");
    } finally {
      setBusyAction(null);
    }
  }

  async function createApplication() {
    const validation = validateApplicationForm(applicationForm);
    if (!validation.success) {
      setApplicationFormErrors(validation.errors);
      setApplicationFormError(validation.message);
      toast.error(validation.message);
      return;
    }

    setBusyAction("create-application");
    setApplicationFormError(null);
    setApplicationFormErrors({});
    try {
      await readJson<{ application: Application }>(
        await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validation.payload),
        }),
      );
      setApplicationForm(initialApplicationForm);
      setApplicationFormErrors({});
      setApplicationFormError(null);
      setAddSheetOpen(false);
      await refreshData();
      toast.success("Application saved. Your board is up to date.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add application.";
      setApplicationFormError(message);
      toast.error(message);
    } finally {
      setBusyAction(null);
    }
  }

  async function updateApplication(id: string, patch: Partial<Application>) {
    setBusyAction(`application-${id}`);
    const previous = data.applications.find((application) => application.id === id);
    try {
      await readJson<{ application: Application }>(
        await fetch(`/api/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }),
      );
      await refreshData();
      if (patch.status && patch.status !== previous?.status) {
        toast.success(statusToastMessage(patch.status));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update application.");
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteApplication(id: string) {
    setBusyAction(`delete-${id}`);
    try {
      await readJson<{ ok: boolean }>(await fetch(`/api/applications/${id}`, { method: "DELETE" }));
      await refreshData();
      toast.success("Application removed from this board.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove application.");
    } finally {
      setBusyAction(null);
    }
  }

  async function analyzeResume() {
    setBusyAction("resume");
    setResumeError(null);
    try {
      const payload = await readJson<{ analysis: ResumeAnalysis; quota: AiQuota }>(
        await fetch("/api/ai/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId: selectedApplication?.id ?? null,
            resumeText,
            jobDescription,
          }),
        }),
      );
      setActiveAnalysis(payload.analysis);
      setQuota(normalizeAiQuota(payload.quota));
      await refreshData();
      toast.success("Resume analysis saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not analyze resume.";
      setResumeError(message);
      toast.error(message);
    } finally {
      setBusyAction(null);
    }
  }

  async function importResumePdf(file: File | null) {
    if (!file) return;

    setResumeFileError(null);
    setResumeFileName("");

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      const message = "Upload a PDF resume file.";
      setResumeFileError(message);
      toast.error(message);
      return;
    }

    setResumeFileLoading(true);
    try {
      const extractedText = await extractPdfText(file);
      if (extractedText.length < 80) {
        throw new Error("Could not read enough text from that PDF. Try a text-based resume PDF or paste the content.");
      }

      setResumeText(extractedText);
      setResumeFileName(file.name);
      toast.success("Resume PDF imported.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read that PDF.";
      setResumeFileError(message);
      toast.error(message);
    } finally {
      setResumeFileLoading(false);
    }
  }

  async function generateInterviewQuestions() {
    if (!selectedApplication) {
      toast.error("Add an application first.");
      return;
    }

    setBusyAction("interviews");
    try {
      const payload = await readJson<{ questions: InterviewQuestion[]; quota: AiQuota }>(
        await fetch("/api/ai/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: selectedApplication.id }),
        }),
      );
      setQuota(normalizeAiQuota(payload.quota));
      await refreshData();
      toast.success(`${payload.questions.length} questions generated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate questions.");
    } finally {
      setBusyAction(null);
    }
  }

  async function updateQuestion(id: string, patch: Partial<InterviewQuestion>) {
    try {
      const payload = await readJson<{ question: InterviewQuestion }>(
        await fetch(`/api/interview-questions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }),
      );
      setData((current) => ({
        ...current,
        questions: current.questions.map((question) => (question.id === id ? payload.question : question)),
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update question.");
    }
  }

  async function clearAllData() {
    setBusyAction("clear-data");
    try {
      await readJson<{ ok: boolean }>(await fetch("/api/local-data", { method: "DELETE" }));
      setGuest(null);
      setName("");
      setQuota(createAiQuotaSnapshot(DEFAULT_DAILY_AI_ACTION_LIMIT));
      setData({
        applications: [],
        analytics: emptyAnalytics,
        analyses: [],
        questions: [],
      });
      setSelectedApplicationId("");
      setActiveAnalysis(null);
      setResumeText("");
      setJobDescription("");
      setResumeFileName("");
      setResumeFileError(null);
      setResumeError(null);
      setApplicationForm(initialApplicationForm);
      setApplicationFormErrors({});
      setApplicationFormError(null);
      setStatusFilter("All");
      setSourceFilter("All");
      setSearch("");
      setAddSheetOpen(false);
      setMobileNavOpen(false);
      setShowWorkspace(false);
      toast.success("Workspace cleared.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear local data.");
    } finally {
      setBusyAction(null);
    }
  }

  async function completeOnboarding() {
    setBusyAction("onboarding");
    try {
      const payload = await readJson<{ guest: Guest; quota: AiQuota }>(
        await fetch("/api/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ onboardingCompleted: true }),
        }),
      );
      setGuest(payload.guest);
      setQuota(normalizeAiQuota(payload.quota));
      setOnboardingOpen(false);
      toast.success("Walkthrough saved. Your workspace is ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save walkthrough progress.");
    } finally {
      setBusyAction(null);
    }
  }

  function moveOnboarding(toStep: number) {
    const nextStep = Math.max(0, Math.min(onboardingSteps.length - 1, toStep));
    setOnboardingStep(nextStep);
    setView(onboardingSteps[nextStep].view);
    setMobileNavOpen(false);
    setAddSheetOpen(false);
  }

  function startOnboarding() {
    setOnboardingStep(0);
    setView(onboardingSteps[0].view);
    setOnboardingOpen(true);
  }

  function setApplicationSheetOpen(open: boolean) {
    if (!open && isApplicationFormDirty(applicationForm)) {
      const shouldClose = window.confirm("Discard this application draft?");
      if (!shouldClose) return;
    }

    setAddSheetOpen(open);
  }

  const openAdd = () => {
    setView("applications");
    setAddSheetOpen(true);
    setMobileNavOpen(false);
  };

  const nav = <Navigation view={view} setView={setView} onNavigate={() => setMobileNavOpen(false)} onAdd={openAdd} quota={normalizedQuota} />;

  if (!showWorkspace) {
    return <LandingPage onStart={() => setShowWorkspace(true)} />;
  }

  if (loading) return <LoadingShell />;

  return (
    <div className="jp-shell relative min-h-dvh overflow-hidden text-[#17201B]">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Dialog open={!guest}>
        <DialogContent className="overflow-hidden rounded-2xl border-[#DDD3C1] bg-[#FBF8F0] shadow-[0_32px_80px_-38px_rgba(7,24,14,0.75)] sm:max-w-110">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#2F6B4F]" />
          <DialogHeader>
            <div className="mb-4 flex h-12 w-40 items-center">
              <Image src="/brand/logo-complete.svg" alt={APP_CONFIG.name} width={154} height={50} className="h-auto w-full" priority />
            </div>
            <DialogTitle className="text-[22px] tracking-[-0.04em]">Name your workspace</DialogTitle>
            <DialogDescription className="text-[#62675F]">
              No account required. This browser gets its own JobPilot workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="guest-name" className="font-mono text-[12px] uppercase text-[#62675F]">
              Display name
            </Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={APP_CONFIG.defaultGuestNamePlaceholder}
              className="h-11 rounded-xl border-[#DDD3C1] bg-[#FEFCF7]"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={saveName}
              disabled={busyAction === "name" || !name.trim()}
              aria-label="Enter JobPilot workspace"
              className="h-11 rounded-xl bg-[#2F6B4F] font-mono text-[12px] shadow-[0_16px_28px_-18px_rgba(27,122,78,0.9)] hover:bg-[#285B43] active:scale-[0.96]"
            >
              {busyAction === "name" ? "Preparing workspace" : "Enter workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guest ? (
        <OnboardingWalkthrough
          open={onboardingOpen}
          step={onboardingStep}
          busy={busyAction === "onboarding"}
          onBack={() => moveOnboarding(onboardingStep - 1)}
          onNext={() => moveOnboarding(onboardingStep + 1)}
          onGoTo={moveOnboarding}
          onFinish={completeOnboarding}
        />
      ) : null}

      <div className="relative grid min-h-dvh grid-cols-1 lg:grid-cols-[284px_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#111D17]/95 text-[#F7FAF1] shadow-[22px_0_70px_-48px_rgba(0,0,0,0.9)] lg:block">
          {nav}
        </aside>
        <main id="main-content" className="jp-subtle-grid min-w-0 bg-[#F6F2E8] lg:rounded-l-[28px] lg:shadow-[-18px_0_60px_-42px_rgba(23,32,27,0.38)]">
          <TopBar
            guest={guest}
            quota={normalizedQuota}
            view={view}
            search={search}
            setSearch={setSearch}
            mobileNavOpen={mobileNavOpen}
            setMobileNavOpen={setMobileNavOpen}
          />
          {mobileNavOpen ? <div className="border-b border-[#DDD3C1] bg-[#111D17] text-[#F7FAF1] lg:hidden">{nav}</div> : null}
          <div className="mx-auto max-w-375 px-4 py-5 md:px-7 md:py-7">
            <AnimatePresence mode="wait" initial={false}>
              {view === "dashboard" ? (
                <motion.div key="dashboard" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={viewTransition}>
                  <DashboardView
                    data={data}
                    quota={normalizedQuota}
                    upcomingFollowUps={upcomingFollowUps}
                    setView={setView}
                    setSelectedApplicationId={setSelectedApplicationId}
                    onAdd={openAdd}
                  />
                </motion.div>
              ) : null}
              {view === "applications" ? (
                <motion.div key="applications" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={viewTransition}>
                  <ApplicationsView
                    applications={filteredApplications}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    sourceFilter={sourceFilter}
                    setSourceFilter={setSourceFilter}
                    sources={sources}
                    form={applicationForm}
                    setForm={setApplicationForm}
                    errors={applicationFormErrors}
                    formError={applicationFormError}
                    createApplication={createApplication}
                    updateApplication={updateApplication}
                    deleteApplication={deleteApplication}
                    busyAction={busyAction}
                    addSheetOpen={addSheetOpen}
                    setAddSheetOpen={setApplicationSheetOpen}
                  />
                </motion.div>
              ) : null}
              {view === "resume" ? (
                <motion.div key="resume" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={viewTransition}>
                  <ResumeView
                    applications={data.applications}
                    selectedApplicationId={selectedApplication?.id ?? ""}
                    setSelectedApplicationId={setSelectedApplicationId}
                    resumeText={resumeText}
                    setResumeText={setResumeText}
                    jobDescription={jobDescription}
                    setJobDescription={setJobDescription}
                    analyzeResume={analyzeResume}
                    busy={busyAction === "resume"}
                    analysis={visibleAnalysis}
                    quota={normalizedQuota}
                    importResumePdf={importResumePdf}
                    resumeFileName={resumeFileName}
                    resumeFileError={resumeFileError}
                    resumeFileLoading={resumeFileLoading}
                    resumeError={resumeError}
                  />
                </motion.div>
              ) : null}
              {view === "interviews" ? (
                <motion.div key="interviews" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={viewTransition}>
                  <InterviewView
                    applications={data.applications}
                    selectedApplicationId={selectedApplication?.id ?? ""}
                    setSelectedApplicationId={setSelectedApplicationId}
                    questions={data.questions}
                    generateInterviewQuestions={generateInterviewQuestions}
                    updateQuestion={updateQuestion}
                    busy={busyAction === "interviews"}
                    quota={normalizedQuota}
                  />
                </motion.div>
              ) : null}
              {view === "settings" ? (
                <motion.div key="settings" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={viewTransition}>
                  <SettingsView
                    guest={guest}
                    quota={normalizedQuota}
                    name={name}
                    setName={setName}
                    saveName={saveName}
                    clearAllData={clearAllData}
                    clearingData={busyAction === "clear-data"}
                    startOnboarding={startOnboarding}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

const landingPainPoints = [
  {
    title: "Applications get scattered",
    description: "Replace notes, spreadsheets, and saved emails with one pipeline record per role.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Follow-ups are easy to miss",
    description: "Put dates beside the roles so the dashboard can surface the next move.",
    icon: CalendarClock,
  },
  {
    title: "Resume feedback loses context",
    description: "Compare your resume against the actual job description you care about.",
    icon: FileSearch,
  },
  {
    title: "Interview prep gets fragmented",
    description: "Keep generated questions, practiced status, and answer notes attached to a role.",
    icon: NotebookPen,
  },
] as const;

const landingFeatures = [
  ["Track applications", "Company, role, salary, source, dates, link, notes, and status in one record.", BriefcaseBusiness],
  ["Manage follow-ups", "Upcoming and overdue dates become visible before they turn into missed opportunities.", CalendarClock],
  ["Analyze resumes", "Find keyword gaps, strong matches, and bullet rewrites for one real role.", FileSearch],
  ["Prepare for interviews", "Generate role-specific questions and save practice notes next to each prompt.", ClipboardList],
  ["Search your pipeline", "Filter by status, source, and application text when the board starts filling up.", Search],
  ["Keep guest data local", "No account is required; demo data is tied to this browser session.", Database],
] as const;

const howItWorks = [
  ["Enter a display name", "Create a browser workspace without signing up."],
  ["Add your first application", "Save the role details and choose the current stage."],
  ["Use AI when it helps", "Run resume checks or interview questions only when you need support."],
] as const;

function OnboardingWalkthrough({
  open,
  step,
  busy,
  onBack,
  onNext,
  onGoTo,
  onFinish,
}: {
  open: boolean;
  step: number;
  busy: boolean;
  onBack: () => void;
  onNext: () => void;
  onGoTo: (step: number) => void;
  onFinish: () => void;
}) {
  const current = onboardingSteps[step];
  const isLast = step === onboardingSteps.length - 1;

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden rounded-[30px] border-[#DDD3C1] bg-[#FBF8F0] p-0 shadow-[0_34px_90px_-42px_rgba(7,24,14,0.82)] sm:max-w-2xl"
      >
        <div className="grid gap-0 md:grid-cols-[0.42fr_0.58fr]">
          <div className="bg-[#17201B] p-5 text-[#F7FAF1]">
            <div className="flex h-10 w-32 items-center">
              <Image src="/brand/logo-complete.svg" alt={APP_CONFIG.name} width={154} height={50} className="h-auto w-full brightness-0 invert" />
            </div>
            <div className="mt-10 space-y-3">
              {onboardingSteps.map((item, index) => (
                <Button
                  key={item.title}
                  variant="ghost"
                  className={cn(
                    "h-auto w-full justify-start gap-3 rounded-2xl px-3 py-2 text-left transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    index === step ? "bg-[#FEFCF7]/12 text-[#F7FAF1]" : "text-[#87927E] hover:bg-[#FEFCF7]/8 hover:text-[#F7FAF1]",
                  )}
                  onClick={() => onGoTo(index)}
                >
                  <span className="font-mono text-[11px] tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                  <span className="truncate text-[12px] font-medium">{item.view}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="p-5">
            <DialogHeader>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#62675F]">
                Step {step + 1} of {onboardingSteps.length}
              </p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current.title}
                  initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={springTransition}
                >
                  <DialogTitle className="mt-3 text-[30px] leading-[0.98] tracking-[-0.06em] text-[#17201B]">{current.title}</DialogTitle>
                  <DialogDescription className="mt-4 text-[14px] leading-7 text-[#62675F]">{current.body}</DialogDescription>
                  <div className="mt-5 border-l-2 border-[#2F6B4F] bg-[#EEF6E9] px-4 py-3 text-[13px] leading-6 text-[#2F6B4F]">
                    {current.outcome}
                  </div>
                </motion.div>
              </AnimatePresence>
            </DialogHeader>
            <div className="mt-6 flex items-center gap-2">
              {onboardingSteps.map((item, index) => (
                <span key={item.title} className={cn("h-1.5 flex-1 rounded-full bg-[#DDD3C1]", index <= step && "bg-[#2F6B4F]")} />
              ))}
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={onFinish}
                disabled={busy}
                className="h-11 rounded-2xl border-[#DDD3C1] bg-[#FEFCF7] px-4 font-mono text-[12px] text-[#62675F] hover:bg-[#F1EBDD]"
              >
                Skip walkthrough
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onBack}
                  disabled={step === 0 || busy}
                  className="h-11 rounded-2xl border-[#DDD3C1] bg-[#FEFCF7] px-4 font-mono text-[12px] text-[#17201B] hover:bg-[#F1EBDD]"
                >
                  Back
                </Button>
                <Button
                  onClick={isLast ? onFinish : onNext}
                  disabled={busy}
                  className="h-11 rounded-2xl bg-[#17201B] px-4 font-mono text-[12px] text-[#F7FAF1] hover:bg-[#27392E] active:scale-[0.96]"
                >
                  {busy ? "Saving" : isLast ? "Finish walkthrough" : "Continue"}
                  {!isLast ? <ArrowRight className="size-4" /> : null}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LandingPage({ onStart }: { onStart: () => void }) {
  const scrollToFlow = () => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-dvh bg-[#F6F2E8] text-[#17201B]">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#101B15]/88 text-[#F7FAF1] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-375 items-center gap-4 px-4 md:px-7">
          <a href="#top" className="flex h-10 w-42 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D7D8A3] md:w-52">
            <Image src="/brand/logo-complete.svg" alt={APP_CONFIG.name} width={214} height={69} className="h-auto w-full brightness-0 invert" priority />
          </a>
          <nav aria-label="Landing page" className="ml-auto hidden items-center gap-6 text-[13px] font-medium text-[#E8DDC9] md:flex">
            <a className="transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D7D8A3]" href="#features">
              Features
            </a>
            <a className="transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D7D8A3]" href="#how-it-works">
              How it works
            </a>
            <button
              type="button"
              onClick={onStart}
              className="transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D7D8A3]"
            >
              Workspace
            </button>
          </nav>
          <Button
            onClick={onStart}
            className="ml-auto h-10 rounded-xl bg-[#D7D8A3] px-4 font-mono text-[12px] text-[#17201B] shadow-[0_14px_32px_-24px_rgba(221,232,95,0.9)] transition-[background-color,transform] hover:bg-[#E1E3B5] active:scale-[0.96] md:ml-4"
          >
            Try the demo
          </Button>
        </div>
      </header>

      <section id="top" className="relative min-h-[92dvh] overflow-hidden bg-[#101B15] pt-16 text-[#F7FAF1]">
        <Image
          src="/landing/jobpilot-command-desk.png"
          alt="Career planning desk with laptop and application cards"
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,24,14,0.88)_0%,rgba(7,24,14,0.7)_48%,rgba(7,24,14,0.96)_100%)]" />
        <div className="relative mx-auto flex min-h-[calc(92dvh-4rem)] max-w-375 flex-col justify-end px-4 pb-7 pt-16 md:px-7 md:pb-10">
          <div className="landing-reveal max-w-5xl">
            <p className="mb-4 w-fit border border-white/14 bg-[#FEFCF7]/8 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#D7D8A3]">
              Public demo, starts instantly
            </p>
            <h1 className="max-w-5xl text-[46px] font-semibold leading-[0.94] text-balance md:text-[78px] lg:text-[92px]">
              Keep your job search organized from application to interview.
            </h1>
            <p className="mt-6 max-w-2xl text-[16px] leading-7 text-pretty text-[#E8DDC9] md:text-[18px]">
              Track roles, plan follow-ups, review resumes, and prepare for interviews in one focused workspace. No account required.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={onStart}
                className="group h-12 rounded-xl bg-[#D7D8A3] px-5 font-mono text-[12px] text-[#17201B] shadow-[0_22px_52px_-36px_rgba(221,232,95,0.95)] transition-[background-color,transform] hover:bg-[#E1E3B5] active:scale-[0.96]"
              >
                Try the demo
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
              </Button>
              <Button
                variant="outline"
                onClick={scrollToFlow}
                className="h-12 rounded-xl border-white/18 bg-[#101B15]/58 px-5 font-mono text-[12px] text-[#F7FAF1] transition-[background-color,transform] hover:bg-[#17201B]/78 hover:text-[#F7FAF1] active:scale-[0.96]"
              >
                See how it works
              </Button>
            </div>
            <p className="mt-4 text-[13px] text-[#BFB5A4]">No account required. Manual tracking keeps working after AI actions run out.</p>
          </div>

          <div className="landing-reveal mt-10 grid gap-3 border border-white/12 bg-[#101B15]/82 p-3 shadow-[0_28px_90px_-62px_rgba(0,0,0,0.9)] backdrop-blur md:grid-cols-[1.05fr_0.95fr] md:p-4" style={{ animationDelay: "120ms" }}>
            <div className="grid gap-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#87927E]">Application board</p>
                  <p className="mt-1 text-[16px] font-semibold text-white">Product Designer at Northstar Labs</p>
                </div>
                <span className="bg-[#D7D8A3] px-2.5 py-1 font-mono text-[11px] text-[#17201B]">Screening</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["Applied", "Screening", "Technical"].map((stage, index) => (
                  <div key={stage} className="border border-white/10 bg-[#FEFCF7]/7 p-3">
                    <p className="font-mono text-[10px] uppercase text-[#BFB5A4]">{stage}</p>
                    <div className="mt-3 h-2 bg-[#FEFCF7]/10">
                      <div className={cn("h-full", index === 1 ? "w-3/4 bg-[#D7D8A3]" : "w-1/2 bg-[#87927E]")} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="border border-white/10 bg-[#FEFCF7]/7 p-3">
                  <p className="font-mono text-[10px] uppercase text-[#BFB5A4]">Next follow-up</p>
                  <p className="mt-2 text-[14px] font-semibold text-white">Email hiring manager Friday</p>
                </div>
                <div className="border border-white/10 bg-[#FEFCF7]/7 p-3">
                  <p className="font-mono text-[10px] uppercase text-[#BFB5A4]">AI usage</p>
                  <p className="mt-2 text-[14px] font-semibold text-white">3 actions left today</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="border border-white/10 bg-[#FEFCF7]/7 p-3">
                <p className="font-mono text-[10px] uppercase text-[#BFB5A4]">Resume feedback</p>
                <p className="mt-2 text-[13px] leading-5 text-[#F7FAF1]">Missing keywords: accessibility research, design systems, user interviews.</p>
              </div>
              <div className="border border-white/10 bg-[#FEFCF7]/7 p-3">
                <p className="font-mono text-[10px] uppercase text-[#BFB5A4]">Interview note</p>
                <p className="mt-2 text-[13px] leading-5 text-[#F7FAF1]">Practice a story about prioritizing roadmap tradeoffs with engineering.</p>
              </div>
              <div className="flex items-center gap-3 border border-[#D7D8A3]/30 bg-[#D7D8A3]/12 p-3 text-[#F7FAF1]">
                <ShieldCheck className="size-4 text-[#D7D8A3]" />
                <p className="text-[13px]">Resume and interview tools use AI actions. Tracking does not.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main id="main-content">
        <section className="px-4 py-20 md:px-7 md:py-24">
          <div className="mx-auto grid max-w-375 gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#62675F]">Why it exists</p>
              <h2 className="max-w-xl text-[34px] font-semibold leading-[1] text-balance md:text-[54px]">
                Job searching has too many loose ends.
              </h2>
              <p className="mt-5 max-w-lg text-[15px] leading-7 text-pretty text-[#62675F]">
                JobPilot keeps the operational parts of the search in one place so the next action is easier to see.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {landingPainPoints.map(({ title, description, icon: Icon }) => (
                <article key={title} className="border border-[#DDD3C1] bg-[#FBF8F0] p-4 shadow-[0_18px_46px_-40px_rgba(15,28,21,0.6)]">
                  <div className="mb-5 grid size-10 place-items-center bg-[#17201B] text-[#F7FAF1]">
                    <Icon className="size-4.5" strokeWidth={1.6} />
                  </div>
                  <h3 className="text-[18px] font-semibold text-[#17201B]">{title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-pretty text-[#62675F]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-[#DDD3C1] bg-[#E9EFE4] px-4 py-20 md:px-7 md:py-24">
          <div className="mx-auto max-w-375">
            <div className="mb-10 max-w-2xl">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#62675F]">Product preview</p>
              <h2 className="text-[34px] font-semibold leading-[1] text-balance md:text-[54px]">
                The workspace is built around real job-search records.
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="border border-[#D4C8B5] bg-[#FBF8F0] p-3 shadow-[0_24px_70px_-56px_rgba(15,28,21,0.75)]">
                <div className="border border-[#DDD3C1] bg-[#FEFCF7] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDD3C1] pb-3">
                    <div>
                      <p className="font-mono text-[11px] uppercase text-[#62675F]">Pipeline</p>
                      <p className="mt-1 text-[18px] font-semibold text-[#17201B]">Track every role in your pipeline.</p>
                    </div>
                    <Button onClick={onStart} className="h-10 rounded-xl bg-[#17201B] px-4 font-mono text-[12px] text-[#F7FAF1] active:scale-[0.96]">
                      Add application
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {[
                      ["Wishlist", "Design Systems Lead", "Save job URL and salary range."],
                      ["Applied", "Frontend Engineer", "Follow up on June 7."],
                      ["Interview", "Product Designer", "Prepare portfolio story."],
                    ].map(([stage, role, note]) => (
                      <div key={role} className="border border-[#DDD3C1] bg-[#F1EBDD] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] uppercase text-[#62675F]">{stage}</span>
                          <span className="size-2 bg-[#2F6B4F]" />
                        </div>
                        <p className="mt-3 text-[14px] font-semibold text-[#17201B]">{role}</p>
                        <p className="mt-2 text-[12px] leading-5 text-[#62675F]">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="border border-[#DDD3C1] bg-[#FBF8F0] p-4 shadow-[0_18px_46px_-40px_rgba(15,28,21,0.6)]">
                  <p className="font-mono text-[11px] uppercase text-[#62675F]">Resume analysis result</p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="grid size-16 place-items-center bg-[#17201B] font-mono text-[22px] font-semibold text-[#D7D8A3]">78</div>
                    <p className="text-[13px] leading-6 text-[#62675F]">Good baseline. Add evidence for accessibility audits and stakeholder research before applying.</p>
                  </div>
                </div>
                <div className="border border-[#DDD3C1] bg-[#FBF8F0] p-4 shadow-[0_18px_46px_-40px_rgba(15,28,21,0.6)]">
                  <p className="font-mono text-[11px] uppercase text-[#62675F]">Interview question note</p>
                  <p className="mt-3 text-[14px] font-semibold text-[#17201B]">Tell me about a time you improved a hiring funnel.</p>
                  <p className="mt-2 text-[13px] leading-6 text-[#62675F]">Saved note: explain the metrics, tradeoffs, and what changed after launch.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 md:px-7 md:py-24">
          <div className="mx-auto max-w-375">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#62675F]">Features</p>
                <h2 className="max-w-2xl text-[34px] font-semibold leading-[1] text-balance md:text-[54px]">
                  Focused tools for application tracking.
                </h2>
              </div>
              <p className="max-w-md text-[14px] leading-6 text-pretty text-[#62675F]">
                Every feature is tied to a job-search task: tracking, follow-up, resume review, interview prep, and local demo control.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {landingFeatures.map(([title, description, Icon]) => (
                <article key={title} className="border border-[#DDD3C1] bg-[#FBF8F0] p-4 shadow-[0_18px_46px_-40px_rgba(15,28,21,0.55)]">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="grid size-10 place-items-center bg-[#ECE4D3] text-[#17201B]">
                      <Icon className="size-4.5" strokeWidth={1.6} />
                    </div>
                    <span className="h-px w-12 bg-[#D4C8B5]" />
                  </div>
                  <h3 className="text-[17px] font-semibold text-[#17201B]">{title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-pretty text-[#62675F]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-[#DDD3C1] bg-[#17201B] px-4 py-20 text-[#F7FAF1] md:px-7 md:py-24">
          <div className="mx-auto max-w-375">
            <div className="mb-10 max-w-2xl">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#D7D8A3]">How it works</p>
              <h2 className="text-[34px] font-semibold leading-[1] text-balance md:text-[54px]">
                Start with a name. Add roles as they happen.
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {howItWorks.map(([title, description], index) => (
                <article key={title} className="border border-white/12 bg-[#FEFCF7]/7 p-4">
                  <span className="font-mono text-[12px] text-[#D7D8A3] tabular-nums">0{index + 1}</span>
                  <h3 className="mt-8 text-[20px] font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-pretty text-[#BFB5A4]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 md:px-7 md:py-24">
          <div className="mx-auto max-w-375 border border-[#17201B] bg-[#17201B] p-4 text-[#F7FAF1] shadow-[0_30px_82px_-62px_rgba(15,28,21,0.88)] md:p-6">
            <div className="grid gap-8 border border-white/10 bg-[#111D17] p-5 md:grid-cols-[1fr_auto] md:items-center md:p-7">
              <div>
                <h2 className="max-w-2xl text-[34px] font-semibold leading-none text-balance md:text-[52px]">
                  Start organizing your job search.
                </h2>
                <p className="mt-4 max-w-xl text-[14px] leading-7 text-pretty text-[#BFB5A4]">
                  No account required. Try the public demo instantly.
                </p>
              </div>
              <Button
                onClick={onStart}
                className="h-12 rounded-xl bg-[#D7D8A3] px-5 font-mono text-[12px] text-[#17201B] transition-[background-color,transform] hover:bg-[#E1E3B5] active:scale-[0.96]"
              >
                Try the demo
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-[#F6F2E8] lg:grid-cols-[284px_1fr]">
      <div className="hidden border-r border-white/10 bg-[#111D17] p-5 lg:block">
        <Skeleton className="h-14 w-full rounded-2xl bg-[#FEFCF7]/12" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-xl bg-[#FEFCF7]/10" />
          ))}
        </div>
      </div>
      <div className="p-6">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-105 rounded-3xl" />
      </div>
    </div>
  );
}

function Navigation({
  view,
  setView,
  onNavigate,
  onAdd,
  quota,
}: {
  view: View;
  setView: (view: View) => void;
  onNavigate: () => void;
  onAdd: () => void;
  quota: AiQuota;
}) {
  const items = [
    ["dashboard", LayoutDashboard, "Dashboard"],
    ["applications", BriefcaseBusiness, "Applications"],
    ["resume", FileText, "Resume Analyzer"],
    ["interviews", ClipboardList, "Interview Prep"],
    ["settings", Settings, "Settings"],
  ] as const;

  return (
    <nav aria-label="Workspace" className="flex h-full min-h-dvh flex-col">
      <div className="relative overflow-hidden border-b border-white/10 p-5">
        <div className="border border-white/10 bg-[#FEFCF7]/6 p-4 backdrop-blur">
          <p className="font-mono text-[11px] font-semibold uppercase text-[#F5EFE3]">{APP_CONFIG.guestModeTitle}</p>
          <p className="mt-1 text-[13px] leading-5 text-[#87927E]">{formatAiActionsLeft(quota)}.</p>
          <p className="mt-1 text-[12px] leading-5 text-[#87927E]">Resume analysis and interview generation use AI actions. Manual tracking does not.</p>
          <Progress value={getQuotaProgressValue(quota, "remaining")} className="mt-4 h-1.5 bg-[#FEFCF7]/10 **:data-[slot=progress-indicator]:bg-[#D7D8A3]" />
        </div>
        <div className="relative mt-4">
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#F5EFE3]">{APP_CONFIG.workspaceSubtitle}</p>
          <p className="mt-1 text-[12px] leading-5 text-[#87927E]">Track roles, follow-ups, resumes, and interviews.</p>
        </div>
        <Button
          onClick={onAdd}
          className="relative mt-5 h-11 w-full rounded-lg bg-[#D7D8A3] font-mono text-[12px] text-[#17201B] shadow-[0_18px_42px_-26px_rgba(221,232,95,0.85)] transition-[background-color,transform] hover:bg-[#E1E3B5] active:scale-[0.96]"
        >
          <Plus className="size-4" />
          Add application
        </Button>
      </div>
      <div className="flex-1 py-3">
        {items.map(([id, Icon, label]) => (
          <Button
            key={id}
            variant="ghost"
            aria-current={view === id ? "page" : undefined}
            className={cn(
              "mx-3 h-11 w-[calc(100%-1.5rem)] justify-start gap-3 rounded-lg px-3 text-[14px] font-medium text-[#A9B8AE] transition-[background-color,color,transform] duration-200 hover:bg-[#FEFCF7]/8 hover:text-[#F7FAF1] active:scale-[0.96]",
              view === id &&
                "bg-[#F7FAF1] font-semibold text-[#17201B] shadow-[0_18px_44px_-34px_rgba(0,0,0,0.85)] hover:bg-[#F7FAF1] hover:text-[#17201B]",
            )}
            onClick={() => {
              setView(id);
              onNavigate();
            }}
          >
            <Icon className="size-4.5" />
            {label}
          </Button>
        ))}
      </div>
    </nav>
  );
}

function TopBar({
  guest,
  quota,
  view,
  search,
  setSearch,
  mobileNavOpen,
  setMobileNavOpen,
}: {
  guest: Guest | null;
  quota: AiQuota;
  view: View;
  search: string;
  setSearch: (value: string) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}) {
  const searchId = useId();

  return (
    <header className="sticky top-0 z-40 border-b border-[#DDD3C1] bg-[#F6F2E8]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-375 items-center gap-4 px-4 md:px-7">
        <Button
          variant="ghost"
          size="icon"
          aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
          className="size-10 rounded-xl active:scale-[0.96] lg:hidden"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          <Menu className="size-5" />
        </Button>
        <div className="hidden h-10 w-40 items-center md:flex">
          <Image src="/brand/logo-complete.svg" alt={APP_CONFIG.name} width={154} height={50} className="h-auto w-full" />
        </div>
        {view === "applications" ? (
          <label
            htmlFor={searchId}
            className="hidden h-11 w-full max-w-md items-center rounded-lg border border-[#DDD3C1] bg-[#FEFCF7]/88 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] md:flex"
          >
            <Search className="mr-2 size-4 text-[#62675F]" />
            <span className="sr-only">Search applications</span>
            <Input
              id={searchId}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search applications by role, company, source, or status"
              className="h-9 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="ml-2 font-mono text-[11px] text-[#62675F] underline-offset-4 hover:text-[#17201B] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6B4F]"
              >
                Clear
              </button>
            ) : null}
          </label>
        ) : null}
        <div className="min-w-0 flex-1 md:hidden">
          <p className="truncate text-[14px] font-medium">Good to see you{guest ? `, ${guest.name}` : ""}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <p className="hidden max-w-44 text-right font-mono text-[11px] leading-4 text-[#62675F] tabular-nums md:block">
            {formatAiActionsLeft(quota)}
          </p>
          <div aria-label={guest ? `Workspace for ${guest.name}` : "Guest workspace"} className="grid size-10 place-items-center rounded-lg border border-[#DDD3C1] bg-[#17201B] font-mono text-[11px] font-semibold text-[#F7FAF1] shadow-[0_16px_30px_-22px_rgba(15,28,21,0.8)]">
            {guest ? initials(guest.name) || "JP" : "JP"}
          </div>
        </div>
      </div>
    </header>
  );
}

function DashboardView({
  data,
  quota,
  upcomingFollowUps,
  setView,
  setSelectedApplicationId,
  onAdd,
}: {
  data: AppData;
  quota: AiQuota;
  upcomingFollowUps: Application[];
  setView: (view: View) => void;
  setSelectedApplicationId: (id: string) => void;
  onAdd: () => void;
}) {
  const activeApplications = Math.max(0, data.analytics.totalApplications - data.analytics.byStatus.Offer - data.analytics.byStatus.Rejected);
  const interviewCount = data.analytics.byStatus["Technical Interview"] + data.analytics.byStatus["HR Interview"];
  const checklistState = [
    data.applications.length > 0,
    data.applications.some((application) => Boolean(application.followUpDate)),
    data.analyses.length > 0,
    data.questions.length > 0,
  ];
  const metrics = [
    ["Active applications", activeApplications, BriefcaseBusiness, `${data.analytics.applicationsThisWeek} added this week`],
    ["Upcoming follow-ups", upcomingFollowUps.length, CalendarClock, `${data.analytics.overdueFollowUps} overdue`],
    ["Interviews", interviewCount, ClipboardList, "technical and HR stages"],
    ["Offers or closed", data.analytics.byStatus.Offer + data.analytics.rejectedCount, CheckCircle2, `${data.analytics.offerRate}% offer rate`],
  ] as const;
  const maxStatus = Math.max(1, ...APPLICATION_STATUSES.map((status) => data.analytics.byStatus[status]));

  return (
    <div className="grid min-w-0 gap-5">
      <section className="border border-[#DDD3C1] bg-[#FBF8F0] p-4 shadow-[0_24px_70px_-56px_rgba(15,28,21,0.75)] md:p-5">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#62675F]">Dashboard</p>
            <h1 className="max-w-2xl text-[34px] font-semibold leading-[1] text-balance text-[#17201B] md:text-[48px]">
              Your job search at a glance.
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-6 text-pretty text-[#62675F]">
              See open roles, upcoming follow-ups, interview progress, and AI usage in one place.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={onAdd}
              className="h-11 rounded-lg bg-[#17201B] px-4 font-mono text-[12px] text-[#F7FAF1] shadow-[0_18px_42px_-30px_rgba(15,28,21,0.9)] transition-[background-color,transform] hover:bg-[#27392E] active:scale-[0.96]"
            >
              <Plus className="size-4" />
              Add application
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-lg border-[#D4C8B5] bg-[#FEFCF7] px-4 font-mono text-[12px] text-[#17201B] transition-[background-color,transform] hover:bg-[#F1EBDD] active:scale-[0.96]"
              onClick={() => setView("resume")}
            >
              <FileSearch className="size-4" />
              Review resume
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, Icon, helper]) => (
          <section key={label} className="border border-[#DDD3C1] bg-[#FBF8F0] p-4 shadow-[0_18px_46px_-40px_rgba(15,28,21,0.6)]">
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-[11px] uppercase text-[#62675F]">{label}</p>
              <Icon className="size-4 text-[#2F6B4F]" />
            </div>
            <p className="mt-5 font-mono text-[34px] font-semibold leading-none text-[#17201B] tabular-nums">{value}</p>
            <p className="mt-2 text-[12px] leading-5 text-[#62675F]">{helper}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-4">
          <section className="overflow-hidden border border-[#DDD3C1] bg-[#FBF8F0] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
            <SectionHeader title="Pipeline by stage" action={`${data.analytics.totalApplications} total`} icon={<BarChart3 className="size-4 text-[#62675F]" />} />
            <div className="grid gap-4 p-4">
              <div className="flex h-44 items-end gap-2">
                {APPLICATION_STATUSES.map((status) => {
                  const count = data.analytics.byStatus[status];
                  return (
                    <button
                      type="button"
                      key={status}
                      className="group flex h-full flex-1 flex-col justify-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6B4F]"
                      onClick={() => setView("applications")}
                      aria-label={`${status}: ${count} applications`}
                    >
                      <span
                        className={cn(
                          "block w-full bg-[#DBE5D6] transition-[height,background-color,transform] duration-300 group-hover:-translate-y-1 group-hover:bg-[#BFB5A4]",
                          status === "Offer" && "bg-[#2F6B4F]",
                          status === "Technical Interview" && "bg-[#D26F48]",
                          status === "Screening" && "bg-[#D7D8A3]",
                        )}
                        style={{ height: `${Math.max(6, (count / maxStatus) * 100)}%` }}
                      />
                      <span className="mt-3 truncate text-center font-mono text-[11px] text-[#62675F]">{statusMeta[status].label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {APPLICATION_STATUSES.map((status) => (
                  <div key={status} className="flex items-center justify-between border border-[#DDD3C1] bg-[#FEFCF7] px-3 py-2">
                    <span className="flex items-center gap-2 text-[12px] text-[#62675F]">
                      <span className={cn("size-2", statusMeta[status].dot)} />
                      {status}
                    </span>
                    <span className="font-mono text-[12px] text-[#17201B] tabular-nums">{data.analytics.byStatus[status]}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="overflow-hidden border border-[#DDD3C1] bg-[#FBF8F0] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
            <SectionHeader title="Recent movement" />
            <div className="divide-y divide-[#DDD3C1]">
              {data.applications.slice(0, 4).map((application) => (
                <Button
                  key={application.id}
                  variant="ghost"
                  className="group h-auto w-full justify-start gap-4 rounded-none p-4 text-left hover:bg-[#F2ECE0]"
                  onClick={() => {
                    setSelectedApplicationId(application.id);
                    setView("applications");
                  }}
                >
                  <CompanyMark company={application.companyName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-[#17201B]">
                        {application.role} - {application.companyName}
                      </p>
                      <span className="font-mono text-[11px] text-[#62675F]">{application.applicationDate}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-[#62675F]">Moved to {application.status}</p>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-[#87927E] opacity-0 transition-opacity group-hover:opacity-100" />
                </Button>
              ))}
              {!data.applications.length ? (
                <div className="p-3">
                  <EmptyState
                    title="No applications yet"
                    description="Add your first role to start building your pipeline."
                    actionLabel="Add application"
                    onAction={onAdd}
                  />
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="grid gap-4">
          <section className="relative overflow-hidden border border-[#17201B] bg-[#17201B] text-[#F7FAF1] shadow-[0_24px_60px_-42px_rgba(15,28,21,0.75)]">
            <SectionHeader title="AI usage" icon={<ShieldCheck className="size-4 text-[#D7D8A3]" />} tone="dark" />
            <div className="relative z-10 flex items-center gap-4 p-3">
              <QuotaRing quota={quota} />
              <div>
                <p className="text-[14px] font-semibold">{formatAiActionsLeft(quota)}</p>
                <p className="mt-1 text-[12px] leading-5 text-[#BFB5A4]">
                  Resume analysis and interview question generation use AI actions. Manual tracking does not.
                </p>
              </div>
            </div>
            <div className="relative z-10 p-3 pt-0">
              <Button
                variant="outline"
                className="h-10 w-full rounded-lg border-white/12 bg-[#FEFCF7]/8 font-mono text-[12px] text-[#F7FAF1] transition-[background-color,transform] hover:bg-[#FEFCF7]/14 hover:text-[#F7FAF1] active:scale-[0.96]"
                onClick={() => setView("resume")}
              >
                Review resume
              </Button>
            </div>
          </section>

          <section className="overflow-hidden border border-[#DDD3C1] bg-[#FBF8F0] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
            <SectionHeader title="Next actions" icon={<ListChecks className="size-4 text-[#62675F]" />} />
            <div className="grid gap-2 p-3">
              {upcomingFollowUps.length ? (
                upcomingFollowUps.map((application) => (
                  <Button
                    key={application.id}
                    variant="outline"
                    className="h-auto justify-start gap-3 rounded-2xl border-[#DDD3C1] bg-[#FEFCF7]/80 p-3 text-left shadow-[0_12px_28px_-24px_rgba(15,28,21,0.65)] hover:border-[#87927E] hover:bg-[#FEFCF7]"
                    onClick={() => {
                      setSelectedApplicationId(application.id);
                      setView("applications");
                    }}
                  >
                    <div className="grid min-w-20 border-r border-[#DDD3C1] pr-3">
                      <span className="font-mono text-[10px] uppercase text-[#87927E]">Follow-up</span>
                      <span className="mt-1 font-mono text-[11px] text-[#17201B]">{application.followUpDate}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{application.companyName}</p>
                      <p className="mt-1 truncate text-[12px] text-[#62675F]">{application.role}</p>
                    </div>
                  </Button>
                ))
              ) : (
                <EmptyState
                  title="No follow-ups scheduled"
                  description="Add follow-up dates to roles so JobPilot can surface your next actions."
                  actionLabel="Open applications"
                  onAction={() => setView("applications")}
                />
              )}
            </div>
          </section>

          <section className="overflow-hidden border border-[#DDD3C1] bg-[#FBF8F0] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
            <SectionHeader title="First-time checklist" icon={<CheckCircle2 className="size-4 text-[#62675F]" />} />
            <div className="grid gap-2 p-3">
              {firstTimeChecklist.map((item, index) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setView(index < 2 ? "applications" : index === 2 ? "resume" : "interviews")}
                  className="flex items-center gap-3 border border-[#DDD3C1] bg-[#FEFCF7] px-3 py-2 text-left transition-[background-color,transform] hover:bg-[#F1EBDD] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6B4F]"
                >
                  <span className={cn("grid size-6 place-items-center border text-[11px]", checklistState[index] ? "border-[#2F6B4F] bg-[#2F6B4F] text-white" : "border-[#BFB5A4] text-[#62675F]")}>
                    {checklistState[index] ? <CheckCircle2 className="size-3.5" /> : index + 1}
                  </span>
                  <span className="text-[13px] font-medium text-[#17201B]">{item}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ApplicationsView({
  applications,
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter,
  sources,
  form,
  setForm,
  errors,
  formError,
  createApplication,
  updateApplication,
  deleteApplication,
  busyAction,
  addSheetOpen,
  setAddSheetOpen,
}: {
  applications: Application[];
  statusFilter: ApplicationStatus | "All";
  setStatusFilter: (status: ApplicationStatus | "All") => void;
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
  sources: string[];
  form: ApplicationFormState;
  setForm: (form: ApplicationFormState) => void;
  errors: ApplicationFormErrors;
  formError: string | null;
  createApplication: () => void;
  updateApplication: (id: string, patch: Partial<Application>) => Promise<void> | void;
  deleteApplication: (id: string) => void;
  busyAction: string | null;
  addSheetOpen: boolean;
  setAddSheetOpen: (open: boolean) => void;
}) {
  return (
    <div className="grid min-w-0 gap-5">
      <section className="relative overflow-hidden border border-[#DDD3C1] bg-[#FBF8F0] p-4 shadow-[0_24px_70px_-56px_rgba(15,28,21,0.75)] md:p-5">
        <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#62675F]">Applications</p>
            <h1 className="text-[34px] font-semibold leading-[1] text-balance text-[#17201B] md:text-[48px]">
              Track every role in your pipeline.
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-6 text-pretty text-[#62675F]">
              Save company details, status, salary, source, application date, follow-up date, job URL, and notes.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row xl:items-center">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApplicationStatus | "All")}>
              <SelectTrigger aria-label="Filter by application status" className="h-11 rounded-lg border-[#DDD3C1] bg-[#FEFCF7]/88 text-[13px] shadow-[0_14px_30px_-26px_rgba(15,28,21,0.55)] sm:w-48">
                <Filter className="mr-2 size-4 text-[#62675F]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All statuses</SelectItem>
                {APPLICATION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger aria-label="Filter by application source" className="h-11 rounded-lg border-[#DDD3C1] bg-[#FEFCF7]/88 text-[13px] shadow-[0_14px_30px_-26px_rgba(15,28,21,0.55)] sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All sources</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
              <SheetTrigger asChild>
                <Button className="h-11 rounded-lg bg-[#17201B] px-4 font-mono text-[12px] text-[#F7FAF1] shadow-[0_18px_42px_-30px_rgba(15,28,21,0.9)] transition-[background-color,transform] hover:bg-[#27392E] active:scale-[0.96]">
                  <Plus className="size-4" />
                  Add application
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full overflow-y-auto border-[#DDD3C1] bg-[#FBF8F0] sm:max-w-3xl xl:max-w-4xl">
                <SheetHeader className="border-b border-[#DDD3C1] px-5 py-5">
                  <SheetTitle>Add application</SheetTitle>
                  <SheetDescription>Company, role, and status are required. Everything else can be filled in as the role becomes clearer.</SheetDescription>
                </SheetHeader>
                <ApplicationForm
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  formError={formError}
                  onSave={createApplication}
                  onCancel={() => setAddSheetOpen(false)}
                  busy={busyAction === "create-application"}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </section>

      {applications.length === 0 && (statusFilter !== "All" || sourceFilter !== "All") ? (
        <EmptyState
          title="No applications match these filters"
          description="Change the status or source filter to see more roles."
        />
      ) : null}

      <ScrollArea className="h-[calc(100dvh-244px)] min-h-140 w-full max-w-full overflow-hidden border border-[#DDD3C1] bg-[#EDE7DC] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        <div className="flex h-full min-w-max items-start gap-4 pb-4 pr-4">
          {APPLICATION_STATUSES.map((status) => {
            const laneItems = applications.filter((application) => application.status === status);
            return (
              <div
                key={status}
                className={cn(
                  "flex h-full w-81 shrink-0 flex-col overflow-hidden border bg-[#FBF8F0] shadow-[0_18px_44px_-36px_rgba(15,28,21,0.65)]",
                  statusMeta[status].border,
                )}
              >
                <div className={cn("h-1.5 w-full", statusMeta[status].stripe)} />
                <div className="flex min-h-14 items-center justify-between border-b border-[#DDD3C1] bg-[#FEFCF7]/58 px-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2.5 shadow-[0_0_0_4px_rgba(255,255,255,0.9)]", statusMeta[status].dot)} />
                    <p className="text-[14px] font-semibold tracking-[-0.02em] text-[#18181B]">{status}</p>
                  </div>
                  <span className="font-mono text-[11px] text-[#62675F] tabular-nums">{laneItems.length}</span>
                </div>
                <div className="grid gap-3 overflow-y-auto p-3">
                  {laneItems.length ? (
                    laneItems.map((application) => (
                      <ApplicationCard
                        key={application.id}
                        application={application}
                        updateApplication={updateApplication}
                        deleteApplication={deleteApplication}
                        busy={busyAction === `application-${application.id}` || busyAction === `delete-${application.id}`}
                      />
                    ))
                  ) : (
                    <div className="border border-dashed border-[#BFB5A4] bg-[#FEFCF7]/60 p-4 text-[13px] leading-5 text-[#62675F]">
                      <p className="font-semibold text-[#17201B]">No roles here yet</p>
                      <p className="mt-1">Use the status control on a card to move it into {status} when the stage changes.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex h-full w-10 shrink-0 flex-col items-center pt-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Add application"
              className="size-10 rounded-lg border-dashed border-[#87927E] bg-[#FEFCF7]/70 text-[#62675F] hover:bg-[#FEFCF7]"
              onClick={() => setAddSheetOpen(true)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function ApplicationForm({
  form,
  setForm,
  errors,
  formError,
  onSave,
  onCancel,
  busy,
}: {
  form: ApplicationFormState;
  setForm: (form: ApplicationFormState) => void;
  errors: ApplicationFormErrors;
  formError: string | null;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const update = (key: keyof ApplicationFormState, value: string) => setForm({ ...form, [key]: value });
  const statusId = useId();
  const notesId = useId();
  const notesErrorId = useId();
  const saveDisabled = busy || !form.companyName.trim() || !form.role.trim() || !form.status;

  return (
    <div className="grid gap-6 px-5 pb-6 pt-2">
      {formError ? <ErrorNotice message={formError} /> : null}

      <section className="grid gap-4" aria-labelledby="role-details-heading">
        <div>
          <h3 id="role-details-heading" className="text-[15px] font-semibold text-[#17201B]">Role details</h3>
          <p className="mt-1 text-[12px] leading-5 text-[#62675F]">Start with the required company and role. Add optional details when useful.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Field
            label="Company"
            required
            value={form.companyName}
            onChange={(value) => update("companyName", value)}
            placeholder="Acme Studio"
            error={errors.companyName}
          />
          <Field
            label="Role"
            required
            value={form.role}
            onChange={(value) => update("role", value)}
            placeholder="Product Designer"
            error={errors.role}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" value={form.location} onChange={(value) => update("location", value)} placeholder="Remote, New York, or hybrid" error={errors.location} />
          <Field
            label="Salary"
            value={form.salary}
            onChange={(value) => update("salary", sanitizeSalary(value))}
            placeholder="120000"
            inputMode="numeric"
            pattern="[0-9]*"
            error={errors.salary}
          />
        </div>
      </section>

      <section className="grid gap-4" aria-labelledby="source-dates-heading">
        <div>
          <h3 id="source-dates-heading" className="text-[15px] font-semibold text-[#17201B]">Source and dates</h3>
          <p className="mt-1 text-[12px] leading-5 text-[#62675F]">These fields help the dashboard show follow-ups and keep the origin of the role clear.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Source" value={form.sourcePlatform} onChange={(value) => update("sourcePlatform", value)} placeholder="LinkedIn, referral, company site" error={errors.sourcePlatform} />
          <Field label="Job URL" value={form.jobUrl} onChange={(value) => update("jobUrl", value)} placeholder="https://company.com/jobs/role" error={errors.jobUrl} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Application date" type="date" value={form.applicationDate} onChange={(value) => update("applicationDate", value)} error={errors.applicationDate} />
          <Field label="Follow-up date" type="date" value={form.followUpDate} onChange={(value) => update("followUpDate", value)} error={errors.followUpDate} />
        </div>
        <div className="grid gap-2">
          <Label id={statusId} className="font-mono text-[12px] uppercase text-[#62675F]">Status <span aria-hidden="true">*</span></Label>
          <Select value={form.status} onValueChange={(value) => update("status", value)}>
            <SelectTrigger aria-labelledby={statusId} className="h-11 rounded-lg border-[#DDD3C1] bg-[#FEFCF7]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPLICATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status ? <FieldError message={errors.status} /> : null}
        </div>
      </section>

      <section className="grid gap-3" aria-labelledby="application-notes-heading">
        <div>
          <h3 id="application-notes-heading" className="text-[15px] font-semibold text-[#17201B]">Notes</h3>
          <p className="mt-1 text-[12px] leading-5 text-[#62675F]">Capture recruiter names, prep notes, or reminders you do not want to lose.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={notesId} className="font-mono text-[12px] uppercase text-[#62675F]">Notes</Label>
          <Textarea
            id={notesId}
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? notesErrorId : undefined}
            className="min-h-28 rounded-lg border-[#DDD3C1] bg-[#FEFCF7] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          />
          {errors.notes ? <FieldError id={notesErrorId} message={errors.notes} /> : null}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-2 border-t border-[#DDD3C1] bg-[#FBF8F0]/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-11 rounded-lg border-[#DDD3C1] bg-[#FEFCF7] px-4 font-mono text-[12px] text-[#17201B] hover:bg-[#F1EBDD]"
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={saveDisabled}
          className="h-11 rounded-lg bg-[#17201B] px-4 font-mono text-[12px] text-[#F7FAF1] shadow-[0_18px_40px_-30px_rgba(15,28,21,0.9)] transition-[background-color,transform] hover:bg-[#27392E] active:scale-[0.96]"
        >
          {busy ? "Saving" : "Save application"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  pattern,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  error?: string;
  required?: boolean;
}) {
  const fieldId = useId();
  const errorId = useId();

  return (
    <div className="grid gap-2">
      <Label htmlFor={fieldId} className="font-mono text-[12px] uppercase text-[#62675F]">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      <Input
        id={fieldId}
        type={type}
        required={required}
        inputMode={inputMode}
        pattern={pattern}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="h-11 rounded-lg border-[#DDD3C1] bg-[#FEFCF7] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
      />
      {error ? <FieldError id={errorId} message={error} /> : null}
    </div>
  );
}

function ApplicationCard({
  application,
  updateApplication,
  deleteApplication,
  busy,
}: {
  application: Application;
  updateApplication: (id: string, patch: Partial<Application>) => Promise<void> | void;
  deleteApplication: (id: string) => void;
  busy: boolean;
}) {
  return (
    <motion.div
      layout
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={springTransition}
      className={cn(
        "group relative overflow-hidden border bg-[#FEFCF7]/92 p-3 shadow-[0_16px_36px_-32px_rgba(15,28,21,0.7)] transition-[border-color,box-shadow,background-color] duration-200 hover:bg-[#FEFCF7] hover:shadow-[0_24px_52px_-38px_rgba(15,28,21,0.8)]",
        statusMeta[application.status].border,
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1", statusMeta[application.status].stripe)} />
      <div className="mb-3 flex min-w-0 items-start gap-3 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <CompanyMark company={application.companyName} className="size-10 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-[#17201B]">{application.role}</p>
            <p className="mt-1 truncate text-[13px] text-[#62675F]">
              {application.companyName} {application.location ? `- ${application.location}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-[#62675F]">{formatCurrency(application.salary)}</span>
          {application.sourcePlatform ? <span className="font-mono text-[10px] text-[#62675F]">via {application.sourcePlatform}</span> : null}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-[#62675F]">Applied: {application.applicationDate}</span>
          {application.followUpDate ? <span className="font-mono text-[11px] text-[#62675F]">Follow-up: {application.followUpDate}</span> : null}
        </div>
        <Select value={application.status} onValueChange={(value) => updateApplication(application.id, { status: value as ApplicationStatus })}>
          <SelectTrigger
            aria-label={`Status for ${application.role} at ${application.companyName}`}
            className={cn("h-9 rounded-lg border text-[12px]", statusMeta[application.status].border, statusMeta[application.status].wash)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPLICATION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 flex-1 rounded-lg border-[#DDD3C1] bg-[#FEFCF7]/80 font-mono text-[11px] transition-[background-color,border-color,transform] hover:border-[#87927E] hover:bg-[#FEFCF7] active:scale-[0.96]"
              >
                <PanelRightOpen className="size-3.5" />
                Edit details
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto border-[#DDD3C1] bg-[#FBF8F0] sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>{application.companyName}</SheetTitle>
                <SheetDescription>{application.role}</SheetDescription>
              </SheetHeader>
              <ApplicationDetailForm
                key={application.updatedAt}
                application={application}
                updateApplication={updateApplication}
                busy={busy}
              />
            </SheetContent>
          </Sheet>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Delete ${application.role} at ${application.companyName}`}
            className="size-9 rounded-lg border-[#DDD3C1] bg-[#FEFCF7]/80 text-[#62675F] transition-[background-color,border-color,color,transform] hover:border-[#B94A48]/35 hover:bg-[#FFF4F2] hover:text-[#B94A48] active:scale-[0.96]"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Delete ${application.role} at ${application.companyName}? This also removes related resume analyses and interview questions.`)) {
                deleteApplication(application.id);
              }
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function ApplicationDetailForm({
  application,
  updateApplication,
  busy,
}: {
  application: Application;
  updateApplication: (id: string, patch: Partial<Application>) => Promise<void> | void;
  busy: boolean;
}) {
  const [notes, setNotes] = useState(application.notes);
  const [followUpDate, setFollowUpDate] = useState(application.followUpDate ?? "");
  const [saving, setSaving] = useState(false);
  const notesId = useId();
  const isDirty = notes !== application.notes || followUpDate !== (application.followUpDate ?? "");

  async function saveDetails() {
    if (!isDirty) return;

    setSaving(true);
    try {
      await updateApplication(application.id, {
        notes,
        followUpDate: followUpDate || null,
      });
    } finally {
      setSaving(false);
    }
  }

  function resetDraft() {
    setNotes(application.notes);
    setFollowUpDate(application.followUpDate ?? "");
  }

  return (
    <div className="mt-6 grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={notesId} className="font-mono text-[12px] uppercase text-[#62675F]">Notes</Label>
        <Textarea
          id={notesId}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Keep interview signals, contact names, and next steps here."
          className="min-h-36 rounded-lg border-[#DDD3C1] bg-[#FEFCF7] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
        />
      </div>
      <Field label="Follow-up date" type="date" value={followUpDate} onChange={setFollowUpDate} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] leading-5 text-[#62675F]">
          {isDirty ? "Unsaved edits" : "Details are up to date"}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetDraft}
            disabled={!isDirty || saving || busy}
            className="h-10 rounded-lg border-[#DDD3C1] bg-[#FEFCF7] px-4 font-mono text-[12px] text-[#62675F] hover:bg-[#F1EBDD] active:scale-[0.96]"
          >
            Cancel
          </Button>
          <Button
            onClick={saveDetails}
            disabled={!isDirty || saving || busy}
            className="h-10 rounded-lg bg-[#17201B] px-4 font-mono text-[12px] text-[#F7FAF1] hover:bg-[#27392E] active:scale-[0.96]"
          >
            {saving ? "Saving" : "Save details"}
          </Button>
        </div>
      </div>
      <Separator />
      <p className="text-[13px] leading-6 text-[#62675F]">
        Keep notes truthful and specific. Use AI output as draft guidance, not a guarantee of outcomes.
      </p>
    </div>
  );
}

function ResumeView({
  applications,
  selectedApplicationId,
  setSelectedApplicationId,
  resumeText,
  setResumeText,
  jobDescription,
  setJobDescription,
  analyzeResume,
  busy,
  analysis,
  quota,
  importResumePdf,
  resumeFileName,
  resumeFileError,
  resumeFileLoading,
  resumeError,
}: {
  applications: Application[];
  selectedApplicationId: string;
  setSelectedApplicationId: (id: string) => void;
  resumeText: string;
  setResumeText: (value: string) => void;
  jobDescription: string;
  setJobDescription: (value: string) => void;
  analyzeResume: () => void;
  busy: boolean;
  analysis: ResumeAnalysis | null;
  quota: AiQuota;
  importResumePdf: (file: File | null) => void | Promise<void>;
  resumeFileName: string;
  resumeFileError: string | null;
  resumeFileLoading: boolean;
  resumeError: string | null;
}) {
  const selectedApplication = applications.find((application) => application.id === selectedApplicationId);
  const targetApplicationId = useId();
  const jobDescriptionId = useId();
  const resumeFileId = useId();
  const resumeTextId = useId();
  const canAnalyze = !busy && quota.remaining > 0 && resumeText.trim().length >= 80 && jobDescription.trim().length >= 80;

  return (
    <div className="grid gap-5">
      <section className="relative overflow-hidden border border-[#17201B] bg-[#17201B] p-5 text-[#F7FAF1] shadow-[0_28px_80px_-54px_rgba(7,24,14,0.9)]">
        <div className="relative grid gap-5 xl:grid-cols-[1fr_420px] xl:items-end">
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#D7D8A3]">Resume Analyzer</p>
            <h1 className="max-w-2xl text-[34px] font-semibold leading-[1] text-balance md:text-[52px]">
              Compare your resume against one role.
            </h1>
            <p className="mt-4 max-w-xl text-[14px] leading-6 text-pretty text-[#BFB5A4]">
              Paste a job description and resume to find keyword gaps, rewrite bullets, and get focused feedback.
            </p>
          </div>
          <div className="border border-white/12 bg-[#FEFCF7]/8 p-3 backdrop-blur">
            <p id={targetApplicationId} className="mb-2 font-mono text-[11px] uppercase text-[#BFB5A4]">Target application</p>
            <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
              <SelectTrigger aria-labelledby={targetApplicationId} className="h-12 rounded-lg border-white/12 bg-[#F7FAF1] text-[13px] text-[#17201B]">
                <SelectValue placeholder="Select application" />
              </SelectTrigger>
              <SelectContent>
                {applications.map((application) => (
                  <SelectItem key={application.id} value={application.id}>
                    {application.role} at {application.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-[12px] leading-5 text-[#BFB5A4]">Selecting an application links the saved analysis to that role.</p>
            <div className="mt-3 flex items-center gap-3 bg-black/12 p-3">
              <CompanyMark company={selectedApplication?.companyName ?? "JobPilot"} className="border-white/15 bg-[#FEFCF7]/12 text-[#F7FAF1]" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{selectedApplication?.companyName ?? "No application selected"}</p>
                <p className="truncate text-[12px] text-[#BFB5A4]">{selectedApplication?.role ?? "Add an application to anchor the scan."}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {quota.remaining <= 0 ? <QuotaBlocked /> : null}

      <div className="grid gap-5 xl:grid-cols-[0.84fr_1.16fr]">
        <section className="overflow-hidden border border-[#DDD3C1] bg-[#FBF8F0] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
          <SectionHeader title="Analysis context" icon={<FileText className="size-4 text-[#62675F]" />} />
          <div className="grid gap-4 p-4">
            {resumeError ? <ErrorNotice message={resumeError} /> : null}
            <div className="border border-[#DDD3C1] bg-[#F1EBDD] p-3 text-[13px] leading-6 text-[#62675F]">
              Analyze resume uses 1 AI action. Text is extracted from PDF before analysis, and manual paste stays available.
            </div>
            <div className="grid gap-2">
              <Label htmlFor={jobDescriptionId} className="font-mono text-[12px] uppercase text-[#62675F]">Job description</Label>
              <Textarea
                id={jobDescriptionId}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the target job description here."
                className="min-h-40 rounded-lg border-[#DDD3C1] bg-[#FEFCF7] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={resumeTextId} className="font-mono text-[12px] uppercase text-[#62675F]">Resume content</Label>
              <div className="border border-dashed border-[#BFB5A4] bg-[#FEFCF7]/72 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center bg-[#EEE7D8] text-[#17201B]">
                      {resumeFileLoading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#17201B]">Upload resume PDF</p>
                      <p className="mt-1 text-[12px] leading-5 text-[#62675F]">
                        Text is extracted into the resume field before analysis.
                      </p>
                    </div>
                  </div>
                  <Input
                    id={resumeFileId}
                    type="file"
                    accept="application/pdf,.pdf"
                    aria-label="Upload resume PDF"
                    disabled={resumeFileLoading}
                    onChange={(event) => {
                      void importResumePdf(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                    className="h-11 rounded-lg border-[#DDD3C1] bg-[#FBF8F0] text-[13px] file:mr-3 file:rounded-md file:bg-[#17201B] file:px-3 file:text-[#F7FAF1] sm:max-w-72"
                  />
                </div>
                {resumeFileName ? (
                  <p className="mt-3 bg-[#F1EBDD] px-3 py-2 font-mono text-[11px] text-[#62675F]">{resumeFileName}</p>
                ) : null}
                {resumeFileError ? <div className="mt-3"><FieldError message={resumeFileError} /></div> : null}
              </div>
              <Textarea
                id={resumeTextId}
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="Paste current resume text here."
                className="min-h-64 rounded-lg border-[#DDD3C1] bg-[#FEFCF7] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
              />
            </div>
          </div>
          <div className="border-t border-[#DDD3C1] bg-[#F2ECE0] p-3">
            <Button
              onClick={analyzeResume}
              disabled={!canAnalyze}
              className="h-11 w-full rounded-lg bg-[#17201B] font-mono text-[12px] text-[#F7FAF1] shadow-[0_18px_42px_-30px_rgba(15,28,21,0.9)] transition-[background-color,transform] hover:bg-[#27392E] active:scale-[0.96]"
            >
              <FileSearch className="size-4" />
              {busy ? "Analyzing" : "Analyze resume"}
            </Button>
            {!canAnalyze && quota.remaining > 0 && !busy ? (
              <p className="mt-2 text-center text-[12px] leading-5 text-[#62675F]">Paste at least 80 characters for both the job description and resume.</p>
            ) : null}
          </div>
        </section>
        <section className="overflow-hidden border border-[#DDD3C1] bg-[#FBF8F0] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
          <SectionHeader title="Analysis results" icon={<BarChart3 className="size-4 text-[#62675F]" />} />
          <div className="p-4">
            {busy ? (
              <AnalysisSkeleton />
            ) : analysis ? (
              <AnalysisPanel analysis={analysis} />
            ) : (
              <EmptyState
                title="No analysis yet"
                description="Paste a job description and resume to get keyword gaps, strong matches, and rewrite suggestions."
                actionLabel="Analyze resume"
                onAction={canAnalyze ? analyzeResume : undefined}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-36 w-full rounded-lg" />
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: ResumeAnalysis }) {
  return (
    <div className="grid gap-5">
      <div className="relative overflow-hidden bg-[#17201B] p-5 text-[#F7FAF1]">
        <div className="relative flex items-center gap-5">
          <div className="grid size-20 place-items-center border border-[#D7D8A3]/35 bg-[#D7D8A3] shadow-[0_18px_42px_-28px_rgba(221,232,95,0.9)]">
            <span className="font-mono text-[28px] font-semibold text-[#17201B]">{analysis.score}</span>
          </div>
          <div>
            <p className="text-[15px] font-semibold">ATS match score</p>
            <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#BFB5A4]">{analysis.finalRecommendation}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <InsightList title="Missing keywords" items={analysis.missingKeywords} tone="risk" />
        <InsightList title="Strengths" items={analysis.strengths} tone="success" />
      </div>
      <InsightList title="Suggested improvements" items={analysis.suggestions} />
      <InsightList title="Suggested experience bullets" items={analysis.rewrittenBullets} />
    </div>
  );
}

function InsightList({
  title,
  items,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  tone?: "neutral" | "risk" | "success";
}) {
  if (tone !== "neutral") {
    return (
      <div className="border border-[#DDD3C1] bg-[#FEFCF7]/74 p-3">
        <p className="border-b border-[#DDD3C1] pb-2 font-mono text-[12px] font-medium uppercase text-[#62675F]">{title}</p>
        <div className="mt-2 grid gap-2">
          {items.map((item) => (
            <div
              key={item}
              className={cn(
                "border-l-2 bg-[#F1EBDD] px-3 py-2 text-[12px] leading-5",
                tone === "risk" && "border-[#B94A48] bg-[#FFF4F2] text-[#93000A]",
                tone === "success" && "border-[#2F6B4F] bg-[#EBF7EF] text-[#2F6B4F]",
              )}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#DDD3C1] bg-[#FEFCF7]/74 p-3">
      <p className="border-b border-[#DDD3C1] pb-2 font-mono text-[12px] font-medium uppercase text-[#62675F]">{title}</p>
      <div className="mt-2 grid gap-2">
        {items.map((item) => (
          <div key={item} className="border border-[#DDD3C1] bg-[#F1EBDD] p-3 text-[13px] leading-6 text-[#3B4B40]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function InterviewView({
  applications,
  selectedApplicationId,
  setSelectedApplicationId,
  questions,
  generateInterviewQuestions,
  updateQuestion,
  busy,
  quota,
}: {
  applications: Application[];
  selectedApplicationId: string;
  setSelectedApplicationId: (id: string) => void;
  questions: InterviewQuestion[];
  generateInterviewQuestions: () => void;
  updateQuestion: (id: string, patch: Partial<InterviewQuestion>) => Promise<void> | void;
  busy: boolean;
  quota: AiQuota;
}) {
  const grouped = QUESTION_CATEGORIES.map((category) => ({
    category,
    questions: questions.filter((question) => question.category === category && (!selectedApplicationId || question.applicationId === selectedApplicationId)),
  }));
  const selectedApplication = applications.find((application) => application.id === selectedApplicationId);
  const canGenerate = Boolean(selectedApplication) && quota.remaining > 0 && !busy;

  return (
    <div className="grid gap-5">
      <section className="relative overflow-hidden border border-[#DDD3C1] bg-[#FBF8F0] p-4 shadow-[0_24px_70px_-56px_rgba(15,28,21,0.75)] md:p-5">
        <div className="relative grid gap-5 xl:grid-cols-[1fr_470px] xl:items-end">
          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#62675F]">Interview Prep</p>
            <h1 className="text-[34px] font-semibold leading-[1] text-balance text-[#17201B] md:text-[48px]">
              Prepare for interviews with role-specific questions.
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-6 text-pretty text-[#62675F]">
              Generate practice questions, mark answers as rehearsed, and keep notes beside each role.
            </p>
          </div>
          <div className="border border-[#DDD3C1] bg-[#FEFCF7]/72 p-3 shadow-[0_18px_40px_-34px_rgba(15,28,21,0.68)]">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
                <SelectTrigger aria-label="Select application for interview prep" className="h-11 rounded-lg border-[#DDD3C1] bg-[#FEFCF7] text-[13px]">
                  <SelectValue placeholder="Select application" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((application) => (
                    <SelectItem key={application.id} value={application.id}>
                      {application.role} at {application.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={generateInterviewQuestions}
                disabled={!canGenerate}
                className="h-11 rounded-lg bg-[#17201B] px-4 font-mono text-[12px] text-[#F7FAF1] transition-[background-color,transform] hover:bg-[#27392E] active:scale-[0.96]"
              >
                <ClipboardList className="size-4" />
                {busy ? "Generating" : "Generate questions"}
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-3 bg-[#F1EBDD] p-3">
              <CompanyMark company={selectedApplication?.companyName ?? "JobPilot"} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{selectedApplication?.companyName ?? "No application selected"}</p>
                <p className="truncate text-[12px] text-[#62675F]">{selectedApplication?.role ?? "Pick a role before generating prompts."}</p>
              </div>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-[#62675F]">Generating questions uses 1 AI action. Notes and practiced checkboxes do not.</p>
          </div>
        </div>
      </section>

      {quota.remaining <= 0 ? <QuotaBlocked /> : null}

      {!applications.length ? (
        <EmptyState
          title="Add an application before interview prep"
          description="Interview questions are generated from a saved role, so add the company and role first."
        />
      ) : null}

      <div className="grid gap-4">
        {grouped.map((group) => (
          <section
            key={group.category}
            className="overflow-hidden border border-[#DDD3C1] bg-[#FBF8F0] shadow-[0_24px_60px_-50px_rgba(15,28,21,0.68)]"
          >
            <SectionHeader title={group.category} />
            <div className="grid gap-3 bg-[#F2ECE0] p-3 md:grid-cols-2 xl:grid-cols-3">
              {group.questions.length ? (
                group.questions.map((question) => (
                  <InterviewQuestionCard
                    key={`${question.id}-${question.updatedAt}`}
                    question={question}
                    updateQuestion={updateQuestion}
                  />
                ))
              ) : (
                <EmptyState
                  title="No questions yet"
                  description={selectedApplication ? "Generate role-specific questions for the selected application." : "Select an application before generating questions."}
                  actionLabel={selectedApplication ? "Generate questions" : undefined}
                  onAction={canGenerate ? generateInterviewQuestions : undefined}
                />
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function InterviewQuestionCard({
  question,
  updateQuestion,
}: {
  question: InterviewQuestion;
  updateQuestion: (id: string, patch: Partial<InterviewQuestion>) => Promise<void> | void;
}) {
  const [answerNotes, setAnswerNotes] = useState(question.answerNotes);
  const [saving, setSaving] = useState(false);
  const answerNotesId = useId();
  const isDirty = answerNotes !== question.answerNotes;

  async function saveAnswerNotes() {
    if (!isDirty) return;

    setSaving(true);
    try {
      await updateQuestion(question.id, { answerNotes });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3 border border-[#DDD3C1] bg-[#FEFCF7]/90 p-3 shadow-[0_16px_36px_-34px_rgba(15,28,21,0.7)] transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-[#87927E] hover:shadow-[0_24px_52px_-40px_rgba(15,28,21,0.85)]">
      <div className="flex gap-3">
        <Checkbox
          checked={question.practiced}
          aria-label={`Mark question as ${question.practiced ? "not practiced" : "practiced"}`}
          onCheckedChange={(checked) => updateQuestion(question.id, { practiced: checked === true })}
          className="mt-1"
        />
        <p className={cn("text-[13px] leading-5 text-[#17201B]", question.practiced && "text-[#62675F] line-through")}>
          {question.question}
        </p>
      </div>
      <div className="w-fit border border-[#DDD3C1] bg-[#F1EBDD] px-2 py-1 font-mono text-[10px] uppercase text-[#62675F]">
        {question.practiced ? "Practiced" : "Needs work"}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={answerNotesId} className="font-mono text-[12px] uppercase text-[#62675F]">Answer notes</Label>
        <Textarea
          id={answerNotesId}
          value={answerNotes}
          onChange={(event) => setAnswerNotes(event.target.value)}
          placeholder="Answer notes"
          className="min-h-24 rounded-lg border-[#DDD3C1] bg-[#FBF8F0]"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#62675F]">{isDirty ? "Unsaved notes" : "Saved"}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={saveAnswerNotes}
            disabled={!isDirty || saving}
            className="h-9 rounded-lg border-[#DDD3C1] bg-[#FEFCF7]/80 px-3 font-mono text-[11px] hover:bg-[#FEFCF7] active:scale-[0.96]"
          >
            {saving ? "Saving" : "Save notes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingsView({
  guest,
  quota,
  name,
  setName,
  saveName,
  clearAllData,
  clearingData,
  startOnboarding,
}: {
  guest: Guest | null;
  quota: AiQuota;
  name: string;
  setName: (name: string) => void;
  saveName: () => void;
  clearAllData: () => void;
  clearingData: boolean;
  startOnboarding: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState("");

  return (
    <div className="grid w-full gap-5">
      <section className="relative overflow-hidden border border-[#17201B] bg-[#17201B] p-5 text-[#F7FAF1] shadow-[0_28px_80px_-54px_rgba(7,24,14,0.9)]">
        <div className="relative">
          <div className="mb-4 flex h-12 w-40 items-center">
            <Image src="/brand/logo-complete.svg" alt={APP_CONFIG.name} width={154} height={50} className="h-auto w-full brightness-0 invert" />
          </div>
          <h1 className="max-w-2xl text-[34px] font-semibold leading-[1] text-balance md:text-[52px]">
            Manage your demo workspace.
          </h1>
          <p className="mt-4 max-w-xl text-[14px] leading-6 text-pretty text-[#BFB5A4]">
            Update your display name, check AI usage, replay onboarding, or clear local data.
          </p>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden border border-[#DDD3C1] bg-[#FBF8F0] shadow-[0_24px_60px_-50px_rgba(15,28,21,0.68)]">
          <SectionHeader title="Workspace identity" icon={<UserRound className="size-4 text-[#62675F]" />} />
          <div className="grid gap-4 p-4">
            <div className="border border-[#DDD3C1] bg-[#F1EBDD] p-3">
              <p className="font-mono text-[11px] uppercase text-[#62675F]">Current workspace</p>
              <p className="mt-2 text-[18px] font-semibold text-[#17201B]">{guest?.name ?? "Guest"}</p>
            </div>
            <Field label="Display name" value={name || guest?.name || ""} onChange={setName} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={saveName}
                className="h-11 w-fit rounded-lg bg-[#17201B] px-5 font-mono text-[12px] text-[#F7FAF1] hover:bg-[#27392E] active:scale-[0.96]"
              >
                Save name
              </Button>
              <Button
                variant="outline"
                onClick={startOnboarding}
                className="h-11 w-fit rounded-lg border-[#DDD3C1] bg-[#FEFCF7] px-5 font-mono text-[12px] text-[#17201B] hover:bg-[#F1EBDD] active:scale-[0.96]"
              >
                Replay walkthrough
              </Button>
            </div>
          </div>
        </section>
        <section className="overflow-hidden border border-[#DDD3C1] bg-[#FBF8F0] shadow-[0_24px_60px_-50px_rgba(15,28,21,0.68)]">
          <SectionHeader title="AI usage" icon={<Clock3 className="size-4 text-[#62675F]" />} />
          <div className="p-4">
            <div>
              <p className="font-mono text-[42px] font-semibold leading-none tracking-[-0.04em] text-[#17201B] tabular-nums">
                {quota.used}/{quota.limit}
              </p>
              <p className="mt-2 text-[13px] text-[#62675F]">
                {formatAiActionsLeft(quota)}
              </p>
            </div>
            <Progress value={getQuotaProgressValue(quota)} className="mt-5 h-2" />
            <p className="mt-4 border border-[#DDD3C1] bg-[#F1EBDD] p-3 text-[13px] leading-6 text-[#62675F]">
              Guest mode includes {quota.limit} AI actions per day in this browser. Resume analysis and interview question generation use AI actions. Manual tracking still works after the limit.
            </p>
          </div>
        </section>
      </div>
      <section className="overflow-hidden border border-[#E3AAA8] bg-[#FFF4F2] shadow-[0_24px_60px_-50px_rgba(80,20,18,0.35)]">
        <SectionHeader title="Local data" icon={<Database className="size-4 text-[#68413F]" />} />
        <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#17201B]">Clear this workspace</p>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#68413F]">
              Deletes applications, resume analyses, interview notes, activity entries, and the current guest name from the local JSON file. Daily AI usage records are retained for abuse prevention.
            </p>
          </div>
          <Dialog onOpenChange={(open) => {
            if (!open) setConfirmClear("");
          }}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-11 rounded-lg border-[#B94A48]/35 bg-[#FEFCF7]/70 px-4 font-mono text-[12px] text-[#93000A] hover:bg-[#FEFCF7] hover:text-[#93000A] active:scale-[0.96]"
              >
                <Trash2 className="size-4" />
                Clear workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-lg border-[#E3AAA8] bg-[#FFF9F7] shadow-[0_32px_80px_-42px_rgba(80,20,18,0.6)]">
              <DialogHeader>
                <div className="mb-1 grid size-11 place-items-center bg-[#FFF4F2] text-[#B94A48]">
                  <AlertTriangle className="size-5" />
                </div>
                <DialogTitle>Clear workspace data?</DialogTitle>
                <DialogDescription className="text-[#68413F]">
                  This removes workspace records and signs out the current browser session. Daily AI quota records are retained for abuse prevention.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="confirm-clear" className="font-mono text-[12px] uppercase text-[#68413F]">Type CLEAR to confirm</Label>
                <Input
                  id="confirm-clear"
                  value={confirmClear}
                  onChange={(event) => setConfirmClear(event.target.value)}
                  className="h-11 rounded-lg border-[#E3AAA8] bg-[#FEFCF7]"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    className="h-11 rounded-lg border-[#DDD3C1] bg-[#FEFCF7] px-4 font-mono text-[12px] text-[#17201B] hover:bg-[#F1EBDD]"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={clearAllData}
                  disabled={clearingData || confirmClear !== "CLEAR"}
                  className="h-11 rounded-lg bg-[#B94A48] px-4 font-mono text-[12px] text-white hover:bg-[#9F3836] active:scale-[0.96]"
                >
                  {clearingData ? "Clearing" : "Clear workspace"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  action,
  icon,
  tone = "light",
}: {
  title: string;
  action?: string;
  icon?: React.ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "flex h-12 items-center justify-between border-b px-4",
        tone === "light" && "border-[#DDD3C1] bg-[#FEFCF7]/58",
        tone === "dark" && "border-white/10 bg-[#FEFCF7]/4",
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <h2 className={cn("text-[14px] font-semibold tracking-[-0.02em]", tone === "light" ? "text-[#17201B]" : "text-[#F7FAF1]")}>
          {title}
        </h2>
      </div>
      {action ? <span className={cn("font-mono text-[11px]", tone === "light" ? "text-[#62675F]" : "text-[#BFB5A4]")}>{action}</span> : null}
    </div>
  );
}

function CompanyMark({ company, className }: { company: string; className?: string }) {
  return (
    <div
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg border border-[#DDD3C1] bg-[#F1EBDD] font-mono text-[10px] font-bold text-[#17201B]",
        className,
      )}
    >
      {initials(company).slice(0, 2) || "JP"}
    </div>
  );
}

function QuotaRing({ quota }: { quota: AiQuota }) {
  const value = getQuotaProgressValue(quota, "remaining");

  return (
    <div className="relative size-16 shrink-0">
      <svg className="size-full -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-[#E6E8EA]"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="text-[#2F6B4F]"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeDasharray={`${value}, 100`}
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-mono text-[13px] font-semibold tabular-nums">
        {quota.remaining}/{quota.limit}
      </div>
    </div>
  );
}

function QuotaBlocked() {
  return (
    <div className="flex items-start gap-3 border border-[#B94A48]/30 bg-[#FFF4F2] p-3 text-[13px] leading-6 text-[#B94A48]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>You have used today&apos;s AI actions. You can still add applications, update notes, and manage follow-ups.</span>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 border border-[#B94A48]/30 bg-[#FFF4F2] p-3 text-[13px] leading-5 text-[#B94A48]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} role="alert" className="text-[12px] leading-5 text-[#B94A48]">
      {message}
    </p>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="border border-dashed border-[#BFB5A4] bg-[#F1EBDD] p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center bg-[#FEFCF7] text-[#2F6B4F]">
          <ListChecks className="size-4" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[#17201B]">{title}</p>
          <p className="mt-1 text-[13px] leading-5 text-pretty text-[#62675F]">{description}</p>
        </div>
      </div>
      {actionLabel && onAction ? (
        <Button
          type="button"
          variant="outline"
          onClick={onAction}
          className="h-10 rounded-lg border-[#BFB5A4] bg-[#FEFCF7] px-3 font-mono text-[11px] text-[#17201B] hover:bg-[#FBF8F0] active:scale-[0.96]"
        >
          {actionLabel}
          <ArrowRight className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
