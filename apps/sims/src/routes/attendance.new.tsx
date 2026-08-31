import { useState, useEffect } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

import { PageShell } from "@slgs/ui";

import { getCurrentSimsIdentity } from "../access";
import {
  createSimsAttendanceOccurrence,
  recordSimsAttendanceEntries,
  getRosterForAttendanceCreation,
} from "../attendance-functions";
import { listSimsCoreRecords } from "../core-functions";

export const Route = createFileRoute("/attendance/new")({
  beforeLoad: async () => {
    try {
      return await getCurrentSimsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    const { records: classes } = await listSimsCoreRecords({
      data: { resource: "classes", limit: 100 },
    });
    const { records: sessions } = await listSimsCoreRecords({
      data: { resource: "academic-sessions", limit: 100 },
    });

    return {
      classes: classes as any[],
      sessions: sessions as any[],
    };
  },
  component: TakeAttendancePage,
});

interface StudentRosterItem {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
}

function TakeAttendancePage() {
  const { classes, sessions } = Route.useLoaderData() as any;
  const router = useRouter();

  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0] ?? "",
  );
  
  const [roster, setRoster] = useState<readonly StudentRosterItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Load roster dynamically when class is selected
  useEffect(() => {
    if (!selectedClassId) {
      setRoster([]);
      return;
    }

    async function loadRoster() {
      setLoadingRoster(true);
      setMessage(null);
      try {
        const list = await getRosterForAttendanceCreation({
          data: { classId: selectedClassId },
        });
        setRoster(list);
        
        // Default all students to "present"
        const defaultMarks: Record<string, "present" | "absent" | "late" | "excused"> = {};
        for (const student of list) {
          defaultMarks[student.id] = "present";
        }
        setAttendanceMarks(defaultMarks);
      } catch {
        setMessage("Failed to load class roster. Verify your class assignment scope.");
        setRoster([]);
      } finally {
        setLoadingRoster(false);
      }
    }

    loadRoster();
  }, [selectedClassId]);

  const markStudent = (studentId: string, state: "present" | "absent" | "late" | "excused") => {
    setAttendanceMarks((prev) => ({
      ...prev,
      [studentId]: state,
    }));
  };

  async function submitAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSessionId || !selectedClassId || !attendanceDate) {
      setMessage("Please fill in all register settings.");
      return;
    }
    if (roster.length === 0) {
      setMessage("Cannot submit attendance for an empty class roster.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // 1. Create occurrence
      const occurrence = await createSimsAttendanceOccurrence({
        data: {
          academicSessionId: selectedSessionId,
          classId: selectedClassId,
          attendanceDate,
        },
      });

      // 2. Prepare entries
      const entries = Object.entries(attendanceMarks).map(([studentId, state]) => ({
        studentId,
        state,
      }));

      // 3. Record entries
      await recordSimsAttendanceEntries({
        data: {
          occurrenceId: occurrence.id,
          entries,
        },
      });

      setMessage("Attendance successfully recorded!");
      // Redirect to the register detail page
      router.navigate({ to: `/attendance/${occurrence.id}` });
    } catch (err: any) {
      setMessage(
        err instanceof Error ? err.message : "Failed to save attendance. Verify permissions or duplicates.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      application="SLGS S.I.M.S."
      eyebrow="Confidential attendance administration"
    >
      <main className="sims-admin max-w-4xl">
        <header className="flex flex-col gap-2">
          <a href="/attendance">← Back to registers</a>
          <h1 className="text-3xl font-semibold tracking-tight">Record Daily Attendance</h1>
          <p className="text-muted-foreground text-sm">
            Configure the academic session, class, and date to load the roster.
          </p>
        </header>

        <section aria-labelledby="settings-heading" className="p-6 border rounded-lg bg-card shadow-sm">
          <h2 id="settings-heading" className="text-lg font-medium mb-4">1. Register Details</h2>
          <div className="sims-form flex gap-4 flex-wrap">
            <label className="flex-1 min-w-[200px]">
              Academic Session
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                required
              >
                <option value="">Select session</option>
                {sessions.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex-1 min-w-[200px]">
              Class
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                required
              >
                <option value="">Select class</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex-1 min-w-[200px]">
              Attendance Date
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                required
              />
            </label>
          </div>
        </section>

        {selectedClassId && (
          <section aria-labelledby="roster-heading" className="p-6 border rounded-lg bg-card shadow-sm">
            <h2 id="roster-heading" className="text-lg font-medium mb-4">
              2. Student Roster ({roster.length} active students)
            </h2>
            
            {loadingRoster ? (
              <p className="text-muted-foreground py-4 text-center">Loading roster...</p>
            ) : roster.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">No active students found in this class.</p>
            ) : (
              <form onSubmit={submitAttendance} className="flex flex-col gap-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="p-3 font-semibold text-muted-foreground">Student Name</th>
                        <th className="p-3 font-semibold text-muted-foreground">Student ID</th>
                        <th className="p-3 font-semibold text-muted-foreground text-center">Mark Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {roster.map((student) => (
                        <tr key={student.id} className="hover:bg-muted/30">
                          <td className="p-3 font-medium">
                            {student.lastName}, {student.firstName}
                          </td>
                          <td className="p-3 text-muted-foreground font-mono text-xs">
                            {student.studentNumber}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-4 flex-wrap">
                              {["present", "absent", "late", "excused"].map((status) => (
                                <label
                                  key={status}
                                  className="flex items-center gap-1.5 cursor-pointer font-medium select-none capitalize text-xs"
                                >
                                  <input
                                    type="radio"
                                    name={`mark-${student.id}`}
                                    checked={attendanceMarks[student.id] === status}
                                    onChange={() => markStudent(student.id, status as any)}
                                    className="h-4 w-4 rounded-full text-primary focus:ring-primary"
                                    aria-label={`Mark ${student.firstName} ${student.lastName} as ${status}`}
                                  />
                                  {status}
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <button
                    disabled={saving}
                    type="submit"
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Saving Register..." : "Submit Register"}
                  </button>
                  
                  {message && (
                    <p role="status" className="sims-feedback max-w-lg text-sm font-medium">
                      {message}
                    </p>
                  )}
                </div>
              </form>
            )}
          </section>
        )}
      </main>
    </PageShell>
  );
}
