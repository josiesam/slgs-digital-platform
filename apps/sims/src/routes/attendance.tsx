import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { z } from "zod";

import { PageShell } from "@slgs/ui";

import { getCurrentSimsIdentity } from "../access";
import { listSimsAttendanceOccurrences } from "../attendance-functions";
import { listSimsCoreRecords } from "../core-functions";

const searchSchema = z.object({
  search: z.string().optional(),
  classId: z.string().optional(),
  academicSessionId: z.string().optional(),
  date: z.string().optional(),
  status: z.enum(["active", "finalized"]).optional(),
});

export const Route = createFileRoute("/attendance")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    try {
      return await getCurrentSimsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const occurrences = await listSimsAttendanceOccurrences({
      data: {
        search: deps.search ?? "",
        classId: deps.classId,
        academicSessionId: deps.academicSessionId,
        date: deps.date,
        status: deps.status,
        limit: 25,
      },
    });

    const classesResult = await listSimsCoreRecords({
      data: { resource: "classes", limit: 100 },
    });
    const sessionsResult = await listSimsCoreRecords({
      data: { resource: "academic-sessions", limit: 100 },
    });

    return {
      occurrences,
      classes: classesResult.records as Array<{
        id: string;
        name: string;
        code: string;
      }>,
      sessions: sessionsResult.records as Array<{
        id: string;
        name: string;
      }>,
    };
  },
  component: AttendanceListPage,
});

function AttendanceListPage() {
  const { occurrences, classes, sessions } = Route.useLoaderData();
  const search = Route.useSearch();

  const getClassCode = (id: string) => {
    return classes.find((c) => c.id === id)?.code ?? id;
  };

  const getSessionName = (id: string) => {
    return sessions.find((s) => s.id === id)?.name ?? id;
  };

  return (
    <PageShell
      application="SLGS S.I.M.S."
      eyebrow="Confidential attendance administration"
    >
      <a className="skip-link" href="#attendance-records">
        Skip to records
      </a>
      <main id="attendance-records" className="sims-admin">
        <header className="flex flex-col gap-2">
          <a href="/">← Back to foundation</a>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Attendance Registers
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage daily student class registers. All changes are logged for
                audits.
              </p>
            </div>
            <Link
              className="bg-primary text-primary-foreground font-medium px-4 py-2 rounded-md hover:opacity-90 inline-block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              to="/attendance/new"
            >
              Take Attendance
            </Link>
          </div>
        </header>

        <section aria-labelledby="filters-heading">
          <h2 id="filters-heading" className="text-lg font-medium">
            Filter Registers
          </h2>
          <form className="sims-form" method="get">
            <label>
              Search Class Code
              <input
                name="search"
                placeholder="e.g. JSS 1"
                defaultValue={search.search}
                maxLength={100}
              />
            </label>
            <label>
              Academic Session
              <select
                name="academicSessionId"
                defaultValue={search.academicSessionId ?? ""}
              >
                <option value="">All sessions</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Class
              <select name="classId" defaultValue={search.classId ?? ""}>
                <option value="">All classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.code})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <input name="date" type="date" defaultValue={search.date ?? ""} />
            </label>
            <label>
              Status
              <select name="status" defaultValue={search.status ?? ""}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="finalized">Finalized</option>
              </select>
            </label>
            <button type="submit" className="font-semibold">
              Apply Filters
            </button>
          </form>
        </section>

        <section aria-labelledby="records-heading">
          <h2 id="records-heading" className="text-lg font-medium">
            Daily Class Registers
          </h2>
          {occurrences.length === 0 ? (
            <p className="text-muted-foreground p-4 border border-dashed rounded-md text-center">
              No daily attendance occurrences found matching your filters.
            </p>
          ) : (
            <ul className="sims-core-list">
              {occurrences.map((item) => (
                <li key={item.id}>
                  <Link to="/attendance/$id" params={{ id: item.id }}>
                    <div className="flex flex-col">
                      <strong className="text-base text-primary">
                        {getClassCode(item.classId)}
                      </strong>
                      <span className="text-muted-foreground text-xs">
                        Session: {getSessionName(item.academicSessionId)}
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      Date: {item.attendanceDate}
                    </span>
                    <span className="capitalize text-xs font-semibold px-2 py-1 rounded bg-muted">
                      {item.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </PageShell>
  );
}
