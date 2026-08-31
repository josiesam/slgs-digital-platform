import { useState } from "react";
import { createFileRoute, redirect, Link, useRouter } from "@tanstack/react-router";

import { PageShell } from "@slgs/ui";

import { getCurrentSimsIdentity } from "../access";
import {
  getSimsAttendanceOccurrence,
  recordSimsAttendanceEntries,
  finalizeSimsAttendanceOccurrence,
  getRosterForAttendanceCreation,
} from "../attendance-functions";

export const Route = createFileRoute("/attendance/$id")({
  beforeLoad: async () => {
    try {
      return await getCurrentSimsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  loader: async ({ params }) => {
    const data = await getSimsAttendanceOccurrence({ data: { id: params.id } });
    if (!data) return { occurrence: null, entries: [], roster: [] };

    const roster = await getRosterForAttendanceCreation({
      data: { classId: data.occurrence.classId },
    });

    return { occurrence: data.occurrence, entries: data.entries, roster: roster as any[] };
  },
  component: AttendanceDetailPage,
});

function AttendanceDetailPage() {
  const { occurrence, entries, roster } = Route.useLoaderData() as any;
  const { permissions } = Route.useRouteContext() as any;
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Maintain editable marks in state if active
  const initialMarks: Record<string, "present" | "absent" | "late" | "excused"> = {};
  for (const entry of entries) {
    initialMarks[entry.studentId] = entry.state;
  }
  const [marks, setMarks] = useState(initialMarks);

  if (!occurrence) {
    return (
      <PageShell application="SLGS S.I.M.S." eyebrow="Confidential register">
        <main className="sims-admin">
          <header>
            <a href="/attendance">← Back to registers</a>
            <h1 className="text-3xl font-semibold tracking-tight mt-4">Register Not Found</h1>
            <p className="text-muted-foreground mt-2">
              The register does not exist or is outside your authorized scope.
            </p>
          </header>
        </main>
      </PageShell>
    );
  }

  const isFinalized = occurrence!.status === "finalized";

  // Check correction permission
  const canCorrect = (permissions as any[]).some(
    (p: any) => p === "attendance:correct:school" || p === "attendance:correct:assigned",
  );

  const getStudentInfo = (studentId: string) => {
    const student = (roster as any[]).find((s: any) => s.id === studentId);
    return student
      ? { name: `${student.lastName}, ${student.firstName}`, number: student.studentNumber }
      : { name: "Unknown Student", number: studentId };
  };

  const getEffectiveState = (entry: any) => {
    if (entry.corrections && entry.corrections.length > 0) {
      const latest = [...entry.corrections].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
      return latest ? latest.state : entry.state;
    }
    return entry.state;
  };

  async function handleSaveChanges() {
    if (!occurrence) return;
    setSaving(true);
    setMessage(null);
    try {
      const recordsToSave = Object.entries(marks).map(([studentId, state]) => ({
        studentId,
        state,
      }));

      await recordSimsAttendanceEntries({
        data: {
          occurrenceId: occurrence.id,
          entries: recordsToSave,
        },
      });

      setMessage("Register changes saved successfully.");
      await router.invalidate();
    } catch (err: any) {
      setMessage(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    if (!occurrence) return;
    if (!window.confirm("Are you sure you want to finalize this attendance register? This will freeze the register and block further ordinary marking. Corrections will require explicit authorization.")) {
      return;
    }

    setFinalizing(true);
    setMessage(null);
    try {
      await finalizeSimsAttendanceOccurrence({
        data: { id: occurrence.id },
      });
      setMessage("Register finalized successfully.");
      await router.invalidate();
    } catch (err: any) {
      setMessage(err instanceof Error ? err.message : "Failed to finalize register.");
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <PageShell
      application="SLGS S.I.M.S."
      eyebrow="Confidential register"
    >
      <main className="sims-admin max-w-4xl">
        <header className="flex flex-col gap-2">
          <a href="/attendance">← Back to registers</a>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Daily Class Register
              </h1>
              <p className="text-muted-foreground text-sm">
                Register ID: <code className="font-mono text-xs">{occurrence.id}</code>
              </p>
            </div>
            <div className="flex gap-2">
              {!isFinalized && (
                <>
                  <button
                    disabled={saving || finalizing}
                    onClick={handleSaveChanges}
                    className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    disabled={saving || finalizing}
                    onClick={handleFinalize}
                    className="border border-border font-semibold px-4 py-2 rounded-md hover:bg-muted disabled:opacity-50"
                  >
                    {finalizing ? "Finalizing..." : "Finalize Register"}
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <section aria-labelledby="summary-heading" className="p-4 border rounded-lg bg-card shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <h2 id="summary-heading" className="sr-only">Register Summary</h2>
          <div>
            <span className="text-muted-foreground block text-xs">Date</span>
            <span className="font-semibold">{occurrence.attendanceDate}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">Class ID</span>
            <span className="font-semibold font-mono">{occurrence.classId}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">Status</span>
            <span className="font-semibold capitalize">{occurrence.status}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">Recorder User</span>
            <span className="font-semibold text-xs font-mono truncate block" title={occurrence.recorderUserId}>
              {occurrence.recorderUserId}
            </span>
          </div>
        </section>

        <section aria-labelledby="entries-heading" className="p-6 border rounded-lg bg-card shadow-sm">
          <h2 id="entries-heading" className="text-lg font-medium mb-4">Student Marks</h2>

          {entries.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              No attendance marks recorded. Click "Save Changes" above to record initial marks.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="p-3 font-semibold text-muted-foreground">Student</th>
                    <th className="p-3 font-semibold text-muted-foreground">Student ID</th>
                    <th className="p-3 font-semibold text-muted-foreground text-center">Original State</th>
                    <th className="p-3 font-semibold text-muted-foreground text-center">Effective State</th>
                    <th className="p-3 font-semibold text-muted-foreground text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry: any) => {
                    const student = getStudentInfo(entry.studentId);
                    const effective = getEffectiveState(entry);
                    const hasCorrection = entry.corrections && entry.corrections.length > 0;

                    return (
                      <tr key={entry.id} className="hover:bg-muted/30">
                        <td className="p-3 font-medium">{student.name}</td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">{student.number}</td>
                        <td className="p-3 text-center">
                          {isFinalized ? (
                            <span className="capitalize px-2 py-0.5 rounded bg-muted text-xs">
                              {entry.state}
                            </span>
                          ) : (
                            <div className="flex justify-center gap-2">
                              {["present", "absent", "late", "excused"].map((status) => (
                                <label
                                  key={status}
                                  className="flex items-center gap-1 cursor-pointer font-medium select-none capitalize text-xs"
                                >
                                  <input
                                    type="radio"
                                    name={`mark-${entry.studentId}`}
                                    checked={marks[entry.studentId] === status}
                                    onChange={() =>
                                      setMarks((prev) => ({ ...prev, [entry.studentId]: status as any }))
                                    }
                                  />
                                  {status[0]}
                                </label>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`capitalize px-2 py-0.5 rounded text-xs font-semibold ${hasCorrection ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
                            {effective}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {isFinalized ? (
                            <div className="flex justify-center gap-2 items-center">
                              {canCorrect && (
                                <Link
                                  to="/attendance/$id/corrections"
                                  params={{ id: occurrence!.id }}
                                  search={(prev: any) => ({ ...prev, entryId: entry.id })}
                                  className="text-primary font-medium hover:underline text-xs"
                                >
                                  Correct Mark
                                </Link>
                              )}
                              {hasCorrection && (
                                <Link
                                  to="/attendance/$id/corrections"
                                  params={{ id: occurrence!.id }}
                                  search={(prev: any) => ({ ...prev, entryId: entry.id })}
                                  className="text-muted-foreground font-mono text-xs hover:underline"
                                >
                                  ({entry.corrections.length} logs)
                                </Link>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {message && (
            <p role="status" className="sims-feedback mt-4 text-sm font-medium">
              {message}
            </p>
          )}
        </section>
      </main>
    </PageShell>
  );
}
