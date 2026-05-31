"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  Menu,
  PanelRightOpen,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
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
    dot: "bg-[#91A99A]",
    border: "border-[#D8E3D4]",
    label: "Queued",
    stripe: "bg-[#91A99A]",
    wash: "bg-[#F4F8EF]",
  },
  Applied: {
    dot: "bg-[#8EB0D6]",
    border: "border-[#C8D9E8]",
    label: "Sent",
    stripe: "bg-[#8EB0D6]",
    wash: "bg-[#F1F6FA]",
  },
  Screening: {
    dot: "bg-[#DDE85F]",
    border: "border-[#D5E5C2]",
    label: "Screen",
    stripe: "bg-[#DDE85F]",
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
    dot: "bg-[#53675A]",
    border: "border-[#BFD1C4]",
    label: "HR",
    stripe: "bg-[#53675A]",
    wash: "bg-[#F0F5EF]",
  },
  Offer: {
    dot: "bg-[#1B7A4E]",
    border: "border-[#91C3A8]",
    label: "Offer",
    stripe: "bg-[#1B7A4E]",
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
    title: "Start with a calm overview.",
    body: "The dashboard gives you the current shape of your search: open roles, follow-ups, interview progress, and AI usage. Check it when you need direction.",
    outcome: "You will always know what needs attention next.",
  },
  {
    view: "applications",
    title: "Add each opportunity once.",
    body: "Capture the company, role, source, salary, dates, and notes while the details are fresh. Move cards only when the stage changes.",
    outcome: "Your board stays accurate without turning into extra admin work.",
  },
  {
    view: "resume",
    title: "Use resume feedback carefully.",
    body: "Paste a role description and your resume, or upload a PDF. JobPilot points out gaps and draft improvements, but you stay in control of what you use.",
    outcome: "You get sharper edits without overstating your experience.",
  },
  {
    view: "interviews",
    title: "Prepare for the next conversation.",
    body: "Generate role-specific practice prompts, mark what you have rehearsed, and keep rough notes beside each question.",
    outcome: "Preparation becomes trackable instead of scattered.",
  },
  {
    view: "settings",
    title: "Keep the workspace under your control.",
    body: "Settings holds your display name, AI quota, and workspace controls. You can clear application data whenever you need a clean start.",
    outcome: "No account is required, and your local data remains visible to you.",
  },
] as const satisfies ReadonlyArray<{ view: View; title: string; body: string; outcome: string }>;

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

function formatAiActionLimit(limit: number) {
  return `${limit} AI ${limit === 1 ? "action" : "actions"}`;
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
      await readJson<{ question: InterviewQuestion }>(
        await fetch(`/api/interview-questions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }),
      );
      await refreshData();
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
    <div className="relative min-h-dvh overflow-hidden bg-[#0F1C15] text-[#17201B]">
      <Dialog open={!guest}>
        <DialogContent className="overflow-hidden rounded-2xl border-[#DDE6D7] bg-[#F8FAF3] shadow-[0_32px_80px_-38px_rgba(7,24,14,0.75)] sm:max-w-110">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#1B7A4E]" />
          <DialogHeader>
            <div className="mb-4 flex h-12 w-40 items-center">
              <Image src="/brand/logo-complete.svg" alt={APP_CONFIG.name} width={154} height={50} className="h-auto w-full" priority />
            </div>
            <DialogTitle className="text-[22px] tracking-[-0.04em]">Name your workspace</DialogTitle>
            <DialogDescription className="text-[#53675A]">
              No account required. This browser gets its own JobPilot workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="guest-name" className="font-mono text-[12px] uppercase text-[#64748B]">
              Display name
            </Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={APP_CONFIG.defaultGuestNamePlaceholder}
              className="h-11 rounded-xl border-[#DDE6D7] bg-white"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={saveName}
              disabled={busyAction === "name" || !name.trim()}
              className="h-11 rounded-xl bg-[#1B7A4E] font-mono text-[12px] shadow-[0_16px_28px_-18px_rgba(27,122,78,0.9)] hover:bg-[#155F3D] active:scale-[0.98]"
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
        <aside className="hidden border-r border-white/10 bg-[#102018]/95 text-[#F7FAF1] shadow-[22px_0_70px_-48px_rgba(0,0,0,0.9)] lg:block">
          {nav}
        </aside>
        <main className="min-w-0 bg-[#EEF3EA] lg:rounded-l-[28px] lg:shadow-[-18px_0_60px_-42px_rgba(0,0,0,0.85)]">
          <TopBar
            guest={guest}
            quota={normalizedQuota}
            search={search}
            setSearch={setSearch}
            mobileNavOpen={mobileNavOpen}
            setMobileNavOpen={setMobileNavOpen}
          />
          {mobileNavOpen ? <div className="border-b border-[#DDE6D7] bg-[#102018] text-[#F7FAF1] lg:hidden">{nav}</div> : null}
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
                    setAddSheetOpen={setAddSheetOpen}
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
                    analysis={activeAnalysis ?? data.analyses[0] ?? null}
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

const landingFlow = [
  {
    title: "Capture the lead",
    description: "Company, role, salary, source, and follow-up date live in one quiet record.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Read the route",
    description: "A board view keeps every stage visible without turning tracking into busywork.",
    icon: Compass,
  },
  {
    title: "Spend AI carefully",
    description: "Resume checks and interview prompts stay capped so the public demo remains usable.",
    icon: ShieldCheck,
  },
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
        className="overflow-hidden rounded-[30px] border-[#D8E3D4] bg-[#F8FAF3] p-0 shadow-[0_34px_90px_-42px_rgba(7,24,14,0.82)] sm:max-w-2xl"
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
                    index === step ? "bg-white/12 text-[#F7FAF1]" : "text-[#91A99A] hover:bg-white/8 hover:text-[#F7FAF1]",
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
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#53675A]">
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
                  <DialogDescription className="mt-4 text-[14px] leading-7 text-[#53675A]">{current.body}</DialogDescription>
                  <div className="mt-5 border-l-2 border-[#1B7A4E] bg-[#EEF6E9] px-4 py-3 text-[13px] leading-6 text-[#2F5D41]">
                    {current.outcome}
                  </div>
                </motion.div>
              </AnimatePresence>
            </DialogHeader>
            <div className="mt-6 flex items-center gap-2">
              {onboardingSteps.map((item, index) => (
                <span key={item.title} className={cn("h-1.5 flex-1 rounded-full bg-[#D8E3D4]", index <= step && "bg-[#1B7A4E]")} />
              ))}
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={onFinish}
                disabled={busy}
                className="h-11 rounded-2xl border-[#D8E3D4] bg-white px-4 font-mono text-[12px] text-[#53675A] hover:bg-[#F4F8EF]"
              >
                Skip walkthrough
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onBack}
                  disabled={step === 0 || busy}
                  className="h-11 rounded-2xl border-[#D8E3D4] bg-white px-4 font-mono text-[12px] text-[#17201B] hover:bg-[#F4F8EF]"
                >
                  Back
                </Button>
                <Button
                  onClick={isLast ? onFinish : onNext}
                  disabled={busy}
                  className="h-11 rounded-2xl bg-[#17201B] px-4 font-mono text-[12px] text-[#F7FAF1] hover:bg-[#2A4033] active:scale-[0.98]"
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
  const scrollToFlow = () => document.getElementById("landing-flow")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-dvh bg-[#EEF3EA] text-[#17201B]">
      <section className="relative min-h-[84dvh] overflow-hidden bg-[#0F1C15] text-[#F7FAF1]">
        <Image
          src="/landing/jobpilot-command-desk.png"
          alt="Career planning desk with laptop and application cards"
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-[#07180E]/64" />
        <div className="relative mx-auto flex min-h-[84dvh] max-w-375 flex-col px-4 pb-10 pt-5 md:px-7">
          <div className="landing-reveal flex items-center justify-between gap-4">
            <div className="flex h-12 w-44 items-center md:w-56">
              <Image src="/brand/logo-complete.svg" alt={APP_CONFIG.name} width={214} height={69} className="h-auto w-full brightness-0 invert" priority />
            </div>
            <Button
              onClick={onStart}
              className="group h-11 rounded-full bg-[#DDE85F] pl-5 pr-1.5 font-mono text-[12px] text-[#17201B] shadow-[0_18px_42px_-30px_rgba(10,20,14,0.95)] transition-[background-color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#E9F277] active:scale-[0.96]"
            >
              Open workspace
              <span className="grid size-8 place-items-center rounded-full bg-[#17201B] text-[#F7FAF1] transition-[transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowRight className="size-3.5" strokeWidth={1.5} />
              </span>
            </Button>
          </div>

          <div className="grid flex-1 content-end pb-6 pt-16 md:pb-12">
            <div className="landing-reveal max-w-3xl" style={{ animationDelay: "120ms" }}>
              <h1 className="max-w-3xl text-[56px] font-semibold leading-[0.9] tracking-[-0.07em] text-balance md:text-[92px]">
                JobPilot AI
              </h1>
              <p className="mt-6 max-w-2xl text-[16px] leading-7 text-[#D7E4DA] md:text-[18px]">
                A public demo for tracking applications, tightening resumes, planning follow-ups, and practicing interviews without account friction.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={onStart}
                  className="group h-13 rounded-full bg-[#F7FAF1] pl-6 pr-1.5 font-mono text-[12px] text-[#17201B] shadow-[0_22px_52px_-36px_rgba(0,0,0,0.95)] transition-[background-color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white active:scale-[0.96]"
                >
                  Start with your name
                  <span className="grid size-9 place-items-center rounded-full bg-[#DDE85F] transition-[transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 group-hover:-translate-y-0.5">
                    <ArrowRight className="size-4" strokeWidth={1.5} />
                  </span>
                </Button>
                <Button
                  variant="outline"
                  onClick={scrollToFlow}
                  className="h-13 rounded-full border-white/16 bg-[#0F1C15]/56 px-6 font-mono text-[12px] text-[#F7FAF1] transition-[background-color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#17201B]/72 hover:text-[#F7FAF1] active:scale-[0.96]"
                >
                  See how it works
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="landing-flow" className="px-4 py-24 md:px-7 md:py-28">
        <div className="mx-auto grid max-w-375 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="landing-reveal lg:sticky lg:top-8">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#53675A]">Built for the messy middle</p>
            <h2 className="max-w-xl text-[38px] font-semibold leading-[0.98] tracking-[-0.06em] text-balance md:text-[58px]">
              A landing page first, then the workspace.
            </h2>
            <p className="mt-5 max-w-lg text-[15px] leading-7 text-[#53675A]">
              Visitors get the product promise before they enter the tracker. The dashboard stays one click away, and the name prompt only appears when they choose to start.
            </p>
          </div>

          <div className="grid gap-4">
            {landingFlow.map(({ title, description, icon: Icon }, index) => (
              <div
                key={title}
                className="landing-reveal rounded-[30px] border border-[#D8E3D4] bg-[#F9FBF4] p-2 shadow-[0_24px_60px_-52px_rgba(15,28,21,0.7)]"
                style={{ animationDelay: `${180 + index * 100}ms` }}
              >
                <div className="grid gap-5 rounded-[24px] bg-white/76 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="grid size-12 place-items-center rounded-2xl bg-[#17201B] text-[#F7FAF1]">
                    <Icon className="size-5" strokeWidth={1.4} />
                  </div>
                  <div>
                    <p className="text-[20px] font-semibold tracking-[-0.04em] text-[#17201B]">{title}</p>
                    <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#53675A]">{description}</p>
                  </div>
                  <span className="hidden h-px w-14 bg-[#C9D8C5] md:block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 md:px-7 md:pb-28">
        <div className="mx-auto max-w-375 overflow-hidden rounded-[34px] border border-[#17201B] bg-[#17201B] p-3 text-[#F7FAF1] shadow-[0_30px_82px_-62px_rgba(15,28,21,0.88)]">
          <div className="grid gap-8 rounded-[28px] bg-[#102018] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:grid-cols-[1fr_0.85fr] lg:items-center lg:p-7">
            <div>
              <div className="mb-5 flex h-10 w-32 items-center">
                <Image src="/brand/logo-complete.svg" alt={APP_CONFIG.name} width={154} height={50} className="h-auto w-full brightness-0 invert" />
              </div>
              <h2 className="max-w-2xl text-[34px] font-semibold leading-[1] tracking-[-0.06em] text-balance md:text-[52px]">
                Start clean. Keep the job hunt readable.
              </h2>
              <p className="mt-4 max-w-xl text-[14px] leading-7 text-[#BFD1C4]">
                The first screen sets context. The workspace handles the details: board stages, resume diagnostics, interview notes, and a daily AI limit.
              </p>
            </div>

            <div className="grid gap-3">
              {["Application board", "Resume PDF import", "Interview prep notes"].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 p-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#DDE85F] text-[#17201B]">
                    <CheckCircle2 className="size-4" strokeWidth={1.5} />
                  </div>
                  <p className="text-[14px] font-medium text-[#F7FAF1]">{item}</p>
                  <span className="ml-auto font-mono text-[11px] text-[#91A99A]">0{index + 1}</span>
                </div>
              ))}
              <Button
                onClick={onStart}
                className="group mt-2 h-13 rounded-full bg-[#DDE85F] pl-6 pr-1.5 font-mono text-[12px] text-[#17201B] transition-[background-color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#E9F277] active:scale-[0.96]"
              >
                Enter JobPilot
                <span className="grid size-9 place-items-center rounded-full bg-[#17201B] text-[#F7FAF1] transition-[transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 group-hover:-translate-y-0.5">
                  <ArrowRight className="size-4" strokeWidth={1.5} />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-[#EEF3EA] lg:grid-cols-[284px_1fr]">
      <div className="hidden border-r border-white/10 bg-[#102018] p-5 lg:block">
        <Skeleton className="h-14 w-full rounded-2xl bg-white/12" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-xl bg-white/10" />
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
    <div className="flex h-full min-h-dvh flex-col">
      <div className="relative overflow-hidden border-b border-white/10 p-5">
        <div className="relative w-full pr-3">
          <Image src="/brand/logo-complete.svg" alt={APP_CONFIG.name} width={214} height={69} className="h-auto w-full brightness-0 invert" priority />
        </div>
        <div className="relative mt-4">
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#EAF4EC]">{APP_CONFIG.workspaceSubtitle}</p>
        </div>
        <Button
          onClick={onAdd}
          className="relative mt-5 h-11 w-full rounded-2xl bg-[#DDE85F] font-mono text-[12px] text-[#17201B] shadow-[0_18px_42px_-26px_rgba(221,232,95,0.85)] hover:bg-[#E9F277] active:scale-[0.98]"
        >
          <Plus className="size-4" />
          Add application
        </Button>
      </div>
      <div className="flex-1 py-2">
        {items.map(([id, Icon, label]) => (
          <Button
            key={id}
            variant="ghost"
            className={cn(
              "mx-3 h-11 w-[calc(100%-1.5rem)] justify-start gap-3 rounded-2xl px-3 text-[14px] font-medium text-[#A9B8AE] transition-[background-color,color,transform] duration-200 hover:bg-white/8 hover:text-[#F7FAF1] active:scale-[0.98]",
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
      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
          <p className="font-mono text-[11px] font-semibold uppercase text-[#EAF4EC]">{APP_CONFIG.guestModeTitle}</p>
          <p className="mt-1 text-[13px] leading-5 text-[#91A99A]">No login. {formatAiActionLimit(quota.limit)} reset daily.</p>
          <Progress value={getQuotaProgressValue(quota, "remaining")} className="mt-4 h-1.5 bg-white/10 [&_[data-slot=progress-indicator]]:bg-[#DDE85F]" />
        </div>
      </div>
    </div>
  );
}

function TopBar({
  guest,
  quota,
  search,
  setSearch,
  mobileNavOpen,
  setMobileNavOpen,
}: {
  guest: Guest | null;
  quota: AiQuota;
  search: string;
  setSearch: (value: string) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#DDE6D7] bg-[#EEF3EA]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-375 items-center gap-4 px-4 md:px-7">
        <Button variant="ghost" size="icon" className="size-10 rounded-xl lg:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
          <Menu className="size-5" />
        </Button>
        <div className="hidden h-10 w-40 items-center md:flex">
          <Image src="/brand/logo-complete.svg" alt={APP_CONFIG.name} width={154} height={50} className="h-auto w-full" />
        </div>
        <div className="hidden h-11 w-full max-w-md items-center rounded-2xl border border-[#DDE6D7] bg-white/82 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] md:flex">
          <Search className="mr-2 size-4 text-[#53675A]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search applications..."
            className="h-9 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
          />
          <span className="rounded-lg border border-[#DDE6D7] bg-[#F4F8EF] px-1.5 font-mono text-[11px] text-[#53675A]">/</span>
        </div>
        <div className="min-w-0 flex-1 md:hidden">
          <p className="truncate text-[14px] font-medium">Good to see you{guest ? `, ${guest.name}` : ""}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <p className="hidden font-mono text-[11px] text-[#53675A] tabular-nums md:block">
            AI quota {quota.remaining}/{quota.limit}
          </p>
          <Button variant="ghost" size="icon" className="hidden size-10 rounded-xl text-[#53675A] hover:bg-white/70 md:inline-flex">
            <Bell className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden size-10 rounded-xl text-[#53675A] hover:bg-white/70 md:inline-flex">
            <HelpCircle className="size-4" />
          </Button>
          <div className="grid size-10 place-items-center rounded-2xl border border-[#DDE6D7] bg-[#17201B] font-mono text-[11px] font-semibold text-[#F7FAF1] shadow-[0_16px_30px_-22px_rgba(15,28,21,0.8)]">
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
  const metrics = [
    ["Applications", data.analytics.totalApplications, Send, `${data.analytics.applicationsThisWeek} sent this week`],
    ["Interviews", data.analytics.byStatus["Technical Interview"] + data.analytics.byStatus["HR Interview"], BriefcaseBusiness, "active conversations"],
    ["Offer signal", `${data.analytics.offerRate}%`, CheckCircle2, `${data.analytics.rejectedCount} closed rejects`],
  ] as const;
  const maxStatus = Math.max(1, ...APPLICATION_STATUSES.map((status) => data.analytics.byStatus[status]));
  const nextFollowUp = upcomingFollowUps[0];

  return (
    <div className="grid min-w-0 gap-5">
      <section className="relative overflow-hidden rounded-4xl bg-[#12221A] p-5 text-[#F7FAF1] shadow-[0_28px_80px_-54px_rgba(7,24,14,0.9)] md:p-7">
        <Image
          src="/brand/logo-mark.svg"
          alt=""
          width={220}
          height={220}
          className="pointer-events-none absolute -right-8 -top-10 w-44 opacity-[0.08] md:w-64"
        />
        <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div>
            <h1 className="max-w-2xl text-[40px] font-semibold leading-[0.96] tracking-[-0.06em] text-wrap md:text-[64px]">
              Make every application easier to follow.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#BFD1C4]">
              Track each opportunity, catch quiet follow-ups, and use AI only where it helps you make the next decision.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={onAdd}
                className="h-12 rounded-2xl bg-[#DDE85F] px-5 font-mono text-[12px] text-[#17201B] shadow-[0_18px_42px_-26px_rgba(221,232,95,0.85)] hover:bg-[#E9F277] active:scale-[0.98]"
              >
                <Plus className="size-4" />
                Add application
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-2xl border-white/15 bg-white/8 px-5 font-mono text-[12px] text-[#F7FAF1] hover:bg-white/14 hover:text-[#F7FAF1] active:scale-[0.98]"
                onClick={() => setView("resume")}
              >
                Run resume scan
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {metrics.map(([label, value, Icon, helper], index) => (
              <div
                key={label}
                className={cn(
                  "rounded-3xl border border-white/10 bg-white/7.5 p-4 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                  index === 1 && "bg-[#DDE85F] text-[#17201B]",
                )}
              >
                <div className="flex items-start justify-between">
                  <p className={cn("font-mono text-[11px] uppercase text-[#BFD1C4]", index === 1 && "text-[#39521F]")}>{label}</p>
                  <Icon className={cn("size-4 text-[#DDE85F]", index === 1 && "text-[#17201B]")} />
                </div>
                <div className="mt-4">
                  <p className="font-mono text-[34px] font-semibold leading-none tabular-nums">{value}</p>
                  <p className={cn("mt-2 text-[12px] text-[#BFD1C4]", index === 1 && "text-[#39521F]")}>{helper}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="grid gap-4">
          <section className="overflow-hidden rounded-[28px] border border-[#D8E3D4] bg-[#F9FBF4] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
            <SectionHeader title="Route pressure" />
            <div className="p-5 pt-8">
              <div className="flex h-44 items-end gap-2">
                {APPLICATION_STATUSES.map((status) => {
                  const count = data.analytics.byStatus[status];
                  return (
                    <div key={status} className="group flex h-full flex-1 flex-col justify-end">
                      <div
                        className={cn(
                          "w-full rounded-t-2xl bg-[#DBE5D6] transition-[height,background-color,transform] duration-300 group-hover:-translate-y-1 group-hover:bg-[#BFD1C4]",
                          status === "Offer" && "bg-[#1B7A4E]",
                          status === "Technical Interview" && "bg-[#D26F48]",
                          status === "Screening" && "bg-[#DDE85F]",
                        )}
                        style={{ height: `${Math.max(6, (count / maxStatus) * 100)}%` }}
                      />
                      <div className="mt-3 truncate text-center font-mono text-[11px] text-[#53675A]">{statusMeta[status].label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-[#D8E3D4] bg-[#F9FBF4] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
            <SectionHeader title="Recent movement" />
            <div className="divide-y divide-[#DDE6D7]">
              {data.applications.slice(0, 4).map((application) => (
                <Button
                  key={application.id}
                  variant="ghost"
                  className="group h-auto w-full justify-start gap-4 rounded-none p-4 text-left hover:bg-[#F1F6ED]"
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
                      <span className="font-mono text-[11px] text-[#53675A]">{application.applicationDate}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-[#53675A]">Moved to {application.status}</p>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-[#91A99A] opacity-0 transition-opacity group-hover:opacity-100" />
                </Button>
              ))}
              {!data.applications.length ? (
                <EmptyState title="No applications added yet" description="Your board is a blank slate. Add your first job application to get started." />
              ) : null}
            </div>
          </section>
        </div>

        <div className="grid gap-4">
          <section className="relative overflow-hidden rounded-[28px] border border-[#17201B] bg-[#17201B] text-[#F7FAF1] shadow-[0_24px_60px_-42px_rgba(15,28,21,0.75)]">
            <SectionHeader title="AI support" icon={<Bot className="size-4 text-[#DDE85F]" />} tone="dark" />
            <div className="relative z-10 flex items-center gap-4 p-3">
              <QuotaRing quota={quota} />
              <div>
                <p className="text-[14px] font-semibold">Ready when you need support</p>
                <p className="mt-1 text-[12px] leading-5 text-[#BFD1C4]">Use {quota.remaining} more AI actions today.</p>
              </div>
            </div>
            <div className="relative z-10 p-3 pt-0">
              <Button
                variant="outline"
                className="h-10 w-full rounded-2xl border-white/12 bg-white/8 font-mono text-[12px] text-[#F7FAF1] hover:bg-white/14 hover:text-[#F7FAF1] active:scale-[0.98]"
                onClick={() => setView("resume")}
              >
                Scan resume
              </Button>
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-[#D8E3D4] bg-[#F9FBF4] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
            <SectionHeader title={nextFollowUp ? "Next move" : "Action items"} />
            <div className="grid gap-2 p-3">
              {upcomingFollowUps.length ? (
                upcomingFollowUps.map((application) => (
                  <Button
                    key={application.id}
                    variant="outline"
                    className="h-auto justify-start gap-3 rounded-2xl border-[#DDE6D7] bg-white/80 p-3 text-left shadow-[0_12px_28px_-24px_rgba(15,28,21,0.65)] hover:border-[#91A99A] hover:bg-white"
                    onClick={() => {
                      setSelectedApplicationId(application.id);
                      setView("applications");
                    }}
                  >
                    <div className="grid min-w-20 border-r border-[#D8E3D4] pr-3">
                      <span className="font-mono text-[10px] uppercase text-[#91A99A]">Follow-up</span>
                      <span className="mt-1 font-mono text-[11px] text-[#17201B]">{application.followUpDate}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{application.companyName}</p>
                      <p className="mt-1 truncate text-[12px] text-[#53675A]">{application.role}</p>
                    </div>
                  </Button>
                ))
              ) : (
                <EmptyState title="No follow-ups scheduled" description="Add dates to make action items visible." />
              )}
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
  updateApplication: (id: string, patch: Partial<Application>) => void;
  deleteApplication: (id: string) => void;
  busyAction: string | null;
  addSheetOpen: boolean;
  setAddSheetOpen: (open: boolean) => void;
}) {
  return (
    <div className="grid min-w-0 gap-5">
      <section className="relative overflow-hidden rounded-[30px] border border-[#D8E3D4] bg-[#F9FBF4] p-4 shadow-[0_24px_70px_-56px_rgba(15,28,21,0.75)] md:p-5">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[#F4F8EF] md:block" />
        <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div className="max-w-2xl">
            <h1 className="text-[34px] font-semibold leading-[0.98] tracking-[-0.06em] text-[#17201B] md:text-[48px]">
              Application board with pressure you can read.
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-6 text-[#53675A]">
              Sort the pipeline by stage, source, and momentum without turning your job hunt into manual tracking work.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row xl:items-center">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApplicationStatus | "All")}>
              <SelectTrigger className="h-11 rounded-2xl border-[#D8E3D4] bg-white/88 text-[13px] shadow-[0_14px_30px_-26px_rgba(15,28,21,0.55)] sm:w-48">
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
              <SelectTrigger className="h-11 rounded-2xl border-[#D8E3D4] bg-white/88 text-[13px] shadow-[0_14px_30px_-26px_rgba(15,28,21,0.55)] sm:w-44">
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
                <Button className="h-11 rounded-2xl bg-[#17201B] px-4 font-mono text-[12px] text-[#F7FAF1] shadow-[0_18px_42px_-30px_rgba(15,28,21,0.9)] hover:bg-[#2A4033] active:scale-[0.98]">
                  <Plus className="size-4" />
                  Add application
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full overflow-y-auto border-[#D8E3D4] bg-[#F8FAF3] sm:max-w-3xl xl:max-w-4xl">
                <SheetHeader className="border-b border-[#D8E3D4] px-5 py-5">
                  <SheetTitle className="tracking-[-0.04em]">Add application</SheetTitle>
                  <SheetDescription>Capture the opportunity while the details are fresh.</SheetDescription>
                </SheetHeader>
                <ApplicationForm
                  form={form}
                  setForm={setForm}
                  errors={errors}
                  formError={formError}
                  onSave={createApplication}
                  busy={busyAction === "create-application"}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </section>

      <ScrollArea className="h-[calc(100dvh-244px)] min-h-140 w-full max-w-full overflow-hidden rounded-[28px] border border-[#D8E3D4] bg-[#E7EEE3] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        <div className="flex h-full min-w-max items-start gap-4 pb-4 pr-4">
          {APPLICATION_STATUSES.map((status) => {
            const laneItems = applications.filter((application) => application.status === status);
            return (
              <div
                key={status}
                className={cn(
                  "flex h-full w-81 shrink-0 flex-col overflow-hidden rounded-3xl border bg-[#F9FBF4] shadow-[0_18px_44px_-36px_rgba(15,28,21,0.65)]",
                  statusMeta[status].border,
                )}
              >
                <div className={cn("h-1.5 w-full", statusMeta[status].stripe)} />
                <div className="flex min-h-14 items-center justify-between border-b border-[#D8E3D4] bg-white/58 px-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.9)]", statusMeta[status].dot)} />
                    <p className="text-[14px] font-semibold tracking-[-0.02em] text-[#18181B]">{status}</p>
                  </div>
                  <span className="font-mono text-[11px] text-[#53675A] tabular-nums">{laneItems.length}</span>
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
                    <div className="rounded-[20px] border border-dashed border-[#BFD1C4] bg-white/55 p-4 text-[13px] leading-5 text-[#53675A]">
                      No cards in this stage yet. Move an application here when the status changes.
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
              className="size-10 rounded-2xl border-dashed border-[#91A99A] bg-white/70 text-[#53675A] hover:bg-white"
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
  busy,
}: {
  form: ApplicationFormState;
  setForm: (form: ApplicationFormState) => void;
  errors: ApplicationFormErrors;
  formError: string | null;
  onSave: () => void;
  busy: boolean;
}) {
  const update = (key: keyof ApplicationFormState, value: string) => setForm({ ...form, [key]: value });

  return (
    <div className="grid gap-5 px-5 pb-6 pt-2">
      {formError ? <ErrorNotice message={formError} /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <Field
          label="Company"
          value={form.companyName}
          onChange={(value) => update("companyName", value)}
          placeholder="Company name"
          error={errors.companyName}
        />
        <Field
          label="Role"
          value={form.role}
          onChange={(value) => update("role", value)}
          placeholder="Target role"
          error={errors.role}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location" value={form.location} onChange={(value) => update("location", value)} placeholder="Remote" error={errors.location} />
        <Field
          label="Salary"
          value={form.salary}
          onChange={(value) => update("salary", sanitizeSalary(value))}
          placeholder="118000"
          inputMode="numeric"
          pattern="[0-9]*"
          error={errors.salary}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Source" value={form.sourcePlatform} onChange={(value) => update("sourcePlatform", value)} placeholder="Referral" error={errors.sourcePlatform} />
        <Field label="Job URL" value={form.jobUrl} onChange={(value) => update("jobUrl", value)} placeholder="https://..." error={errors.jobUrl} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Application date" type="date" value={form.applicationDate} onChange={(value) => update("applicationDate", value)} error={errors.applicationDate} />
        <div className="grid gap-2">
          <Label className="font-mono text-[12px] uppercase text-[#53675A]">Status</Label>
          <Select value={form.status} onValueChange={(value) => update("status", value)}>
            <SelectTrigger className="h-11 rounded-2xl border-[#D8E3D4] bg-white">
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
      </div>
      <Field label="Follow-up date" type="date" value={form.followUpDate} onChange={(value) => update("followUpDate", value)} error={errors.followUpDate} />
      <div className="grid gap-2">
        <Label className="font-mono text-[12px] uppercase text-[#53675A]">Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
          aria-invalid={Boolean(errors.notes)}
          className="min-h-28 rounded-2xl border-[#D8E3D4] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
        />
        {errors.notes ? <FieldError message={errors.notes} /> : null}
      </div>
      <Button
        onClick={onSave}
        disabled={busy}
        className="h-11 rounded-2xl bg-[#17201B] font-mono text-[12px] text-[#F7FAF1] shadow-[0_18px_40px_-30px_rgba(15,28,21,0.9)] hover:bg-[#2A4033] active:scale-[0.98]"
      >
        {busy ? "Saving" : "Save application"}
      </Button>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  error?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label className="font-mono text-[12px] uppercase text-[#53675A]">{label}</Label>
      <Input
        type={type}
        inputMode={inputMode}
        pattern={pattern}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className="h-11 rounded-2xl border-[#D8E3D4] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
      />
      {error ? <FieldError message={error} /> : null}
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
  updateApplication: (id: string, patch: Partial<Application>) => void;
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
        "group relative overflow-hidden rounded-[22px] border bg-white/90 p-3 shadow-[0_16px_36px_-32px_rgba(15,28,21,0.7)] transition-[border-color,box-shadow,background-color] duration-200 hover:bg-white hover:shadow-[0_24px_52px_-38px_rgba(15,28,21,0.8)]",
        statusMeta[application.status].border,
      )}
    >
      <div className={cn("absolute inset-x-3 top-0 h-1 rounded-b-full", statusMeta[application.status].stripe)} />
      <div className="mb-3 flex min-w-0 items-start gap-3 pt-2">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <CompanyMark company={application.companyName} className="size-10 rounded-2xl" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-[#17201B]">{application.role}</p>
            <p className="mt-1 truncate text-[13px] text-[#53675A]">
              {application.companyName} {application.location ? `- ${application.location}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-[#53675A]">{formatCurrency(application.salary)}</span>
          {application.sourcePlatform ? <span className="font-mono text-[10px] text-[#53675A]">via {application.sourcePlatform}</span> : null}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-[#53675A]">Applied: {application.applicationDate}</span>
          {application.followUpDate ? <span className="font-mono text-[11px] text-[#53675A]">Follow-up: {application.followUpDate}</span> : null}
        </div>
        <Select value={application.status} onValueChange={(value) => updateApplication(application.id, { status: value as ApplicationStatus })}>
          <SelectTrigger className={cn("h-9 rounded-2xl border text-[12px]", statusMeta[application.status].border, statusMeta[application.status].wash)}>
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
                className="h-9 flex-1 rounded-2xl border-[#D8E3D4] bg-white/80 font-mono text-[11px] hover:border-[#91A99A] hover:bg-white"
              >
                <PanelRightOpen className="size-3.5" />
                Detail
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto border-[#D8E3D4] bg-[#F8FAF3] sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>{application.companyName}</SheetTitle>
                <SheetDescription>{application.role}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 grid gap-4">
                <Field label="Notes" value={application.notes} onChange={(value) => updateApplication(application.id, { notes: value })} />
                <Field
                  label="Follow-up date"
                  type="date"
                  value={application.followUpDate ?? ""}
                  onChange={(value) => updateApplication(application.id, { followUpDate: value || null })}
                />
                <Separator />
                <p className="text-[13px] leading-6 text-[#53675A]">
                  Keep notes truthful and specific. Use AI output as draft guidance, not a guarantee of outcomes.
                </p>
              </div>
            </SheetContent>
          </Sheet>
          <Button
            variant="outline"
            size="icon"
            className="size-9 rounded-2xl border-[#D8E3D4] bg-white/80 text-[#53675A] hover:border-[#B94A48]/35 hover:bg-[#FFF4F2] hover:text-[#B94A48]"
            disabled={busy}
            onClick={() => deleteApplication(application.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </motion.div>
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

  return (
    <div className="grid gap-5">
      <section className="relative overflow-hidden rounded-[30px] bg-[#17201B] p-5 text-[#F7FAF1] shadow-[0_28px_80px_-54px_rgba(7,24,14,0.9)]">
        <Image
          src="/brand/logo-mark.svg"
          alt=""
          width={190}
          height={190}
          className="pointer-events-none absolute -right-8 -top-12 w-44 opacity-[0.07]"
        />
        <div className="relative grid gap-5 xl:grid-cols-[1fr_420px] xl:items-end">
          <div>
            <h1 className="max-w-2xl text-[36px] font-semibold leading-[0.98] tracking-[-0.06em] md:text-[54px]">
              Resume diagnostics, pointed at one real role.
            </h1>
            <p className="mt-4 max-w-xl text-[14px] leading-6 text-[#BFD1C4]">
              Paste the job description and resume text. JobPilot turns the gap into specific keywords, bullet rewrites, and a score you can act on.
            </p>
          </div>
          <div className="rounded-3xl border border-white/12 bg-white/8 p-3 backdrop-blur">
            <p className="mb-2 font-mono text-[11px] uppercase text-[#BFD1C4]">Target application</p>
            <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
              <SelectTrigger className="h-12 rounded-2xl border-white/12 bg-[#F7FAF1] text-[13px] text-[#17201B]">
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
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-black/12 p-3">
              <CompanyMark company={selectedApplication?.companyName ?? "JobPilot"} className="border-white/15 bg-white/12 text-[#F7FAF1]" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{selectedApplication?.companyName ?? "No application selected"}</p>
                <p className="truncate text-[12px] text-[#BFD1C4]">{selectedApplication?.role ?? "Add an application to anchor the scan."}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {quota.remaining <= 0 ? <QuotaBlocked /> : null}

      <div className="grid gap-5 xl:grid-cols-[0.84fr_1.16fr]">
        <section className="overflow-hidden rounded-[28px] border border-[#D8E3D4] bg-[#F9FBF4] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
          <SectionHeader title="Analysis context" icon={<FileText className="size-4 text-[#53675A]" />} />
          <div className="grid gap-4 p-4">
            {resumeError ? <ErrorNotice message={resumeError} /> : null}
            <div className="grid gap-2">
              <Label className="font-mono text-[12px] uppercase text-[#53675A]">Job description</Label>
              <Textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste target job description here..."
                className="min-h-40 rounded-2xl border-[#D8E3D4] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
              />
            </div>
            <div className="grid gap-2">
              <Label className="font-mono text-[12px] uppercase text-[#53675A]">Resume content</Label>
              <div className="rounded-2xl border border-dashed border-[#BFD1C4] bg-white/72 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#E6EFD9] text-[#17201B]">
                      {resumeFileLoading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#17201B]">Upload resume PDF</p>
                      <p className="mt-1 text-[12px] leading-5 text-[#53675A]">
                        Text is extracted into the resume field before analysis.
                      </p>
                    </div>
                  </div>
                  <Input
                    type="file"
                    accept="application/pdf,.pdf"
                    disabled={resumeFileLoading}
                    onChange={(event) => {
                      void importResumePdf(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                    className="h-11 rounded-2xl border-[#D8E3D4] bg-[#F8FAF3] text-[13px] file:mr-3 file:rounded-xl file:bg-[#17201B] file:px-3 file:text-[#F7FAF1] sm:max-w-72"
                  />
                </div>
                {resumeFileName ? (
                  <p className="mt-3 rounded-xl bg-[#F4F8EF] px-3 py-2 font-mono text-[11px] text-[#53675A]">{resumeFileName}</p>
                ) : null}
                {resumeFileError ? <div className="mt-3"><FieldError message={resumeFileError} /></div> : null}
              </div>
              <Textarea
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="Paste current resume text here..."
                className="min-h-64 rounded-2xl border-[#D8E3D4] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
              />
            </div>
          </div>
          <div className="border-t border-[#D8E3D4] bg-[#F1F6ED] p-3">
            <Button
              onClick={analyzeResume}
              disabled={busy || quota.remaining <= 0}
              className="h-11 w-full rounded-2xl bg-[#17201B] font-mono text-[12px] text-[#F7FAF1] shadow-[0_18px_42px_-30px_rgba(15,28,21,0.9)] hover:bg-[#2A4033] active:scale-[0.98]"
            >
              <Bot className="size-4" />
              {busy ? "Analyzing" : "Analyze resume"}
            </Button>
          </div>
        </section>
        <section className="overflow-hidden rounded-[28px] border border-[#D8E3D4] bg-[#F9FBF4] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
          <SectionHeader title="Analysis results" icon={<BarChart3 className="size-4 text-[#53675A]" />} />
          <div className="p-4">
            {busy ? (
              <AnalysisSkeleton />
            ) : analysis ? (
              <AnalysisPanel analysis={analysis} />
            ) : (
              <EmptyState title="No analysis yet" description="Run an analysis to see score, keywords, and rewritten bullets." />
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
      <Skeleton className="h-24 w-full rounded-3xl" />
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-36 w-full rounded-3xl" />
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: ResumeAnalysis }) {
  return (
    <div className="grid gap-5">
      <div className="relative overflow-hidden rounded-[26px] bg-[#17201B] p-5 text-[#F7FAF1]">
        <div className="relative flex items-center gap-5">
          <div className="grid size-20 place-items-center rounded-3xl border border-[#DDE85F]/35 bg-[#DDE85F] shadow-[0_18px_42px_-28px_rgba(221,232,95,0.9)]">
            <span className="font-mono text-[28px] font-semibold text-[#17201B]">{analysis.score}</span>
          </div>
          <div>
            <p className="text-[15px] font-semibold">ATS match score</p>
            <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#BFD1C4]">{analysis.finalRecommendation}</p>
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
      <div className="rounded-[22px] border border-[#D8E3D4] bg-white/74 p-3">
        <p className="border-b border-[#D8E3D4] pb-2 font-mono text-[12px] font-medium uppercase text-[#53675A]">{title}</p>
        <div className="mt-2 grid gap-2">
          {items.map((item) => (
            <div
              key={item}
              className={cn(
                "border-l-2 bg-[#F4F8EF] px-3 py-2 text-[12px] leading-5",
                tone === "risk" && "border-[#B94A48] bg-[#FFF4F2] text-[#93000A]",
                tone === "success" && "border-[#2F8F5B] bg-[#EBF7EF] text-[#1B7A4E]",
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
    <div className="rounded-[22px] border border-[#D8E3D4] bg-white/74 p-3">
      <p className="border-b border-[#D8E3D4] pb-2 font-mono text-[12px] font-medium uppercase text-[#53675A]">{title}</p>
      <div className="mt-2 grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border border-[#D8E3D4] bg-[#F4F8EF] p-3 text-[13px] leading-6 text-[#3B4B40]">
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
  updateQuestion: (id: string, patch: Partial<InterviewQuestion>) => void;
  busy: boolean;
  quota: AiQuota;
}) {
  const grouped = QUESTION_CATEGORIES.map((category) => ({
    category,
    questions: questions.filter((question) => question.category === category && (!selectedApplicationId || question.applicationId === selectedApplicationId)),
  }));
  const selectedApplication = applications.find((application) => application.id === selectedApplicationId);

  return (
    <div className="grid gap-5">
      <section className="relative overflow-hidden rounded-[30px] border border-[#D8E3D4] bg-[#F9FBF4] p-4 shadow-[0_24px_70px_-56px_rgba(15,28,21,0.75)] md:p-5">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[#F4F8EF] md:block" />
        <div className="relative grid gap-5 xl:grid-cols-[1fr_470px] xl:items-end">
          <div>
            <h1 className="text-[34px] font-semibold leading-[0.98] tracking-[-0.06em] text-[#17201B] md:text-[48px]">
              Practice with notes that survive the real call.
            </h1>
            <p className="mt-3 max-w-xl text-[14px] leading-6 text-[#53675A]">
              Generate role-specific prompts, check off rehearsed answers, and keep your rough talking points beside every question.
            </p>
          </div>
          <div className="rounded-3xl border border-[#D8E3D4] bg-white/72 p-3 shadow-[0_18px_40px_-34px_rgba(15,28,21,0.68)]">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
                <SelectTrigger className="h-11 rounded-2xl border-[#D8E3D4] bg-white text-[13px]">
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
                disabled={busy || quota.remaining <= 0}
                className="h-11 rounded-2xl bg-[#17201B] px-4 font-mono text-[12px] text-[#F7FAF1] hover:bg-[#2A4033] active:scale-[0.98]"
              >
                <Bot className="size-4" />
                {busy ? "Generating" : "Generate questions"}
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#F4F8EF] p-3">
              <CompanyMark company={selectedApplication?.companyName ?? "JobPilot"} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{selectedApplication?.companyName ?? "No application selected"}</p>
                <p className="truncate text-[12px] text-[#53675A]">{selectedApplication?.role ?? "Pick a role before generating prompts."}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {quota.remaining <= 0 ? <QuotaBlocked /> : null}

      <div className="grid gap-4">
        {grouped.map((group) => (
          <section
            key={group.category}
            className="overflow-hidden rounded-[28px] border border-[#D8E3D4] bg-[#F9FBF4] shadow-[0_24px_60px_-50px_rgba(15,28,21,0.68)]"
          >
            <SectionHeader title={group.category} />
            <div className="grid gap-3 bg-[#F1F6ED] p-3 md:grid-cols-2 xl:grid-cols-3">
              {group.questions.length ? (
                group.questions.map((question) => (
                  <div
                    key={question.id}
                    className="grid gap-3 rounded-[22px] border border-[#D8E3D4] bg-white/88 p-3 shadow-[0_16px_36px_-34px_rgba(15,28,21,0.7)] transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-[#91A99A] hover:shadow-[0_24px_52px_-40px_rgba(15,28,21,0.85)]"
                  >
                    <div className="flex gap-3">
                      <Checkbox
                        checked={question.practiced}
                        onCheckedChange={(checked) => updateQuestion(question.id, { practiced: checked === true })}
                        className="mt-1"
                      />
                      <p className={cn("text-[13px] leading-5 text-[#17201B]", question.practiced && "text-[#53675A] line-through")}>
                        {question.question}
                      </p>
                    </div>
                    <Textarea
                      value={question.answerNotes}
                      onChange={(event) => updateQuestion(question.id, { answerNotes: event.target.value })}
                      placeholder="Answer notes"
                      className="min-h-24 rounded-2xl border-[#D8E3D4] bg-[#F9FBF4]"
                    />
                  </div>
                ))
              ) : (
                <EmptyState title="No questions yet" description="Generate questions for the selected application." />
              )}
            </div>
          </section>
        ))}
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
  return (
    <div className="grid w-full gap-5">
      <section className="relative overflow-hidden rounded-[30px] bg-[#17201B] p-5 text-[#F7FAF1] shadow-[0_28px_80px_-54px_rgba(7,24,14,0.9)]">
        <div className="relative">
          <div className="mb-4 flex h-12 w-40 items-center">
            <Image src="/brand/logo-complete.svg" alt={APP_CONFIG.name} width={154} height={50} className="h-auto w-full brightness-0 invert" />
          </div>
          <h1 className="max-w-2xl text-[36px] font-semibold leading-[0.98] tracking-[-0.06em] md:text-[54px]">
            Workspace settings without account friction.
          </h1>
          <p className="mt-4 max-w-xl text-[14px] leading-6 text-[#BFD1C4]">
            JobPilot stays open. Your browser gets a name, and AI usage stays capped by browser and network so the public demo remains usable.
          </p>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-[28px] border border-[#D8E3D4] bg-[#F9FBF4] shadow-[0_24px_60px_-50px_rgba(15,28,21,0.68)]">
          <SectionHeader title="Workspace identity" />
          <div className="grid gap-4 p-4">
            <Field label="Display name" value={name || guest?.name || ""} onChange={setName} />
            <Button
              onClick={saveName}
              className="h-11 w-fit rounded-2xl bg-[#17201B] px-5 font-mono text-[12px] text-[#F7FAF1] hover:bg-[#2A4033] active:scale-[0.98]"
            >
              Save name
            </Button>
            <Button
              variant="outline"
              onClick={startOnboarding}
              className="h-11 w-fit rounded-2xl border-[#D8E3D4] bg-white px-5 font-mono text-[12px] text-[#17201B] hover:bg-[#F4F8EF] active:scale-[0.98]"
            >
              Replay walkthrough
            </Button>
          </div>
        </section>
        <section className="overflow-hidden rounded-[28px] border border-[#D8E3D4] bg-[#F9FBF4] shadow-[0_24px_60px_-50px_rgba(15,28,21,0.68)]">
          <SectionHeader title="AI usage" />
          <div className="p-4">
            <div>
              <p className="font-mono text-[42px] font-semibold leading-none tracking-[-0.04em] text-[#17201B] tabular-nums">
                {quota.used}/{quota.limit}
              </p>
              <p className="mt-2 text-[13px] text-[#53675A]">
                actions used today, {quota.remaining} remaining
              </p>
            </div>
            <Progress value={getQuotaProgressValue(quota)} className="mt-5 h-2 rounded-full" />
            <p className="mt-4 rounded-2xl border border-[#D8E3D4] bg-[#F4F8EF] p-3 text-[13px] leading-6 text-[#53675A]">
              AI actions are limited to {quota.limit} per day for this browser. Tracking, notes, and manual edits keep working after the limit.
            </p>
          </div>
        </section>
      </div>
      <section className="overflow-hidden rounded-[28px] border border-[#E3AAA8] bg-[#FFF4F2] shadow-[0_24px_60px_-50px_rgba(80,20,18,0.35)]">
        <SectionHeader title="Local data" />
        <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#17201B]">Clear this workspace</p>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#68413F]">
              Deletes applications, resume analyses, interview notes, activity entries, and the current guest name from the local JSON file. Daily AI usage records are retained for abuse prevention.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-[#B94A48]/35 bg-white/70 px-4 font-mono text-[12px] text-[#93000A] hover:bg-white hover:text-[#93000A] active:scale-[0.98]"
              >
                <Trash2 className="size-4" />
                Clear workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border-[#E3AAA8] bg-[#FFF9F7] shadow-[0_32px_80px_-42px_rgba(80,20,18,0.6)]">
              <DialogHeader>
                <div className="mb-1 grid size-11 place-items-center rounded-2xl bg-[#FFF4F2] text-[#B94A48]">
                  <AlertTriangle className="size-5" />
                </div>
                <DialogTitle className="tracking-[-0.04em]">Clear workspace data?</DialogTitle>
                <DialogDescription className="text-[#68413F]">
                  This removes workspace records and signs out the current browser session. Daily AI quota records are retained for abuse prevention.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    className="h-11 rounded-2xl border-[#D8E3D4] bg-white px-4 font-mono text-[12px] text-[#17201B] hover:bg-[#F4F8EF]"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={clearAllData}
                  disabled={clearingData}
                  className="h-11 rounded-2xl bg-[#B94A48] px-4 font-mono text-[12px] text-white hover:bg-[#9F3836] active:scale-[0.98]"
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
        tone === "light" && "border-[#D8E3D4] bg-white/58",
        tone === "dark" && "border-white/10 bg-white/4",
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <h2 className={cn("text-[14px] font-semibold tracking-[-0.02em]", tone === "light" ? "text-[#17201B]" : "text-[#F7FAF1]")}>
          {title}
        </h2>
      </div>
      {action ? <span className={cn("font-mono text-[11px]", tone === "light" ? "text-[#53675A]" : "text-[#BFD1C4]")}>{action}</span> : null}
    </div>
  );
}

function CompanyMark({ company, className }: { company: string; className?: string }) {
  return (
    <div
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-xl border border-[#D8E3D4] bg-[#F4F8EF] font-mono text-[10px] font-bold text-[#17201B]",
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
          className="text-[#2F8F5B]"
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
    <div className="flex items-start gap-3 rounded-2xl border border-[#B94A48]/30 bg-[#FFF4F2] p-3 text-[13px] leading-6 text-[#B94A48]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>Daily AI limit reached. You can keep tracking applications and come back tomorrow for more AI help.</span>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-2xl border border-[#B94A48]/30 bg-[#FFF4F2] p-3 text-[13px] leading-5 text-[#B94A48]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-[12px] leading-5 text-[#B94A48]">
      {message}
    </p>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#BFD1C4] bg-[#F4F8EF] p-4">
      <p className="text-[13px] font-semibold text-[#17201B]">{title}</p>
      <p className="mt-1 text-[13px] leading-5 text-[#53675A]">{description}</p>
    </div>
  );
}
