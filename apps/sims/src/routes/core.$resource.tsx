import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { PageShell } from "@slgs/ui";
import { coreResourceSchema } from "@slgs/sims-domain";

import { getCurrentSimsIdentity } from "../access";
import { listSimsCoreRecords } from "../core-functions";
import { CoreRecordForm, resourceLabels } from "../core-ui";
import {
  canCreateSimsCoreResource,
  canReadSimsCoreResource,
} from "../core-policy";

const searchSchema = z.object({
  search: z.string().max(100).catch(""),
  status: z.string().optional(),
  cursor: z.string().optional(),
  direction: z.enum(["asc", "desc"]).catch("asc"),
});

export const Route = createFileRoute("/core/$resource")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    try {
      return await getCurrentSimsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) => {
    const resource = coreResourceSchema.parse(params.resource);
    return listSimsCoreRecords({
      data: {
        resource,
        search: deps.search,
        status: deps.status as
          "active" | "inactive" | "archived" | "planned" | "closed" | undefined,
        cursor: deps.cursor ?? null,
        direction: deps.direction,
        limit: 25,
      },
    });
  },
  component: CoreListPage,
});

function CoreListPage() {
  const { resource, records, nextCursor } = Route.useLoaderData();
  const { permissions } = Route.useRouteContext();
  const search = Route.useSearch();
  const visibleResources = Object.entries(resourceLabels).filter(([path]) =>
    canReadSimsCoreResource(permissions, coreResourceSchema.parse(path)),
  );
  const canCreate = canCreateSimsCoreResource(permissions, resource);
  const statuses =
    resource === "academic-sessions"
      ? ["planned", "active", "closed"]
      : ["active", "inactive", "archived"];
  const secondary = (record: (typeof records)[number]) =>
    "code" in record
      ? String(record.code)
      : "studentNumber" in record
        ? String(record.studentNumber)
        : "staffNumber" in record
          ? String(record.staffNumber)
          : `${record.startDate}–${record.endDate}`;
  return (
    <PageShell
      application="SLGS S.I.M.S."
      eyebrow="Confidential administration"
    >
      <a className="skip-link" href="#core-records">
        Skip to records
      </a>
      <main id="core-records" className="sims-admin sims-core">
        <nav aria-label="S.I.M.S. core modules" className="sims-core-nav">
          {visibleResources.map(([path, label]) => (
            <a
              key={path}
              aria-current={path === resource ? "page" : undefined}
              href={`/core/${path}`}
            >
              {label}
            </a>
          ))}
        </nav>
        <header>
          <h1>{resourceLabels[resource]}</h1>
          <p>
            Administrative records. Access is enforced by S.I.M.S. permissions
            and assignment scope.
          </p>
        </header>
        <section aria-labelledby="search-heading">
          <h2 id="search-heading">Find records</h2>
          <form className="sims-form" method="get">
            <label>
              Search
              <input
                name="search"
                defaultValue={search.search}
                maxLength={100}
              />
            </label>
            <label>
              Status
              <select name="status" defaultValue={search.status ?? ""}>
                <option value="">All</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status[0]?.toUpperCase()}
                    {status.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort
              <select name="direction" defaultValue={search.direction}>
                <option value="asc">A–Z</option>
                <option value="desc">Z–A</option>
              </select>
            </label>
            <button type="submit">Apply</button>
          </form>
        </section>
        <section aria-labelledby="records-heading">
          <h2 id="records-heading">Records</h2>
          {records.length === 0 ? (
            <p>No authorized records exist for this view.</p>
          ) : (
            <ul className="sims-core-list">
              {records.map((record) => (
                <li key={record.id}>
                  <a href={`/core/${resource}/${record.id}`}>
                    <strong>
                      {"name" in record
                        ? String(record.name)
                        : `${String(record.firstName)} ${String(record.lastName)}`}
                    </strong>
                    <span>{secondary(record)}</span>
                    <span>{record.status}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {nextCursor ? (
            <a
              className="sims-next"
              href={`/core/${resource}?search=${encodeURIComponent(search.search)}&direction=${search.direction}&cursor=${encodeURIComponent(nextCursor)}`}
            >
              Next page
            </a>
          ) : null}
        </section>
        {canCreate ? (
          <section aria-labelledby="create-heading">
            <h2 id="create-heading">
              Create {resourceLabels[resource].toLowerCase().replace(/s$/, "")}{" "}
              record
            </h2>
            <CoreRecordForm resource={resource} />
          </section>
        ) : null}
      </main>
    </PageShell>
  );
}
