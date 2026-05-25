"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  PanelRightOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { APPLICATION_STATUSES, QUESTION_CATEGORIES, type AiQuota, type Application, type ApplicationStatus, type DashboardAnalytics, type Guest, type InterviewQuestion, type ResumeAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }
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

  const selectedApplication =
    data.applications.find((application) => application.id === selectedApplicationId) ?? data.applications[0] ?? null;

  const sources = useMemo(
    () => Array.from(new Set(data.applications.map((application) => application.sourcePlatform).filter(Boolean))),
    [data.applications],
  );

  const filteredApplications = useMemo(() => {
    return data.applications.filter((application) => {
      const haystack = `${application.companyName} ${application.role} ${application.sourcePlatform} ${application.status}`.toLowerCase();
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
    if (!selectedApplicationId && payload.applications[0]) {
      setSelectedApplicationId(payload.applications[0].id);
    }
  }

  async function refreshSession() {
    const payload = await readJson<{ guest: Guest | null; quota: AiQuota }>(await fetch("/api/session"));
    setGuest(payload.guest);
    setQuota(payload.quota);
    setName(payload.guest?.name ?? "");
    if (payload.guest) {
      await refreshData();
    }
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
      await readJson<{ ok: boolean }>(
        await fetch(`/api/applications/${id}`, {
          method: "DELETE",
        }),
      );
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

  if (loading) {
    return <LoadingShell />;
  }

  const nav = <Navigation view={view} setView={setView} onNavigate={() => setMobileNavOpen(false)} />;

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] text-[#18181B]">
      <Dialog open={!guest}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>What should JobPilot call you?</DialogTitle>
            <DialogDescription>
              No account required. Your workspace is saved locally for this browser session.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="guest-name">Name</Label>
            <Input
              id="guest-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Hafiz"
              className="h-11"
            />
          </div>
          <DialogFooter>
            <Button onClick={saveName} disabled={busyAction === "name" || !name.trim()} className="h-11 bg-[#2F8F5B] hover:bg-[#267A4E]">
              {busyAction === "name" ? "Preparing workspace" : "Enter workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[260px_1fr]">
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
          <div className="mx-auto max-w-[1440px] px-4 py-5 md:px-6 md:py-6">
            {view === "dashboard" ? (
              <DashboardView
                data={data}
                quota={quota}
                upcomingFollowUps={upcomingFollowUps}
                setView={setView}
                setSelectedApplicationId={setSelectedApplicationId}
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
            {view === "settings" ? <SettingsView guest={guest} quota={quota} name={name} setName={setName} saveName={saveName} /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="grid min-h-[100dvh] grid-cols-1 bg-[#F8FAFC] lg:grid-cols-[260px_1fr]">
      <div className="hidden border-r border-[#E2E8F0] bg-white p-5 lg:block">
        <Skeleton className="h-8 w-32" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="p-6">
        <Skeleton className="h-12 w-full" />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="mt-6 h-[420px]" />
      </div>
    </div>
  );
}

function Navigation({
  view,
  setView,
  onNavigate,
}: {
  view: View;
  setView: (view: View) => void;
  onNavigate: () => void;
}) {
  const items = [
    ["dashboard", LayoutDashboard, "Dashboard"],
    ["applications", BriefcaseBusiness, "Applications"],
    ["resume", FileText, "Resume Analyzer"],
    ["interviews", ClipboardList, "Interview Prep"],
    ["settings", Settings, "Settings"],
  ] as const;

  return (
    <div className="flex h-full min-h-[100dvh] flex-col p-4">
      <div className="flex h-12 items-center gap-3 px-2">
        <div className="grid size-9 place-items-center rounded-lg bg-[#2F8F5B] text-sm font-semibold text-white">JP</div>
        <div>
          <p className="text-sm font-semibold">JobPilot AI</p>
          <p className="text-xs text-[#64748B]">Job search OS</p>
        </div>
      </div>
      <Separator className="my-4" />
      <div className="grid gap-1">
        {items.map(([id, Icon, label]) => (
          <Button
            key={id}
            variant={view === id ? "secondary" : "ghost"}
            className={cn(
              "h-11 justify-start gap-3 rounded-lg px-3 text-sm",
              view === id && "bg-[#EAF6EF] text-[#1F6F45] hover:bg-[#EAF6EF]",
            )}
            onClick={() => {
              setView(id);
              onNavigate();
            }}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </div>
      <div className="mt-auto rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
        <p className="text-xs font-medium text-[#18181B]">Open demo mode</p>
        <p className="mt-1 text-xs leading-5 text-[#64748B]">
          No account required. AI actions are limited daily to keep the app usable for everyone.
        </p>
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
    <header className="sticky top-0 border-b border-[#E2E8F0] bg-white/95 px-4 py-3 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
          <Menu className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Good to see you{guest ? `, ${guest.name}` : ""}</p>
          <p className="text-xs text-[#64748B]">Track applications, prep smarter, follow up on time.</p>
        </div>
        <div className="hidden w-full max-w-sm items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 md:flex">
          <Search className="size-4 text-[#64748B]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search company, role, source"
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <QuotaBadge quota={quota} />
      </div>
    </header>
  );
}

function QuotaBadge({ quota }: { quota: AiQuota }) {
  return (
    <Badge variant="outline" className="h-9 rounded-lg border-[#CFE8DA] bg-[#F1FAF5] px-3 font-mono text-[11px] text-[#1F6F45]">
      AI {quota.used}/{quota.limit} today
    </Badge>
  );
}

function DashboardView({
  data,
  quota,
  upcomingFollowUps,
  setView,
  setSelectedApplicationId,
}: {
  data: AppData;
  quota: AiQuota;
  upcomingFollowUps: Application[];
  setView: (view: View) => void;
  setSelectedApplicationId: (id: string) => void;
}) {
  const metrics = [
    ["Total applications", data.analytics.totalApplications, BriefcaseBusiness],
    ["Interview rate", `${data.analytics.interviewRate}%`, BarChart3],
    ["Offer rate", `${data.analytics.offerRate}%`, CheckCircle2],
    ["Overdue follow-ups", data.analytics.overdueFollowUps, AlertTriangle],
  ] as const;

  return (
    <div className="grid min-w-0 gap-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[#64748B]">A focused view of your job search pipeline.</p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="h-11 bg-[#2F8F5B] hover:bg-[#267A4E]">
              <Plus className="size-4" />
              Add Application
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg">
            <AddApplicationPanel />
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label} className="rounded-lg border-[#E2E8F0] shadow-none">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">{label}</p>
                <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
              </div>
              <div className="grid size-10 place-items-center rounded-lg bg-[#EAF6EF] text-[#1F6F45]">
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="rounded-lg border-[#E2E8F0] shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Status distribution</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {APPLICATION_STATUSES.map((status) => {
              const value = data.analytics.byStatus[status];
              const percent = data.analytics.totalApplications ? (value / data.analytics.totalApplications) * 100 : 0;
              return (
                <div key={status} className="grid gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{status}</span>
                    <span className="font-mono text-[#64748B]">{value}</span>
                  </div>
                  <Progress value={percent} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card className="rounded-lg border-[#E2E8F0] shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Daily AI limit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-3xl font-semibold">{quota.remaining}</p>
                  <p className="text-sm text-[#64748B]">actions left today</p>
                </div>
                <Sparkles className="size-8 text-[#2F8F5B]" />
              </div>
              <Progress value={(quota.used / quota.limit) * 100} className="mt-4 h-2" />
              <p className="mt-3 text-xs leading-5 text-[#64748B]">
                Every resume analysis or question generation uses one action.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-[#E2E8F0] shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Upcoming follow-ups</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {upcomingFollowUps.length ? (
                upcomingFollowUps.map((application) => (
                  <Button
                    key={application.id}
                    variant="ghost"
                    className="h-auto justify-start rounded-lg border border-[#E2E8F0] bg-white p-3 text-left"
                    onClick={() => {
                      setSelectedApplicationId(application.id);
                      setView("applications");
                    }}
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{application.companyName}</span>
                        <FollowUpBadge application={application} />
                      </div>
                      <p className="mt-1 text-xs text-[#64748B]">{application.role}</p>
                    </div>
                  </Button>
                ))
              ) : (
                <EmptyState title="No follow-ups scheduled" description="Add dates to application cards to keep momentum visible." />
              )}
            </CardContent>
          </Card>
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
}) {
  return (
    <div className="grid min-w-0 gap-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="mt-1 text-sm text-[#64748B]">Move opportunities through a clear hiring pipeline.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApplicationStatus | "All")}>
            <SelectTrigger className="h-11 w-full sm:w-48">
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
            <SelectTrigger className="h-11 w-full sm:w-44">
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
          <Sheet>
            <SheetTrigger asChild>
              <Button className="h-11 bg-[#2F8F5B] hover:bg-[#267A4E]">
                <Plus className="size-4" />
                Add Application
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

      <ScrollArea className="w-full max-w-full overflow-hidden">
        <div className="grid min-w-[1480px] grid-cols-7 gap-3 pb-4">
          {APPLICATION_STATUSES.map((status) => {
            const laneItems = applications.filter((application) => application.status === status);
            return (
              <div key={status} className="rounded-lg border border-[#E2E8F0] bg-white">
                <div className="flex h-12 items-center justify-between border-b border-[#E2E8F0] px-3">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">{status}</p>
                  <Badge variant="secondary" className="rounded-md font-mono">
                    {laneItems.length}
                  </Badge>
                </div>
                <div className="grid gap-3 p-3">
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
                    <div className="rounded-lg border border-dashed border-[#E2E8F0] p-4 text-sm text-[#64748B]">No items</div>
                  )}
                </div>
              </div>
            );
          })}
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
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(value) => update("status", value)}>
            <SelectTrigger className="h-11">
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
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className="min-h-28" />
      </div>
      <Button onClick={onSave} disabled={busy} className="h-11 bg-[#2F8F5B] hover:bg-[#267A4E]">
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
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11" />
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
    <Card className="rounded-lg border-[#E2E8F0] shadow-none transition-transform active:translate-y-px">
      <CardContent className="grid gap-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{application.companyName}</p>
            <p className="mt-1 line-clamp-2 text-xs text-[#64748B]">{application.role}</p>
          </div>
          <FollowUpBadge application={application} />
        </div>
        <div className="grid gap-1 text-xs text-[#64748B]">
          <div className="flex justify-between gap-2">
            <span>Source</span>
            <span className="truncate font-medium text-[#18181B]">{application.sourcePlatform || "Manual"}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Salary</span>
            <span className="font-mono text-[#18181B]">{formatCurrency(application.salary)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Applied</span>
            <span className="font-mono text-[#18181B]">{application.applicationDate}</span>
          </div>
        </div>
        <Select value={application.status} onValueChange={(value) => updateApplication(application.id, { status: value as ApplicationStatus })}>
          <SelectTrigger className="h-9 text-xs">
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
              <Button variant="outline" size="sm" className="flex-1">
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
                  onChange={(value) => updateApplication(application.id, { followUpDate: value })}
                />
                <Separator />
                <p className="text-sm leading-6 text-[#64748B]">
                  Keep notes truthful and specific. Use AI output as draft guidance, not a guarantee of outcomes.
                </p>
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="outline" size="icon" disabled={busy} onClick={() => deleteApplication(application.id)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FollowUpBadge({ application }: { application: Application }) {
  const state = followUpState(application);
  if (state === "none") return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md font-mono text-[10px]",
        state === "overdue" && "border-[#F1C2BE] bg-[#FFF4F2] text-[#B94A48]",
        state === "upcoming" && "border-[#F2D9AE] bg-[#FFF8EA] text-[#B7791F]",
        state === "scheduled" && "border-[#D5E3F5] bg-[#F3F7FC] text-[#47617B]",
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
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resume Analyzer</h1>
          <p className="mt-1 text-sm text-[#64748B]">Paste text, compare against a role, and save structured feedback.</p>
        </div>
        <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
          <SelectTrigger className="h-11 w-full xl:w-80">
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

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg border-[#E2E8F0] shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Inputs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Resume text</Label>
              <Textarea value={resumeText} onChange={(event) => setResumeText(event.target.value)} className="min-h-56" />
            </div>
            <div className="grid gap-2">
              <Label>Job description</Label>
              <Textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} className="min-h-56" />
            </div>
            <Button onClick={analyzeResume} disabled={busy || quota.remaining <= 0} className="h-11 bg-[#2F8F5B] hover:bg-[#267A4E]">
              {busy ? "Analyzing" : "Analyze resume"}
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-[#E2E8F0] shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Structured feedback</CardTitle>
          </CardHeader>
          <CardContent>
            {busy ? <AnalysisSkeleton /> : analysis ? <AnalysisPanel analysis={analysis} /> : <EmptyState title="No analysis yet" description="Run an analysis to see score, missing keywords, and rewritten bullets." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-16 w-32" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: ResumeAnalysis }) {
  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#64748B]">Readiness score</p>
        <p className="mt-1 font-mono text-5xl font-semibold">{analysis.score}</p>
      </div>
      <InsightList title="Strengths" items={analysis.strengths} />
      <InsightList title="Missing keywords" items={analysis.missingKeywords} asBadges />
      <InsightList title="Suggested improvements" items={analysis.suggestions} />
      <InsightList title="Rewritten bullet examples" items={analysis.rewrittenBullets} />
      <div className="rounded-lg border border-[#CFE8DA] bg-[#F1FAF5] p-4 text-sm leading-6 text-[#1F6F45]">
        {analysis.finalRecommendation}
      </div>
    </div>
  );
}

function InsightList({ title, items, asBadges = false }: { title: string; items: string[]; asBadges?: boolean }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      {asBadges ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="rounded-md">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="mt-2 grid gap-2 text-sm leading-6 text-[#64748B]">
          {items.map((item) => (
            <div key={item} className="rounded-lg border border-[#E2E8F0] bg-white p-3">
              {item}
            </div>
          ))}
        </div>
      )}
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
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Interview Prep</h1>
          <p className="mt-1 text-sm text-[#64748B]">Generate role-specific practice questions and track progress.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
            <SelectTrigger className="h-11 w-full xl:w-80">
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
          <Button onClick={generateInterviewQuestions} disabled={busy || quota.remaining <= 0} className="h-11 bg-[#2F8F5B] hover:bg-[#267A4E]">
            {busy ? "Generating" : "Generate questions"}
          </Button>
        </div>
      </div>

      {quota.remaining <= 0 ? <QuotaBlocked /> : null}

      <div className="grid gap-4">
        {grouped.map((group) => (
          <Card key={group.category} className="rounded-lg border-[#E2E8F0] shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{group.category}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {group.questions.length ? (
                group.questions.map((question) => (
                  <div key={question.id} className="grid gap-3 rounded-lg border border-[#E2E8F0] bg-white p-4">
                    <div className="flex gap-3">
                      <Checkbox
                        checked={question.practiced}
                        onCheckedChange={(checked) => updateQuestion(question.id, { practiced: checked === true })}
                      />
                      <p className={cn("text-sm leading-6", question.practiced && "text-[#64748B] line-through")}>{question.question}</p>
                    </div>
                    <Textarea
                      value={question.answerNotes}
                      onChange={(event) => updateQuestion(question.id, { answerNotes: event.target.value })}
                      placeholder="Answer notes"
                      className="min-h-20"
                    />
                  </div>
                ))
              ) : (
                <EmptyState title="No questions yet" description="Generate questions for the selected application." />
              )}
            </CardContent>
          </Card>
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
    <div className="grid max-w-3xl gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[#64748B]">A lightweight local workspace. No account is required.</p>
      </div>
      <Card className="rounded-lg border-[#E2E8F0] shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Workspace identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Display name" value={name || guest?.name || ""} onChange={setName} />
          <Button onClick={saveName} className="h-11 w-fit bg-[#2F8F5B] hover:bg-[#267A4E]">
            Save name
          </Button>
        </CardContent>
      </Card>
      <Card className="rounded-lg border-[#E2E8F0] shadow-none">
        <CardHeader>
          <CardTitle className="text-base">AI usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-3xl font-semibold">
            {quota.used}/{quota.limit}
          </p>
          <p className="mt-1 text-sm text-[#64748B]">actions used today</p>
          <Progress value={(quota.used / quota.limit) * 100} className="mt-4 h-2" />
        </CardContent>
      </Card>
    </div>
  );
}

function QuotaBlocked() {
  return (
    <div className="rounded-lg border border-[#F1C2BE] bg-[#FFF4F2] p-4 text-sm text-[#B94A48]">
      Daily AI limit reached. Come back tomorrow to run more AI actions.
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-5">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>
    </div>
  );
}

function AddApplicationPanel() {
  return (
    <div>
      <SheetHeader>
        <SheetTitle>Add application</SheetTitle>
        <SheetDescription>Open the Applications view to create and manage full details.</SheetDescription>
      </SheetHeader>
      <div className="mt-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#64748B]">
        Use the Applications board to add a new job, set follow-up dates, and move it between hiring stages.
      </div>
    </div>
  );
}
