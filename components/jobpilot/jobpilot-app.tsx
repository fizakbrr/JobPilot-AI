"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Menu,
  PanelRightOpen,
  Plus,
  Search,
  Send,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

function formatCurrency(value: number | null) {
  if (!value) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function followUpState(application: Application) {
  if (!application.followUpDate) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followUp = new Date(application.followUpDate);
  const soon = new Date(today);
  soon.setDate(today.getDate() + 3);

  if (followUp < today) return "overdue";
  if (followUp <= soon) return "upcoming";
  return "scheduled";
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
  const [view, setView] = useState<View>("dashboard");
  const [guest, setGuest] = useState<Guest | null>(null);
  const [quota, setQuota] = useState<AiQuota>({ limit: 3, used: 0, remaining: 3, date: "" });
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
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [activeAnalysis, setActiveAnalysis] = useState<ResumeAnalysis | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

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
    setQuota(payload.quota);
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
      setQuota(payload.quota);
      setName(payload.guest.name);
      await refreshData();
      toast.success("Workspace ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your name.");
    } finally {
      setBusyAction(null);
    }
  }

  async function createApplication() {
    setBusyAction("create-application");
    try {
      await readJson<{ application: Application }>(
        await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...applicationForm,
            salary: applicationForm.salary ? Number(applicationForm.salary) : null,
            followUpDate: applicationForm.followUpDate || null,
          }),
        }),
      );
      setApplicationForm(initialApplicationForm);
      setAddSheetOpen(false);
      await refreshData();
      toast.success("Application added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add application.");
    } finally {
      setBusyAction(null);
    }
  }

  async function updateApplication(id: string, patch: Partial<Application>) {
    setBusyAction(`application-${id}`);
    try {
      await readJson<{ application: Application }>(
        await fetch(`/api/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }),
      );
      await refreshData();
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
      toast.success("Application removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove application.");
    } finally {
      setBusyAction(null);
    }
  }

  async function analyzeResume() {
    setBusyAction("resume");
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
      setQuota(payload.quota);
      await refreshData();
      toast.success("Resume analysis saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not analyze resume.");
    } finally {
      setBusyAction(null);
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
      setQuota(payload.quota);
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

  if (loading) return <LoadingShell />;

  const openAdd = () => {
    setView("applications");
    setAddSheetOpen(true);
    setMobileNavOpen(false);
  };

  const nav = <Navigation view={view} setView={setView} onNavigate={() => setMobileNavOpen(false)} onAdd={openAdd} quota={quota} />;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0F1C15] text-[#17201B]">
      <Dialog open={!guest}>
        <DialogContent className="overflow-hidden rounded-2xl border-[#DDE6D7] bg-[#F8FAF3] shadow-[0_32px_80px_-38px_rgba(7,24,14,0.75)] sm:max-w-110">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#1B7A4E]" />
          <DialogHeader>
            <div className="mb-4 flex h-12 w-40 items-center">
              <Image src="/brand/logo-complete.svg" alt="JobPilot AI" width={154} height={50} className="h-auto w-full" priority />
            </div>
            <DialogTitle className="text-[22px] tracking-[-0.04em]">Name your command desk</DialogTitle>
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
              placeholder="Hafiz"
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

      <div className="relative grid min-h-dvh grid-cols-1 lg:grid-cols-[284px_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#102018]/95 text-[#F7FAF1] shadow-[22px_0_70px_-48px_rgba(0,0,0,0.9)] lg:block">
          {nav}
        </aside>
        <main className="min-w-0 bg-[#EEF3EA] lg:rounded-l-[28px] lg:shadow-[-18px_0_60px_-42px_rgba(0,0,0,0.85)]">
          <TopBar
            guest={guest}
            quota={quota}
            search={search}
            setSearch={setSearch}
            mobileNavOpen={mobileNavOpen}
            setMobileNavOpen={setMobileNavOpen}
          />
          {mobileNavOpen ? <div className="border-b border-[#DDE6D7] bg-[#102018] text-[#F7FAF1] lg:hidden">{nav}</div> : null}
          <div className="mx-auto max-w-375 px-4 py-5 md:px-7 md:py-7">
            {view === "dashboard" ? (
              <DashboardView
                data={data}
                quota={quota}
                upcomingFollowUps={upcomingFollowUps}
                setView={setView}
                setSelectedApplicationId={setSelectedApplicationId}
                onAdd={openAdd}
              />
            ) : null}
            {view === "applications" ? (
              <ApplicationsView
                applications={filteredApplications}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sourceFilter={sourceFilter}
                setSourceFilter={setSourceFilter}
                sources={sources}
                form={applicationForm}
                setForm={setApplicationForm}
                createApplication={createApplication}
                updateApplication={updateApplication}
                deleteApplication={deleteApplication}
                busyAction={busyAction}
                addSheetOpen={addSheetOpen}
                setAddSheetOpen={setAddSheetOpen}
              />
            ) : null}
            {view === "resume" ? (
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
                quota={quota}
              />
            ) : null}
            {view === "interviews" ? (
              <InterviewView
                applications={data.applications}
                selectedApplicationId={selectedApplication?.id ?? ""}
                setSelectedApplicationId={setSelectedApplicationId}
                questions={data.questions}
                generateInterviewQuestions={generateInterviewQuestions}
                updateQuestion={updateQuestion}
                busy={busyAction === "interviews"}
                quota={quota}
              />
            ) : null}
            {view === "settings" ? (
              <SettingsView guest={guest} quota={quota} name={name} setName={setName} saveName={saveName} />
            ) : null}
          </div>
        </main>
      </div>
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
          <Image src="/brand/logo-complete.svg" alt="JobPilot AI" width={214} height={69} className="h-auto w-full brightness-0 invert" priority />
        </div>
        <div className="relative mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#EAF4EC]">Career command desk</p>
            <p className="font-mono text-[11px] text-[#91A99A]">open-demo / live pipeline</p>
          </div>
          <span className="rounded-full border border-[#D26F48]/35 bg-[#D26F48]/10 px-2 py-1 font-mono text-[10px] text-[#FFD8C7]">
            ACTIVE
          </span>
        </div>
        <Button
          onClick={onAdd}
          className="relative mt-5 h-11 w-full rounded-2xl bg-[#DDE85F] font-mono text-[12px] text-[#17201B] shadow-[0_18px_42px_-26px_rgba(221,232,95,0.85)] hover:bg-[#E9F277] active:scale-[0.98]"
        >
          <Plus className="size-4" />
          New Application
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
          <p className="font-mono text-[11px] font-semibold uppercase text-[#EAF4EC]">Guest mode</p>
          <p className="mt-1 text-[13px] leading-5 text-[#91A99A]">No login. Three AI actions reset daily.</p>
          <Progress value={(quota.remaining / quota.limit) * 100} className="mt-4 h-1.5 bg-white/10 [&_[data-slot=progress-indicator]]:bg-[#DDE85F]" />
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
          <Image src="/brand/logo-complete.svg" alt="JobPilot AI" width={154} height={50} className="h-auto w-full" />
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
          <Badge variant="outline" className="h-9 rounded-xl border-[#D5E5C2] bg-[#F8FFE3] px-3 font-mono text-[11px] text-[#39521F]">
            {quota.remaining}/{quota.limit} AI Quota
          </Badge>
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
  const readiness = Math.min(100, 42 + Math.min(data.analytics.totalApplications, 8) * 4 + data.analytics.interviewRate);
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
              Make every application feel less random.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#BFD1C4]">
              Track the route, catch quiet follow-ups, and use AI only where it sharpens the next move.
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
            <SectionHeader title="Route pressure" action="status distribution" />
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
            <SectionHeader title="Recent movement" action="latest four" />
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
                    <p className="mt-1 text-[13px] text-[#53675A]">
                      Moved to <span className="rounded-lg bg-[#E6EFD9] px-1.5 py-0.5 font-mono text-[#17201B]">{application.status}</span>
                    </p>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-[#91A99A] opacity-0 transition-opacity group-hover:opacity-100" />
                </Button>
              ))}
              {!data.applications.length ? <EmptyState title="No applications yet" description="Create the first job card to start the pipeline." /> : null}
            </div>
          </section>
        </div>

        <div className="grid gap-4">
          <section className="relative overflow-hidden rounded-[28px] border border-[#17201B] bg-[#17201B] text-[#F7FAF1] shadow-[0_24px_60px_-42px_rgba(15,28,21,0.75)]">
            <SectionHeader title="AI Copilot Status" icon={<Bot className="size-4 text-[#DDE85F]" />} tone="dark" />
            <div className="relative z-10 flex items-center gap-4 p-3">
              <ReadinessRing value={readiness} />
              <div>
                <p className="text-[14px] font-semibold">Ready for dispatch</p>
                <p className="mt-1 text-[12px] leading-5 text-[#BFD1C4]">Use {quota.remaining} more AI actions today.</p>
              </div>
            </div>
            <div className="relative z-10 p-3 pt-0">
              <Button
                variant="outline"
                className="h-10 w-full rounded-2xl border-white/12 bg-white/8 font-mono text-[12px] text-[#F7FAF1] hover:bg-white/14 hover:text-[#F7FAF1] active:scale-[0.98]"
                onClick={() => setView("resume")}
              >
                Run Diagnostics
              </Button>
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-[#D8E3D4] bg-[#F9FBF4] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
            <SectionHeader title={nextFollowUp ? "Next move" : "Action items"} action={nextFollowUp?.followUpDate ?? "quiet"} />
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
                    <FollowUpBadge application={application} />
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
  form: typeof initialApplicationForm;
  setForm: (form: typeof initialApplicationForm) => void;
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
                  New Application
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full overflow-y-auto border-[#D8E3D4] bg-[#F8FAF3] sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle className="tracking-[-0.04em]">Add application</SheetTitle>
                  <SheetDescription>Capture the opportunity while the details are fresh.</SheetDescription>
                </SheetHeader>
                <ApplicationForm form={form} setForm={setForm} onSave={createApplication} busy={busyAction === "create-application"} />
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
                  <Badge variant="secondary" className="h-7 rounded-xl border border-[#D8E3D4] bg-[#F4F8EF] font-mono text-[11px] text-[#53675A]">
                    {laneItems.length}
                  </Badge>
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
                      Nothing here. Move a card forward when the stage changes.
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
  onSave,
  busy,
}: {
  form: typeof initialApplicationForm;
  setForm: (form: typeof initialApplicationForm) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const update = (key: keyof typeof initialApplicationForm, value: string) => setForm({ ...form, [key]: value });

  return (
    <div className="mt-6 grid gap-4">
      <Field label="Company" value={form.companyName} onChange={(value) => update("companyName", value)} placeholder="Linear" />
      <Field label="Role" value={form.role} onChange={(value) => update("role", value)} placeholder="Frontend Engineer" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location" value={form.location} onChange={(value) => update("location", value)} placeholder="Remote" />
        <Field label="Salary" value={form.salary} onChange={(value) => update("salary", value)} placeholder="118000" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Source" value={form.sourcePlatform} onChange={(value) => update("sourcePlatform", value)} placeholder="Referral" />
        <Field label="Job URL" value={form.jobUrl} onChange={(value) => update("jobUrl", value)} placeholder="https://..." />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Application date" type="date" value={form.applicationDate} onChange={(value) => update("applicationDate", value)} />
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
        </div>
      </div>
      <Field label="Follow-up date" type="date" value={form.followUpDate} onChange={(value) => update("followUpDate", value)} />
      <div className="grid gap-2">
        <Label className="font-mono text-[12px] uppercase text-[#53675A]">Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
          className="min-h-28 rounded-2xl border-[#D8E3D4] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
        />
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label className="font-mono text-[12px] uppercase text-[#53675A]">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-2xl border-[#D8E3D4] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
      />
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
    <div
      className={cn(
        "group relative overflow-hidden rounded-[22px] border bg-white/90 p-3 shadow-[0_16px_36px_-32px_rgba(15,28,21,0.7)] transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_24px_52px_-38px_rgba(15,28,21,0.8)]",
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
          {application.sourcePlatform ? (
            <span className="rounded-xl border border-[#D8E3D4] bg-[#F4F8EF] px-2 py-1 font-mono text-[10px] text-[#53675A]">
              via {application.sourcePlatform}
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-[#53675A]">Applied: {application.applicationDate}</span>
          <FollowUpBadge application={application} />
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
    </div>
  );
}

function FollowUpBadge({ application }: { application: Application }) {
  const state = followUpState(application);
  if (state === "none") return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded px-1.5 font-mono text-[10px]",
        state === "overdue" && "border-[#B94A48]/30 bg-[#FFF4F2] text-[#B94A48]",
        state === "upcoming" && "border-[#B7791F]/30 bg-[#FFF8EA] text-[#B7791F]",
        state === "scheduled" && "border-[#D8E3D4] bg-[#F4F8EF] text-[#53675A]",
      )}
    >
      {state}
    </Badge>
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
          <SectionHeader title="Analysis context" icon={<FileText className="size-4 text-[#53675A]" />} action="ready" />
          <div className="grid gap-4 p-4">
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
              {busy ? "Analyzing" : "Run analysis"}
            </Button>
          </div>
        </section>
        <section className="overflow-hidden rounded-[28px] border border-[#D8E3D4] bg-[#F9FBF4] shadow-[0_24px_60px_-48px_rgba(15,28,21,0.7)]">
          <SectionHeader title="Analysis results" icon={<BarChart3 className="size-4 text-[#53675A]" />} action="saved locally" />
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
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge
              key={item}
              variant="outline"
              className={cn(
                "rounded-xl px-2 py-1 font-mono text-[11px]",
                tone === "risk" && "border-[#B94A48]/20 bg-[#FFF4F2] text-[#93000A]",
                tone === "success" && "border-[#2F8F5B]/20 bg-[#EBF7EF] text-[#1B7A4E]",
              )}
            >
              {item}
            </Badge>
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
                {busy ? "Generating" : "Generate"}
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
            <SectionHeader title={group.category} action={`${group.questions.length} prompts`} />
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
}: {
  guest: Guest | null;
  quota: AiQuota;
  name: string;
  setName: (name: string) => void;
  saveName: () => void;
}) {
  return (
    <div className="grid max-w-5xl gap-5">
      <section className="relative overflow-hidden rounded-[30px] bg-[#17201B] p-5 text-[#F7FAF1] shadow-[0_28px_80px_-54px_rgba(7,24,14,0.9)]">
        <div className="relative">
          <div className="mb-4 flex h-12 w-40 items-center">
            <Image src="/brand/logo-complete.svg" alt="JobPilot AI" width={154} height={50} className="h-auto w-full brightness-0 invert" />
          </div>
          <h1 className="max-w-2xl text-[36px] font-semibold leading-[0.98] tracking-[-0.06em] md:text-[54px]">
            Workspace settings without account friction.
          </h1>
          <p className="mt-4 max-w-xl text-[14px] leading-6 text-[#BFD1C4]">
            JobPilot stays open. Your browser gets a name, and AI usage stays capped so the public demo remains usable.
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
          </div>
        </section>
        <section className="overflow-hidden rounded-[28px] border border-[#D8E3D4] bg-[#F9FBF4] shadow-[0_24px_60px_-50px_rgba(15,28,21,0.68)]">
          <SectionHeader title="AI usage" action="daily reset" />
          <div className="p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[42px] font-semibold leading-none tracking-[-0.04em] text-[#17201B]">
                  {quota.used}/{quota.limit}
                </p>
                <p className="mt-2 text-[13px] text-[#53675A]">actions used today</p>
              </div>
              <div className="grid size-14 place-items-center rounded-2xl bg-[#DDE85F] font-mono text-[12px] font-semibold text-[#17201B]">
                {quota.remaining} left
              </div>
            </div>
            <Progress value={(quota.used / quota.limit) * 100} className="mt-5 h-2 rounded-full" />
            <p className="mt-4 rounded-2xl border border-[#D8E3D4] bg-[#F4F8EF] p-3 text-[13px] leading-6 text-[#53675A]">
              AI actions are limited to three per day for each guest workspace. Tracking, notes, and manual edits keep working after the limit.
            </p>
          </div>
        </section>
      </div>
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

function ReadinessRing({ value }: { value: number }) {
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
      <div className="absolute inset-0 grid place-items-center font-mono text-[14px] font-semibold">{value}%</div>
    </div>
  );
}

function QuotaBlocked() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#B94A48]/30 bg-[#FFF4F2] p-3 text-[13px] leading-6 text-[#B94A48]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>Daily AI limit reached. Come back tomorrow to run more AI actions.</span>
    </div>
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
