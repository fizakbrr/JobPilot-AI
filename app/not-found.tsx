import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/lib/jobpilot/config";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#F6F2E8] px-4 py-12 text-[#17201B]">
      <section className="w-full max-w-2xl border border-[#DDD3C1] bg-[#FBF8F0] p-6 shadow-[0_24px_70px_-56px_rgba(15,28,21,0.75)]">
        <div className="mb-8 flex h-12 w-40 items-center">
          <Image src="/brand/logo-complete.svg" alt={APP_CONFIG.name} width={154} height={50} className="h-auto w-full" />
        </div>
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#62675F]">404</p>
        <h1 className="max-w-xl text-[40px] font-semibold leading-none tracking-[-0.04em] text-balance md:text-[56px]">
          This page is not in the workspace.
        </h1>
        <p className="mt-5 max-w-lg text-[14px] leading-7 text-[#62675F]">
          Return to JobPilot and continue from the dashboard, application board, resume review, or interview prep.
        </p>
        <Button asChild className="mt-8 h-11 rounded-lg bg-[#17201B] px-5 font-mono text-[12px] text-[#F7FAF1] hover:bg-[#27392E] active:scale-[0.96]">
          <Link href="/">Back to JobPilot</Link>
        </Button>
      </section>
    </main>
  );
}
