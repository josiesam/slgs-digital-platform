import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
        SLGS Digital Platform • Project Handover & System Specs
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-neutral-900 dark:text-neutral-50 max-w-3xl">
        Sierra Leone Grammar School Technical Documentation
      </h1>
      <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-2xl">
        Comprehensive guide to the monorepo architecture, public website (<code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-sm">apps/web</code>), private CMS (<code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-sm">apps/cms</code>), and S.I.M.S. administrative portal with ICT/STEM asset management (<code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-sm">apps/sims</code>).
      </p>

      <div className="flex flex-wrap gap-4 justify-center mb-12">
        <Link
          href="/docs"
          className="px-6 py-3 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition-colors"
        >
          Explore Handover Docs →
        </Link>
        <Link
          href="/docs/architecture"
          className="px-6 py-3 font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
        >
          System Architecture
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl w-full mt-4">
        <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white/50 dark:bg-neutral-900/50 shadow-sm">
          <h2 className="font-bold text-lg mb-2 text-neutral-900 dark:text-neutral-100">Public Web</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            Read-only public site consuming security-barrier PostgreSQL views via DTOs.
          </p>
          <Link href="/docs/web" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            Read Web Specs →
          </Link>
        </div>

        <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white/50 dark:bg-neutral-900/50 shadow-sm">
          <h2 className="font-bold text-lg mb-2 text-neutral-900 dark:text-neutral-100">Content CMS</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            5-stage editorial workflow, Cloudflare R2 media management, and audit trails.
          </p>
          <Link href="/docs/cms" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            Read CMS Specs →
          </Link>
        </div>

        <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white/50 dark:bg-neutral-900/50 shadow-sm">
          <h2 className="font-bold text-lg mb-2 text-neutral-900 dark:text-neutral-100">S.I.M.S. & Assets</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            Student & staff administration, attendance tracking, and 10-state ICT/STEM inventory.
          </p>
          <Link href="/docs/sims" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            Read S.I.M.S. Specs →
          </Link>
        </div>
      </div>
    </div>
  );
}
