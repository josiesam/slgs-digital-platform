import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconActivity, IconSearch, IconShield } from "@tabler/icons-react";

import { getCmsDashboard, type CmsDashboardData } from "../../../../cms-functions";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_system/system/log",
)({
  loader: () => getCmsDashboard(),
  component: SystemAuditLogPage,
});

const formatEvent = (value: string) =>
  value.replaceAll(".", " ").replaceAll("_", " ");

export function SystemAuditLogPage() {
  const dashboard = Route.useLoaderData();
  return <SystemAuditLogView dashboard={dashboard} />;
}

export function SystemAuditLogView({
  dashboard,
}: {
  readonly dashboard: CmsDashboardData;
}) {
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  const filteredEvents = dashboard.audit.filter((event) => {
    const matchesSearch =
      event.eventType.toLowerCase().includes(search.toLowerCase()) ||
      event.resourceType.toLowerCase().includes(search.toLowerCase()) ||
      (event.reasonCode && event.reasonCode.toLowerCase().includes(search.toLowerCase()));
    const matchesOutcome =
      outcomeFilter === "all" || event.outcome === outcomeFilter;
    return matchesSearch && matchesOutcome;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
            <span>System</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Audit Log</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Audit & Accountability Log</h1>
          <p className="text-sm text-muted-foreground">
            Immutable, append-only security audit trail covering content, workflow, media, and authorization decisions.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-[#f5d9d7] text-[#c83a32] border border-[#f5d9d7]/80 font-medium">
            Append-only Ledger
          </span>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-sm">
        <div className="relative w-full sm:w-80">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search event type, resource, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-[#9a78c2]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-medium">Outcome:</span>
          {["all", "success", "denied"].map((out) => (
            <button
              key={out}
              onClick={() => setOutcomeFilter(out)}
              className={`px-2.5 py-1 rounded text-xs capitalize transition-colors font-medium ${
                outcomeFilter === out
                  ? "bg-[#42245f] text-white"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {out}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center">
            <IconShield className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-foreground">No audit logs matching filters</p>
            <p className="text-xs text-muted-foreground mt-1">
              All identity, workflow, and access mutation events are automatically recorded.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 border-b border-border text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Resource Type</th>
                  <th className="p-3">Outcome</th>
                  <th className="p-3">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEvents.map((event, idx) => (
                  <tr key={`${event.occurredAt}-${idx}`} className="hover:bg-accent/30 transition-colors">
                    <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(event.occurredAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-foreground capitalize">
                      {formatEvent(event.eventType)}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-secondary border text-secondary-foreground uppercase text-[10px] font-mono">
                        {event.resourceType}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          event.outcome === "success"
                            ? "bg-[#2f7d3b]/10 text-[#2f7d3b] border border-[#2f7d3b]/20"
                            : "bg-[#c83a32]/10 text-[#c83a32] border border-[#c83a32]/20"
                        }`}
                      >
                        {event.outcome}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {event.reasonCode ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
