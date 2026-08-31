import { createFileRoute, redirect } from "@tanstack/react-router";

import { PageShell } from "@slgs/ui";
import { coreResourceSchema } from "@slgs/sims-domain";

import { getCurrentSimsIdentity } from "../access";
import { getSimsCoreRecord } from "../core-functions";
import { CoreRecordForm, resourceLabels } from "../core-ui";
import { canUpdateSimsCoreResource } from "../core-policy";

export const Route = createFileRoute("/core/$resource/$id")({
  beforeLoad: async () => {
    try {
      return await getCurrentSimsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  loader: async ({ params }) => {
    const resource = coreResourceSchema.parse(params.resource);
    return {
      resource,
      record: await getSimsCoreRecord({ data: { resource, id: params.id } }),
    };
  },
  component: CoreDetailPage,
});

function CoreDetailPage() {
  const { resource, record } = Route.useLoaderData();
  const { permissions } = Route.useRouteContext();
  const canUpdate = canUpdateSimsCoreResource(permissions, resource);
  return (
    <PageShell application="SLGS S.I.M.S." eyebrow="Confidential record">
      <main className="sims-admin sims-core">
        <a href={`/core/${resource}`}>
          ← Back to {resourceLabels[resource].toLowerCase()}
        </a>
        {!record ? (
          <section>
            <h1>Record not found</h1>
            <p>
              The record does not exist or is outside your authorized scope.
            </p>
          </section>
        ) : (
          <section>
            <h1>Edit record</h1>
            <p>
              Record ID: <code>{record.id}</code>
            </p>
            {canUpdate ? (
              <CoreRecordForm resource={resource} record={record} />
            ) : (
              <p>This record is read-only for your current assignment.</p>
            )}
          </section>
        )}
      </main>
    </PageShell>
  );
}
