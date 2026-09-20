import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconActivity, IconSearch, IconShield } from "@tabler/icons-react";

import { getCmsDashboard, type CmsDashboardData } from "../../../cms-functions";

const formatEvent = (value: string) =>
  value.replaceAll(".", " ").replaceAll("_", " ");

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
      (event.reasonCode &&
        event.reasonCode.toLowerCase().includes(search.toLowerCase()));
    const matchesOutcome =
      outcomeFilter === "all" || event.outcome === outcomeFilter;
    return matchesSearch && matchesOutcome;
  });

  return (
    <div className="space-y-6 mx-auto p-4 md:p-6 max-w-[1600px]">
      <header className="flex sm:flex-row flex-col justify-between sm:items-center gap-4 pb-4 border-border border-b">
        <div>
          <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs uppercase tracking-wider">
            <span>System</span>
            <span>/</span>
            <span className="font-semibold text-foreground">Audit Log</span>
          </div>
          <h1 className="font-serif font-bold text-foreground text-2xl">
            Audit & Accountability Log
          </h1>
          <p className="text-muted-foreground text-sm">
            Immutable, append-only security audit trail covering content,
            workflow, media, and authorization decisions.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="bg-[#f5d9d7] px-2.5 py-1 border border-[#f5d9d7]/80 rounded font-medium text-[#c83a32]">
            Append-only Ledger
          </span>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="flex sm:flex-row flex-col justify-between items-center gap-3 bg-card shadow-sm p-3 border border-border rounded-xl">
        <div className="relative w-full sm:w-80">
          <IconSearch className="top-1/2 left-3 absolute size-4 text-muted-foreground -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search event type, resource, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background py-1.5 pr-3 pl-9 border border-input rounded-md focus:outline-none focus:ring-[#9a78c2] focus:ring-1 w-full text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="font-medium text-muted-foreground text-xs">
            Outcome:
          </span>
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
      <div className="bg-card shadow-sm border border-border rounded-xl overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center">
            <IconShield className="opacity-50 mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="font-semibold text-foreground text-sm">
              No audit logs matching filters
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              All identity, workflow, and access mutation events are
              automatically recorded.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/50 border-border border-b font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
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
                  <tr
                    key={`${event.occurredAt}-${idx}`}
                    className="hover:bg-accent/30 transition-colors"
                  >
                    <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(event.occurredAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-foreground capitalize">
                      {formatEvent(event.eventType)}
                    </td>
                    <td className="p-3">
                      <span className="bg-secondary px-2 py-0.5 border rounded font-mono text-[10px] text-secondary-foreground uppercase">
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
