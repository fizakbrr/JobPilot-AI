"use client";

import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardList,
  Database,
  FileSearch,
  GitBranch,
  Globe2,
  NotebookPen,
  Search,
  ShieldCheck,
} from "lucide-react";
import { APP_CONFIG } from "@/lib/jobpilot/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const landingPainPoints = [
  {
    title: "Applications get scattered",
    description: "Replace saved emails, notes, and sheets with one record per role.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Follow-ups slip",
    description: "Keep dates next to each role so the next message stays visible.",
    icon: CalendarClock,
  },
  {
    title: "Resume edits lose context",
    description: "Compare a resume with the job post you plan to apply for.",
    icon: FileSearch,
  },
  {
    title: "Interview notes split apart",
    description: "Keep practice prompts, answer notes, and status beside the role.",
    icon: NotebookPen,
  },
] as const;

const landingFeatures = [
  ["Application records", "Company, role, salary, source, dates, link, notes, and stage in one place.", BriefcaseBusiness],
  ["Follow-up dates", "Upcoming and overdue messages surface before they turn into missed replies.", CalendarClock],
  ["Resume review", "Find missing terms, strong matches, and rewrite candidates for one role.", FileSearch],
  ["Interview practice", "Generate role-specific prompts and keep notes next to each answer.", ClipboardList],
  ["Pipeline search", "Filter by stage, source, company, role, or saved text as the board grows.", Search],
  ["Local demo control", "Guest data stays tied to this browser session unless you clear it.", Database],
] as const;

const howItWorks = [
  ["Name the workspace", "Create a browser workspace without signing up."],
  ["Add a role", "Save the job details and set the current stage."],
  ["Use review credits", "Run resume review or interview prompts when the role needs extra prep."],
] as const;

const footerSocialLinks = [
  { label: "GitHub", href: "https://github.com/fizakbrr", icon: GitBranch },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/fizakbrr", icon: BriefcaseBusiness },
  { label: "Portfolio", href: "https://fizportfolio.vercel.app/", icon: Globe2 },
] as const;

export function LandingPage({ onStart }: { onStart: () => void }) {
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
            Open demo
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
              Public demo, no sign-up
            </p>
            <h1 className="max-w-5xl text-[44px] font-semibold leading-[0.96] text-balance md:text-[74px] lg:text-[88px]">
              Keep applications, follow-ups, resumes, and interviews in one place.
            </h1>
            <p className="mt-6 max-w-2xl text-[16px] leading-7 text-pretty text-[#E8DDC9] md:text-[18px]">
              Track roles, set reminders, compare a resume with a job post, and keep interview notes beside each application.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={onStart}
                className="group h-12 rounded-xl bg-[#D7D8A3] px-5 font-mono text-[12px] text-[#17201B] shadow-[0_22px_52px_-36px_rgba(221,232,95,0.95)] transition-[background-color,transform] hover:bg-[#E1E3B5] active:scale-[0.96]"
              >
                Open demo
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
              </Button>
              <Button
                variant="outline"
                onClick={scrollToFlow}
                className="h-12 rounded-xl border-white/18 bg-[#101B15]/58 px-5 font-mono text-[12px] text-[#F7FAF1] transition-[background-color,transform] hover:bg-[#17201B]/78 hover:text-[#F7FAF1] active:scale-[0.96]"
              >
                See the flow
              </Button>
            </div>
            <p className="mt-4 text-[13px] text-[#BFB5A4]">Manual tracking keeps working after review credits run out.</p>
          </div>

          <div className="landing-reveal mt-10 grid gap-3 border border-white/12 bg-[#101B15]/82 p-3 shadow-[0_28px_90px_-62px_rgba(0,0,0,0.9)] backdrop-blur md:grid-cols-[1.05fr_0.95fr] md:p-4" style={{ animationDelay: "120ms" }}>
            <div className="grid gap-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#87927E]">Application board</p>
                  <p className="mt-1 text-[16px] font-semibold text-white">Product designer at Northstar Labs</p>
                </div>
                <span className="bg-[#D7D8A3] px-2.5 py-1 font-mono text-[11px] text-[#17201B]">Screening</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr_0.9fr]">
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
                  <p className="font-mono text-[10px] uppercase text-[#BFB5A4]">Review credits</p>
                  <p className="mt-2 text-[14px] font-semibold text-white">3 left today</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="border border-white/10 bg-[#FEFCF7]/7 p-3">
                <p className="font-mono text-[10px] uppercase text-[#BFB5A4]">Resume review</p>
                <p className="mt-2 text-[13px] leading-5 text-[#F7FAF1]">Missing terms: accessibility research, design systems, user interviews.</p>
              </div>
              <div className="border border-white/10 bg-[#FEFCF7]/7 p-3">
                <p className="font-mono text-[10px] uppercase text-[#BFB5A4]">Interview note</p>
                <p className="mt-2 text-[13px] leading-5 text-[#F7FAF1]">Practice a story about roadmap tradeoffs with engineering.</p>
              </div>
              <div className="flex items-center gap-3 border border-[#D7D8A3]/30 bg-[#D7D8A3]/12 p-3 text-[#F7FAF1]">
                <ShieldCheck className="size-4 text-[#D7D8A3]" />
                <p className="text-[13px]">Resume review and interview prompts spend review credits. Tracking does not.</p>
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
                Job search work spreads across too many places.
              </h2>
              <p className="mt-5 max-w-lg text-[15px] leading-7 text-pretty text-[#62675F]">
                JobPilot keeps records, dates, resume notes, and interview prep close enough to act on.
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
            <div className="mb-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
              <div>
                <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#62675F]">Product preview</p>
                <h2 className="text-[34px] font-semibold leading-[1] text-balance md:text-[54px]">
                  The workspace starts with real job-search records.
                </h2>
              </div>
              <p className="max-w-xl text-[14px] leading-6 text-pretty text-[#62675F]">
                Each tool ties back to a role: tracking, follow-up, resume review, interview practice, and data control.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="border border-[#D4C8B5] bg-[#FBF8F0] p-3 shadow-[0_24px_70px_-56px_rgba(15,28,21,0.75)]">
                <div className="border border-[#DDD3C1] bg-[#FEFCF7] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDD3C1] pb-3">
                    <div>
                      <p className="font-mono text-[11px] uppercase text-[#62675F]">Pipeline</p>
                      <p className="mt-1 text-[18px] font-semibold text-[#17201B]">Track roles from wishlist to close.</p>
                    </div>
                    <Button onClick={onStart} className="h-10 rounded-xl bg-[#17201B] px-4 font-mono text-[12px] text-[#F7FAF1] active:scale-[0.96]">
                      Add application
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[0.95fr_1.1fr_0.95fr]">
                    {[
                      ["Wishlist", "Design systems lead", "Save job URL and salary range."],
                      ["Applied", "Frontend engineer", "Follow up on June 7."],
                      ["Interview", "Product designer", "Prepare portfolio story."],
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
                  <p className="font-mono text-[11px] uppercase text-[#62675F]">Resume review result</p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="grid size-16 place-items-center bg-[#17201B] font-mono text-[22px] font-semibold text-[#D7D8A3]">78</div>
                    <p className="text-[13px] leading-6 text-[#62675F]">Good baseline. Add evidence for accessibility audits and stakeholder research before applying.</p>
                  </div>
                </div>
                <div className="border border-[#DDD3C1] bg-[#FBF8F0] p-4 shadow-[0_18px_46px_-40px_rgba(15,28,21,0.6)]">
                  <p className="font-mono text-[11px] uppercase text-[#62675F]">Interview note</p>
                  <p className="mt-3 text-[14px] font-semibold text-[#17201B]">Tell me about a time you improved a hiring funnel.</p>
                  <p className="mt-2 text-[13px] leading-6 text-[#62675F]">Saved note: explain the metrics, tradeoffs, and what changed after launch.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 md:px-7 md:py-24">
          <div className="mx-auto grid max-w-375 gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#62675F]">Features</p>
              <h2 className="max-w-2xl text-[34px] font-semibold leading-[1] text-balance md:text-[54px]">
                Focused tools for application tracking.
              </h2>
            </div>
            <div className="border-y border-[#D4C8B5]">
              {landingFeatures.map(([title, description, Icon]) => (
                <article key={title} className="grid gap-4 border-b border-[#D4C8B5] py-5 last:border-b-0 md:grid-cols-[11rem_1fr] md:items-start">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center bg-[#ECE4D3] text-[#17201B]">
                      <Icon className="size-4.5" strokeWidth={1.6} />
                    </span>
                    <h3 className="text-[15px] font-semibold text-[#17201B]">{title}</h3>
                  </div>
                  <p className="max-w-2xl text-[13px] leading-6 text-pretty text-[#62675F]">{description}</p>
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
                Name the workspace. Add roles as they happen.
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-[1.2fr_0.9fr_1fr]">
              {howItWorks.map(([title, description], index) => (
                <article key={title} className="border-t border-white/18 bg-[#FEFCF7]/7 p-4">
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
                  Open the public demo and create a browser workspace.
                </p>
              </div>
              <Button
                onClick={onStart}
                className="h-12 rounded-xl bg-[#D7D8A3] px-5 font-mono text-[12px] text-[#17201B] transition-[background-color,transform] hover:bg-[#E1E3B5] active:scale-[0.96]"
              >
                Open demo
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#DDD3C1] bg-[#EEE8DC] px-4 py-10 md:px-7" aria-labelledby="site-footer-title">
        <div className="mx-auto grid max-w-375 gap-8 md:grid-cols-[1fr_1.1fr_0.9fr] md:items-start">
          <div>
            <p id="site-footer-title" className="text-[18px] font-semibold text-[#17201B]">
              {APP_CONFIG.name}
            </p>
            <p className="mt-3 max-w-sm text-[13px] leading-6 text-pretty text-[#62675F]">
              A public demo for organizing applications, resumes, interviews, and follow-ups.
            </p>
          </div>

          <section id="terms" aria-labelledby="footer-terms-title" className="border border-[#D4C8B5] bg-[#FBF8F0] p-4 shadow-[0_18px_46px_-40px_rgba(15,28,21,0.55)]">
            <h2 id="footer-terms-title" className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#62675F]">
              Terms & Conditions
            </h2>
            <p className="mt-3 text-[13px] leading-6 text-pretty text-[#62675F]">
              This demo is provided as-is for portfolio and evaluation use. Review generated suggestions before using them in applications.
            </p>
          </section>

          <nav aria-label="Social media" className="flex flex-col gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#62675F]">Social</p>
            <div className="mt-1 grid gap-2">
              {footerSocialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-11 items-center justify-between gap-3 border border-[#D4C8B5] bg-[#FBF8F0] px-3 py-2 text-[13px] font-medium text-[#17201B] shadow-[0_14px_34px_-32px_rgba(15,28,21,0.55)] transition-[background-color,box-shadow,transform] hover:bg-[#F6F2E8] hover:shadow-[0_18px_44px_-34px_rgba(15,28,21,0.68)] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#2F6B4F]"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center bg-[#ECE4D3] text-[#17201B]">
                      <Icon className="size-4" strokeWidth={1.7} />
                    </span>
                    {label}
                  </span>
                  <ArrowUpRight className="size-4 text-[#87927E] transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2F6B4F]" strokeWidth={1.7} />
                </a>
              ))}
            </div>
          </nav>
        </div>
      </footer>
    </div>
  );
}
