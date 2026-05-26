"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
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
  MoreHorizontal,
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
} from "@/lib/types";
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

const statusMeta: Record<ApplicationStatus, { dot: string; border: string; label: string }> = {
  Wishlist: { dot: "bg-[#C8C5CA]", border: "border-[#E2E8F0]", label: "Queued" },
  Applied: { dot: "bg-[#B7C8E1]", border: "border-[#E2E8F0]", label: "Sent" },
  Screening: { dot: "bg-[#7CDA9E]", border: "border-[#7CDA9E]", label: "Screen" },
  "Technical Interview": { dot: "bg-[#18181B]", border: "border-[#18181B]", label: "Tech" },
  "HR Interview": { dot: "bg-[#64748B]", border: "border-[#64748B]", label: "HR" },
  Offer: { dot: "bg-[#2F8F5B]", border: "border-[#2F8F5B]", label: "Offer" },
  Rejected: { dot: "bg-[#B94A48]", border: "border-[#B94A48]", label: "Closed" },
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

  const nav = <Navigation view={view} setView={setView} onNavigate={() => setMobileNavOpen(false)} onAdd={openAdd} />;

  return (
    <div className="min-h-[100dvh] bg-[#F7F9FB] text-[#191C1E]">
      <Dialog open={!guest}>
        <DialogContent className="rounded border-[#E2E8F0] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.35)] sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-[-0.03em]">What should we call you?</DialogTitle>
            <DialogDescription>No account required. This browser gets its own JobPilot workspace.</DialogDescription>
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
              className="h-10 rounded border-[#E2E8F0]"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={saveName}
              disabled={busyAction === "name" || !name.trim()}
              className="h-10 rounded bg-[#2F8F5B] font-mono text-[12px] hover:bg-[#006D3E] active:translate-y-px"
            >
              {busyAction === "name" ? "Preparing workspace" : "Enter workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[256px_1fr]">
        <aside className="hidden border-r border-[#E2E8F0] bg-white lg:block">{nav}</aside>
        <main className="min-w-0">
          <TopBar
            guest={guest}
            quota={quota}
            search={search}
            setSearch={setSearch}
            mobileNavOpen={mobileNavOpen}
            setMobileNavOpen={setMobileNavOpen}
          />
          {mobileNavOpen ? <div className="border-b border-[#E2E8F0] bg-white lg:hidden">{nav}</div> : null}
          <div className="mx-auto max-w-[1440px] px-4 py-4 md:px-6 md:py-6">
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
    <div className="grid min-h-[100dvh] grid-cols-1 bg-[#F7F9FB] lg:grid-cols-[256px_1fr]">
      <div className="hidden border-r border-[#E2E8F0] bg-white p-4 lg:block">
        <Skeleton className="h-8 w-32 rounded" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded" />
          ))}
        </div>
      </div>
      <div className="p-6">
        <Skeleton className="h-12 w-full rounded" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded" />
          ))}
        </div>
        <Skeleton className="mt-4 h-[420px] rounded" />
      </div>
    </div>
  );
}

function Navigation({
  view,
  setView,
  onNavigate,
  onAdd,
}: {
  view: View;
  setView: (view: View) => void;
  onNavigate: () => void;
  onAdd: () => void;
}) {
  const items = [
    ["dashboard", LayoutDashboard, "Dashboard"],
    ["applications", BriefcaseBusiness, "Applications"],
    ["resume", FileText, "Resume Analyzer"],
    ["interviews", ClipboardList, "Interview Prep"],
    ["settings", Settings, "Settings"],
  ] as const;

  return (
    <div className="flex h-full min-h-[100dvh] flex-col">
      <div className="border-b border-[#E2E8F0] p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded bg-[#18181B] font-mono text-[12px] font-semibold text-white">JP</div>
          <div>
            <p className="text-[14px] font-semibold tracking-[-0.02em]">Command Center</p>
            <p className="font-mono text-[11px] text-[#64748B]">v2.1.0-stable</p>
          </div>
        </div>
        <Button
          onClick={onAdd}
          className="mt-4 h-9 w-full rounded bg-[#2F8F5B] font-mono text-[12px] hover:bg-[#006D3E] active:translate-y-px"
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
              "mx-2 h-10 w-[calc(100%-1rem)] justify-start gap-3 rounded px-3 text-[14px] font-medium text-[#47464B] active:translate-y-px",
              view === id && "border-r-2 border-[#2F8F5B] bg-[#F2F4F6] font-semibold text-[#2F8F5B] hover:bg-[#F2F4F6]",
            )}
            onClick={() => {
              setView(id);
              onNavigate();
            }}
          >
            <Icon className="size-[18px]" />
            {label}
          </Button>
        ))}
      </div>
      <div className="border-t border-[#E2E8F0] p-3">
        <div className="rounded border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <p className="font-mono text-[11px] font-semibold uppercase text-[#18181B]">Guest mode</p>
          <p className="mt-1 text-[13px] leading-5 text-[#64748B]">No login. Three AI actions reset daily.</p>
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
    <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-white">
      <div className="mx-auto flex h-12 max-w-[1440px] items-center gap-4 px-4 md:px-6">
        <Button variant="ghost" size="icon" className="size-8 rounded lg:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
          <Menu className="size-5" />
        </Button>
        <p className="hidden text-[18px] font-semibold tracking-[-0.03em] text-[#18181B] md:block">JobPilot AI</p>
        <div className="hidden h-8 w-full max-w-sm items-center rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 md:flex">
          <Search className="mr-2 size-4 text-[#64748B]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search applications..."
            className="h-7 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
          />
          <span className="rounded border border-[#E2E8F0] bg-white px-1 font-mono text-[11px] text-[#64748B]">/</span>
        </div>
        <div className="min-w-0 flex-1 md:hidden">
          <p className="truncate text-[14px] font-medium">Good to see you{guest ? `, ${guest.name}` : ""}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="h-8 rounded border-[#E2E8F0] bg-[#F2F4F6] font-mono text-[11px] text-[#18181B]">
            {quota.remaining}/{quota.limit} AI Quota
          </Badge>
          <Button variant="ghost" size="icon" className="hidden size-8 rounded text-[#64748B] md:inline-flex">
            <Bell className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden size-8 rounded text-[#64748B] md:inline-flex">
            <HelpCircle className="size-4" />
          </Button>
          <div className="grid size-8 place-items-center rounded border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-[11px] font-semibold text-[#18181B]">
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
    ["Total Applied", data.analytics.totalApplications, Send, `${data.analytics.applicationsThisWeek} this week`],
    ["Active Interviews", data.analytics.byStatus["Technical Interview"] + data.analytics.byStatus["HR Interview"], BriefcaseBusiness, "Across pipeline"],
    ["Offer Rate", `${data.analytics.offerRate}%`, CheckCircle2, `${data.analytics.rejectedCount} closed rejects`],
  ] as const;
  const maxStatus = Math.max(1, ...APPLICATION_STATUSES.map((status) => data.analytics.byStatus[status]));
  const readiness = Math.min(100, 42 + Math.min(data.analytics.totalApplications, 8) * 4 + data.analytics.interviewRate);

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.04em]">Precision Dashboard</h1>
          <p className="mt-1 text-[14px] text-[#64748B]">A command-center view of your job search pipeline.</p>
        </div>
        <Button onClick={onAdd} className="h-9 rounded bg-[#2F8F5B] font-mono text-[12px] hover:bg-[#006D3E] active:translate-y-px">
          <Plus className="size-4" />
          New Application
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(([label, value, Icon, helper], index) => (
          <div
            key={label}
            className={cn("rounded border border-[#E2E8F0] bg-white p-3", index === 1 && "border-l-4 border-l-[#2F8F5B]")}
          >
            <div className="flex items-start justify-between">
              <p className="font-mono text-[12px] font-medium uppercase text-[#64748B]">{label}</p>
              <Icon className="size-4 text-[#64748B]" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="font-mono text-[24px] font-semibold leading-none text-[#18181B]">{value}</p>
              <p className="text-[11px] text-[#64748B]">{helper}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="grid gap-4">
          <section className="rounded border border-[#E2E8F0] bg-white">
            <SectionHeader title="Application Pipeline" action="Filter" />
            <div className="p-3 pt-6">
              <div className="flex h-40 items-end gap-1">
                {APPLICATION_STATUSES.map((status) => {
                  const count = data.analytics.byStatus[status];
                  return (
                    <div key={status} className="group flex flex-1 flex-col justify-end">
                      <div
                        className={cn(
                          "w-full rounded-t bg-[#E0E3E5] transition-colors group-hover:bg-[#C8C5CB]",
                          status === "Offer" && "bg-[#2F8F5B]",
                          status === "Technical Interview" && "bg-[#64748B]",
                        )}
                        style={{ height: `${Math.max(6, (count / maxStatus) * 100)}%` }}
                      />
                      <div className="mt-2 truncate text-center font-mono text-[11px] text-[#64748B]">{statusMeta[status].label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded border border-[#E2E8F0] bg-white">
            <SectionHeader title="Recent Applications" action="View all" />
            <div>
              {data.applications.slice(0, 4).map((application) => (
                <Button
                  key={application.id}
                  variant="ghost"
                  className="h-auto w-full justify-start gap-3 rounded-none border-b border-[#E2E8F0] p-3 text-left last:border-b-0 hover:bg-[#F8FAFC]"
                  onClick={() => {
                    setSelectedApplicationId(application.id);
                    setView("applications");
                  }}
                >
                  <CompanyMark company={application.companyName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <p className="truncate text-[13px] font-medium text-[#18181B]">
                        {application.role} - {application.companyName}
                      </p>
                      <span className="font-mono text-[11px] text-[#64748B]">{application.applicationDate}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-[#64748B]">
                      Status changed to <span className="rounded bg-[#E6E8EA] px-1 font-mono text-[#18181B]">{application.status}</span>
                    </p>
                  </div>
                </Button>
              ))}
              {!data.applications.length ? <EmptyState title="No applications yet" description="Create the first job card to start the pipeline." /> : null}
            </div>
          </section>
        </div>

        <div className="grid gap-4">
          <section className="relative overflow-hidden rounded border border-[#18181B] bg-white">
            <div className="absolute inset-0 opacity-[0.04] [background-image:radial-gradient(#18181B_1px,transparent_1px)] [background-size:8px_8px]" />
            <SectionHeader title="AI Copilot Status" icon={<Bot className="size-4 text-[#2F8F5B]" />} />
            <div className="relative z-10 flex items-center gap-4 p-3">
              <ReadinessRing value={readiness} />
              <div>
                <p className="text-[13px] font-medium">Ready for dispatch</p>
                <p className="mt-1 text-[11px] leading-4 text-[#64748B]">Use {quota.remaining} more AI actions today.</p>
              </div>
            </div>
            <div className="relative z-10 p-3 pt-0">
              <Button
                variant="outline"
                className="h-8 w-full rounded border-[#E2E8F0] font-mono text-[12px] active:translate-y-px"
                onClick={() => setView("resume")}
              >
                Run Diagnostics
              </Button>
            </div>
          </section>

          <section className="rounded border border-[#E2E8F0] bg-white">
            <SectionHeader title="Action Items" />
            <div className="grid gap-2 p-3">
              {upcomingFollowUps.length ? (
                upcomingFollowUps.map((application) => (
                  <Button
                    key={application.id}
                    variant="outline"
                    className="h-auto justify-start gap-3 rounded border-[#E2E8F0] bg-white p-3 text-left hover:border-[#64748B]"
                    onClick={() => {
                      setSelectedApplicationId(application.id);
                      setView("applications");
                    }}
                  >
                    <FollowUpBadge application={application} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{application.companyName}</p>
                      <p className="mt-1 truncate text-[12px] text-[#64748B]">{application.role}</p>
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
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.04em]">Applications</h1>
          <p className="mt-1 text-[14px] text-[#64748B]">Precision kanban for active opportunities.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApplicationStatus | "All")}>
            <SelectTrigger className="h-9 rounded border-[#E2E8F0] text-[13px] sm:w-48">
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
            <SelectTrigger className="h-9 rounded border-[#E2E8F0] text-[13px] sm:w-44">
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
              <Button className="h-9 rounded bg-[#2F8F5B] font-mono text-[12px] hover:bg-[#006D3E] active:translate-y-px">
                <Plus className="size-4" />
                New Application
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Add application</SheetTitle>
                <SheetDescription>Capture the opportunity while the details are fresh.</SheetDescription>
              </SheetHeader>
              <ApplicationForm form={form} setForm={setForm} onSave={createApplication} busy={busyAction === "create-application"} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <ScrollArea className="h-[calc(100dvh-150px)] min-h-[520px] w-full max-w-full overflow-hidden rounded">
        <div className="flex h-full min-w-max items-start gap-4 pb-4">
          {APPLICATION_STATUSES.map((status) => {
            const laneItems = applications.filter((application) => application.status === status);
            return (
              <div key={status} className="flex h-full w-[320px] shrink-0 flex-col rounded border border-[#E2E8F0] bg-white">
                <div className="flex h-10 items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", statusMeta[status].dot)} />
                    <p className="text-[14px] font-semibold tracking-[-0.02em] text-[#18181B]">{status}</p>
                  </div>
                  <Badge variant="secondary" className="h-6 rounded border border-[#E2E8F0] bg-[#F2F4F6] font-mono text-[11px]">
                    {laneItems.length}
                  </Badge>
                </div>
                <div className="grid gap-2 overflow-y-auto p-2">
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
                    <div className="rounded border border-dashed border-[#E2E8F0] p-4 text-[13px] text-[#64748B]">No items</div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex h-full w-10 shrink-0 flex-col items-center pt-2">
            <Button variant="outline" size="icon" className="size-8 rounded border-dashed border-[#E2E8F0]">
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
          <Label className="font-mono text-[12px] uppercase text-[#64748B]">Status</Label>
          <Select value={form.status} onValueChange={(value) => update("status", value)}>
            <SelectTrigger className="h-10 rounded border-[#E2E8F0]">
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
        <Label className="font-mono text-[12px] uppercase text-[#64748B]">Notes</Label>
        <Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-28 rounded border-[#E2E8F0]" />
      </div>
      <Button onClick={onSave} disabled={busy} className="h-10 rounded bg-[#2F8F5B] font-mono text-[12px] hover:bg-[#006D3E]">
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
      <Label className="font-mono text-[12px] uppercase text-[#64748B]">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded border-[#E2E8F0]"
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
    <div className={cn("rounded border bg-white p-3 transition-colors hover:bg-[#FBFCFD]", statusMeta[application.status].border)}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <CompanyMark company={application.companyName} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-[#18181B]">{application.role}</p>
            <p className="mt-1 truncate text-[13px] text-[#64748B]">
              {application.companyName} {application.location ? `- ${application.location}` : ""}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="size-7 shrink-0 rounded text-[#64748B]">
          <MoreHorizontal className="size-4" />
        </Button>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-[#64748B]">{formatCurrency(application.salary)}</span>
          {application.sourcePlatform ? (
            <span className="rounded border border-[#E2E8F0] bg-[#F2F4F6] px-1.5 py-0.5 font-mono text-[10px] text-[#64748B]">
              via {application.sourcePlatform}
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-[#64748B]">Applied: {application.applicationDate}</span>
          <FollowUpBadge application={application} />
        </div>
        <Select value={application.status} onValueChange={(value) => updateApplication(application.id, { status: value as ApplicationStatus })}>
          <SelectTrigger className="h-8 rounded border-[#E2E8F0] text-[12px]">
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
              <Button variant="outline" size="sm" className="h-8 flex-1 rounded border-[#E2E8F0] font-mono text-[11px]">
                <PanelRightOpen className="size-3.5" />
                Detail
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
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
                <p className="text-[13px] leading-6 text-[#64748B]">
                  Keep notes truthful and specific. Use AI output as draft guidance, not a guarantee of outcomes.
                </p>
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="outline" size="icon" className="size-8 rounded border-[#E2E8F0]" disabled={busy} onClick={() => deleteApplication(application.id)}>
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
        state === "scheduled" && "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]",
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
  return (
    <div className="grid gap-4">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.04em]">AI Workspace</h1>
          <p className="mt-1 text-[14px] text-[#64748B]">Analyze a resume against a selected opportunity.</p>
        </div>
        <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
          <SelectTrigger className="h-9 rounded border-[#E2E8F0] xl:w-80">
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
      </div>

      {quota.remaining <= 0 ? <QuotaBlocked /> : null}

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded border border-[#E2E8F0] bg-white">
          <SectionHeader title="Analysis Context" icon={<FileText className="size-4 text-[#64748B]" />} action="Ready" />
          <div className="grid gap-4 p-3">
            <div className="grid gap-2">
              <Label className="font-mono text-[12px] uppercase text-[#64748B]">Job description</Label>
              <Textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste target job description here..."
                className="min-h-36 rounded border-[#E2E8F0] bg-[#F8FAFC]"
              />
            </div>
            <div className="grid gap-2">
              <Label className="font-mono text-[12px] uppercase text-[#64748B]">Resume content</Label>
              <Textarea
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="Paste current resume text here..."
                className="min-h-56 rounded border-[#E2E8F0] bg-[#F8FAFC]"
              />
            </div>
          </div>
          <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <Button
              onClick={analyzeResume}
              disabled={busy || quota.remaining <= 0}
              className="h-9 w-full rounded bg-[#18181B] font-mono text-[12px] hover:bg-[#2D3133]"
            >
              <Bot className="size-4" />
              {busy ? "Analyzing" : "Run Analysis"}
            </Button>
          </div>
        </section>
        <section className="rounded border border-[#E2E8F0] bg-white">
          <SectionHeader title="Analysis Results" icon={<BarChart3 className="size-4 text-[#64748B]" />} action="Export Report" />
          <div className="p-3">{busy ? <AnalysisSkeleton /> : analysis ? <AnalysisPanel analysis={analysis} /> : <EmptyState title="No analysis yet" description="Run an analysis to see score, keywords, and rewritten bullets." />}</div>
        </section>
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-20 w-full rounded" />
      <Skeleton className="h-24 w-full rounded" />
      <Skeleton className="h-32 w-full rounded" />
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: ResumeAnalysis }) {
  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-5 rounded border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <div className="grid size-16 place-items-center rounded-full border-4 border-[#7CDA9E] bg-white">
          <span className="font-mono text-[24px] font-semibold text-[#2F8F5B]">{analysis.score}</span>
        </div>
        <div>
          <p className="text-[14px] font-semibold">ATS Match Score</p>
          <p className="mt-1 text-[13px] text-[#64748B]">{analysis.finalRecommendation}</p>
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
      <div>
        <p className="border-b border-[#E2E8F0] pb-1 font-mono text-[12px] font-medium uppercase text-[#64748B]">{title}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge
              key={item}
              variant="outline"
              className={cn(
                "rounded font-mono text-[11px]",
                tone === "risk" && "border-[#B94A48]/20 bg-[#FFDAD6] text-[#93000A]",
                tone === "success" && "border-[#2F8F5B]/20 bg-[#7CDA9E] text-[#00210F]",
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
    <div>
      <p className="border-b border-[#E2E8F0] pb-1 font-mono text-[12px] font-medium uppercase text-[#64748B]">{title}</p>
      <div className="mt-2 grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-[13px] leading-6 text-[#47464B]">
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

  return (
    <div className="grid gap-4">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.04em]">Interview Prep</h1>
          <p className="mt-1 text-[14px] text-[#64748B]">Grouped practice prompts with answer notes.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
            <SelectTrigger className="h-9 rounded border-[#E2E8F0] xl:w-80">
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
            className="h-9 rounded bg-[#18181B] font-mono text-[12px] hover:bg-[#2D3133]"
          >
            <Bot className="size-4" />
            {busy ? "Generating" : "Generate"}
          </Button>
        </div>
      </div>

      {quota.remaining <= 0 ? <QuotaBlocked /> : null}

      <div className="grid gap-4">
        {grouped.map((group) => (
          <section key={group.category} className="rounded border border-[#E2E8F0] bg-white">
            <SectionHeader title={group.category} action={`${group.questions.length} prompts`} />
            <div className="grid gap-3 bg-[#F8FAFC] p-3 md:grid-cols-2 xl:grid-cols-3">
              {group.questions.length ? (
                group.questions.map((question) => (
                  <div key={question.id} className="grid gap-3 rounded border border-[#E2E8F0] bg-white p-3 hover:border-[#64748B]">
                    <div className="flex gap-3">
                      <Checkbox
                        checked={question.practiced}
                        onCheckedChange={(checked) => updateQuestion(question.id, { practiced: checked === true })}
                        className="mt-1"
                      />
                      <p className={cn("text-[13px] leading-5", question.practiced && "text-[#64748B] line-through")}>{question.question}</p>
                    </div>
                    <Textarea
                      value={question.answerNotes}
                      onChange={(event) => updateQuestion(question.id, { answerNotes: event.target.value })}
                      placeholder="Answer notes"
                      className="min-h-20 rounded border-[#E2E8F0]"
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
    <div className="grid max-w-3xl gap-4">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.04em]">Settings</h1>
        <p className="mt-1 text-[14px] text-[#64748B]">A lightweight local workspace. No account is required.</p>
      </div>
      <section className="rounded border border-[#E2E8F0] bg-white">
        <SectionHeader title="Workspace identity" />
        <div className="grid gap-4 p-3">
          <Field label="Display name" value={name || guest?.name || ""} onChange={setName} />
          <Button onClick={saveName} className="h-9 w-fit rounded bg-[#2F8F5B] font-mono text-[12px] hover:bg-[#006D3E]">
            Save name
          </Button>
        </div>
      </section>
      <section className="rounded border border-[#E2E8F0] bg-white">
        <SectionHeader title="AI usage" />
        <div className="p-3">
          <p className="font-mono text-[24px] font-semibold">
            {quota.used}/{quota.limit}
          </p>
          <p className="mt-1 text-[13px] text-[#64748B]">actions used today</p>
          <Progress value={(quota.used / quota.limit) * 100} className="mt-4 h-2 rounded" />
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, action, icon }: { title: string; action?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex h-10 items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-[14px] font-semibold tracking-[-0.02em] text-[#18181B]">{title}</h2>
      </div>
      {action ? <span className="font-mono text-[11px] text-[#64748B]">{action}</span> : null}
    </div>
  );
}

function CompanyMark({ company }: { company: string }) {
  return (
    <div className="grid size-8 shrink-0 place-items-center rounded border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-[10px] font-bold text-[#18181B]">
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
    <div className="rounded border border-[#B94A48]/30 bg-[#FFF4F2] p-3 text-[13px] text-[#B94A48]">
      Daily AI limit reached. Come back tomorrow to run more AI actions.
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <p className="text-[13px] font-semibold">{title}</p>
      <p className="mt-1 text-[13px] leading-5 text-[#64748B]">{description}</p>
    </div>
  );
}
