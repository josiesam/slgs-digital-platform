import { useState } from "react";
import { createFileRoute, redirect, useRouter, Link } from "@tanstack/react-router";
import { z } from "zod";

import { PageShell } from "@slgs/ui";

import { getCurrentSimsIdentity } from "../access";
import {
  getSimsAttendanceOccurrence,
  correctSimsAttendanceEntry,
  getRosterForAttendanceCreation,
} from "../attendance-functions";

const searchSchema = z.object({
  entryId: z.string(),
});

export const Route = createFileRoute("/attendance/$id/corrections")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    try {
      return await getCurrentSimsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const data = await getSimsAttendanceOccurrence({ data: { id: params.id } });
    if (!data) return { occurrence: null, entry: null, roster: [] };

    const entry = data.entries.find((e: any) => e.id === deps.entryId);
    const roster = await getRosterForAttendanceCreation({
      data: { classId: data.occurrence.classId },
    });

    return { occurrence: data.occurrence, entry, roster: roster as any[] };
  },
  component: AttendanceCorrectionsPage,
});

function AttendanceCorrectionsPage() {
  const { occurrence, entry, roster } = Route.useLoaderData() as any;
  const search = Route.useSearch();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [selectedState, setSelectedState] = useState<"present" | "absent" | "late" | "excused">("present");
  const [reason, setReason] = useState("");

  if (!occurrence || !entry) {
    return (
      <PageShell application="SLGS S.I.M.S." eyebrow="Confidential corrections">
        <main className="sims-admin">
          <header>
            <a href="/attendance">← Back to registers</a>
            <h1 className="text-3xl font-semibold tracking-tight mt-4">Record Not Found</h1>
            <p className="text-muted-foreground mt-2">
              The entry or register does not exist or is outside your authorized scope.
            </p>
          </header>
        </main>
      </PageShell>
    );
  }

  const student = (roster as any[]).find((s: any) => s.id === entry.studentId);
  const studentName = student
    ? `${student.lastName}, ${student.firstName}`
    : "Unknown Student";

  const getEffectiveState = () => {
    if (entry.corrections && entry.corrections.length > 0) {
      const latest = [...entry.corrections].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
      return latest ? latest.state : entry.state;
    }
    return entry.state;
  };

  async function submitCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setMessage("A reason is required to submit a correction.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await correctSimsAttendanceEntry({
        data: {
          entryId: entry!.id,
          input: {
            state: selectedState,
            reason: reason.trim(),
          },
        },
      });

      setMessage("Correction submitted successfully!");
      setReason("");
      // Redirect back to register detail
      router.navigate({ to: "/attendance/$id", params: { id: occurrence!.id } });
    } catch (err: any) {
      setMessage(err instanceof Error ? err.message : "Failed to submit correction.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      application="SLGS S.I.M.S."
      eyebrow="Confidential corrections"
    >
      <main className="sims-admin max-w-3xl">
        <header className="flex flex-col gap-2">
          <Link to="/attendance/$id" params={{ id: occurrence!.id }}>
            ← Back to register
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Correct Attendance Entry</h1>
          <p className="text-muted-foreground text-sm">
            Student: <strong className="text-foreground">{studentName}</strong> ({student?.studentNumber})
          </p>
        </header>

        <section aria-labelledby="history-heading" className="p-6 border rounded-lg bg-card shadow-sm">
          <h2 id="history-heading" className="text-lg font-medium mb-4">Correction History (Audit Trail)</h2>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span>Original Attendance State:</span>
              <span className="capitalize font-semibold px-2 py-0.5 rounded bg-muted">
                {entry.state}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-sm border-b pb-2 font-medium">
              <span>Current Effective State:</span>
              <span className="capitalize font-semibold px-2 py-0.5 rounded bg-green-100 text-green-800">
                {getEffectiveState()}
              </span>
            </div>

            {entry.corrections && entry.corrections.length > 0 ? (
              <div className="mt-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  History of Corrections
                </span>
                <ol className="relative border-l border-border ml-2 flex flex-col gap-4 pl-4">
                  {entry.corrections.map((corr: any) => (
                    <li key={corr.id} className="text-xs">
                      <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-card bg-primary"></div>
                      <time className="text-muted-foreground font-mono block mb-1">
                        {new Date(corr.createdAt).toLocaleString()}
                      </time>
                      <p className="font-semibold text-primary mb-1">
                        Corrected to: <span className="capitalize font-bold">{corr.state}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Actor: <code className="text-xs font-mono">{corr.actorUserId}</code>
                      </p>
                      <p className="text-foreground italic mt-1 bg-muted p-2 rounded">
                        " {corr.reason} "
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs italic">
                No corrections have been submitted for this entry yet.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="form-heading" className="p-6 border rounded-lg bg-card shadow-sm">
          <h2 id="form-heading" className="text-lg font-medium mb-4">Submit Correction</h2>
          <form onSubmit={submitCorrection} className="flex flex-col gap-4">
            <label className="grid gap-1">
              New Attendance State
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value as any)}
                required
                className="border p-2 rounded"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
            </label>

            <label className="grid gap-1">
              Explicit Reason
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a specific reason for this correction..."
                required
                maxLength={500}
                className="border p-2 rounded min-h-[100px]"
              />
            </label>

            <div className="flex items-center justify-between mt-2">
              <button
                disabled={saving}
                type="submit"
                className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Submitting Correction..." : "Submit Correction"}
              </button>
              
              {message && (
                <p role="status" className="sims-feedback max-w-md text-sm font-medium">
                  {message}
                </p>
              )}
            </div>
          </form>
        </section>
      </main>
    </PageShell>
  );
}
