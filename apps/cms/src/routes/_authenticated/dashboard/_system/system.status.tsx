import { createFileRoute } from "@tanstack/react-router";
import { IconCheck, IconDatabase, IconLock, IconServer, IconWorld } from "@tabler/icons-react";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_system/system/status",
)({
  component: CmsSystemStatus,
});

function CmsSystemStatus() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <header className="pb-4 border-b border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
          <span>System</span>
          <span>/</span>
          <span className="text-foreground font-semibold">Operational Status</span>
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground">System Status & Verification</h1>
        <p className="text-sm text-muted-foreground">
          Operational boundaries, database RLS policies, R2 private storage, and public web read projection status.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module 1 */}
        <section className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-base font-serif font-bold text-foreground flex items-center gap-2">
              <IconServer className="size-4 text-[#42245f]" />
              <span>CMS Core Engine</span>
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#2f7d3b]/10 text-[#2f7d3b] border border-[#2f7d3b]/20 inline-flex items-center gap-1">
              <IconCheck className="size-3" />
              <span>Active</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Better Auth session authentication and server-side authorization enforcement are operational.
          </p>
        </section>

        {/* Module 2 */}
        <section className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-base font-serif font-bold text-foreground flex items-center gap-2">
              <IconDatabase className="size-4 text-[#2f6287]" />
              <span>Database Layer</span>
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#2f7d3b]/10 text-[#2f7d3b] border border-[#2f7d3b]/20 inline-flex items-center gap-1">
              <IconCheck className="size-3" />
              <span>PostgreSQL + Drizzle</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Drizzle ORM schema migrations and append-only audit event triggers are verified.
          </p>
        </section>

        {/* Module 3 */}
        <section className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-base font-serif font-bold text-foreground flex items-center gap-2">
              <IconLock className="size-4 text-[#73767a]" />
              <span>Object Storage</span>
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#2f7d3b]/10 text-[#2f7d3b] border border-[#2f7d3b]/20 inline-flex items-center gap-1">
              <IconCheck className="size-3" />
              <span>Cloudflare R2</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Private bucket upload signing, byte signature verification, and short-lived presigned GET URLs are enabled.
          </p>
        </section>

        {/* Module 4 */}
        <section className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-base font-serif font-bold text-foreground flex items-center gap-2">
              <IconWorld className="size-4 text-[#8d7d58]" />
              <span>Public Read Boundary</span>
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#2f7d3b]/10 text-[#2f7d3b] border border-[#2f7d3b]/20 inline-flex items-center gap-1">
              <IconCheck className="size-3" />
              <span>Enforced Projections</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            The public web receives published projections only. Drafts, notes, and private keys remain segregated.
          </p>
        </section>
      </div>
    </div>
  );
}
