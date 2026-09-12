import { createFileRoute } from "@tanstack/react-router";
import { useState, useTransition, type FormEvent } from "react";

import {
  assignCmsUserRole,
  changeCmsUserStatus,
  getCmsUserLifecycleHistory,
  getCmsUsers,
  provisionCmsUserAccount,
  revokeCmsRoleAssignment,
  revokeCmsSessions,
} from "../../../../user-admin-functions";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_access/access/users",
)({
  loader: () => getCmsUsers({ data: {} }),
  component: CmsUsersPage,
});

function CmsUsersPage() {
  const initialData = Route.useLoaderData();
  const [data, setData] = useState(initialData);
  const [histories, setHistories] = useState<
    Record<string, Awaited<ReturnType<typeof getCmsUserLifecycleHistory>>>
  >({});
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const refresh = async (search?: string) =>
    setData(await getCmsUsers({ data: { search } }));

  const run = (action: () => Promise<unknown>, success: string) =>
    startTransition(async () => {
      try {
        await action();
        await refresh();
        setMessage(success);
      } catch {
        setMessage("The CMS user-management action could not be completed.");
      }
    });

  const provision = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(
      () =>
        provisionCmsUserAccount({
          data: {
            name: String(form.get("name")),
            email: String(form.get("email")),
            personReference: String(form.get("personReference")),
            temporaryPassword: String(form.get("temporaryPassword")),
          },
        }),
      "CMS user provisioned pending activation.",
    );
  };

  return (
    <div className="p-6 space-y-6">
      <header className="pb-4 border-b">
        <h1 className="text-2xl font-bold tracking-tight">CMS Users</h1>
        <p className="text-sm text-muted-foreground">
          Provision users, manage lifecycle state and sessions, and inspect or change effective CMS roles and scopes.
        </p>
      </header>

      {message ? (
        <div className="p-3 rounded bg-accent text-accent-foreground text-sm font-medium" role="status">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section aria-labelledby="provision-user" className="p-4 rounded-lg border bg-card shadow-sm space-y-4 h-fit">
          <h2 id="provision-user" className="text-lg font-semibold">Provision CMS User</h2>
          <p className="text-xs text-muted-foreground">
            Approved email domains: {data.approvedDomains.join(", ") || "none"}
          </p>
          <form className="space-y-3 text-xs" onSubmit={provision}>
            <label className="block space-y-1">
              <span className="font-medium">Name</span>
              <input className="w-full p-2 border rounded bg-background" name="name" required maxLength={160} />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">Email</span>
              <input className="w-full p-2 border rounded bg-background" name="email" type="email" required />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">Approved person reference</span>
              <input className="w-full p-2 border rounded bg-background" name="personReference" required maxLength={200} />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">Temporary password</span>
              <input
                className="w-full p-2 border rounded bg-background"
                name="temporaryPassword"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
            <button
              disabled={pending}
              className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded hover:bg-primary/90 transition-colors"
            >
              Provision user
            </button>
          </form>
        </section>

        <section aria-labelledby="user-list" className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 id="user-list" className="text-lg font-semibold">CMS Memberships</h2>
            <form
              className="flex gap-2 text-xs"
              onSubmit={(event) => {
                event.preventDefault();
                refresh(String(new FormData(event.currentTarget).get("search") ?? ""));
              }}
            >
              <input
                className="p-1.5 border rounded bg-background"
                name="search"
                type="search"
                placeholder="Search users..."
              />
              <button disabled={pending} className="px-3 py-1.5 border rounded bg-secondary">Search</button>
            </form>
          </div>

          <div className="space-y-4">
            {data.users.map((cmsUser) => (
              <article className="p-4 rounded-lg border bg-card shadow-sm space-y-3" key={cmsUser.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-semibold">{cmsUser.name}</h3>
                    <p className="text-xs text-muted-foreground">{cmsUser.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-muted font-medium">
                    Status: {cmsUser.status}
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  <h4 className="font-semibold text-muted-foreground">Assigned Roles:</h4>
                  <ul className="space-y-1">
                    {cmsUser.assignments.map((assignment) => (
                      <li
                        key={`${assignment.id}-${assignment.scopeValue ?? "global"}`}
                        className="flex justify-between items-center p-2 rounded bg-muted/50"
                      >
                        <span>
                          <strong>{assignment.roleName}</strong>
                          {assignment.scopeValue ? ` (${assignment.scopeDimension}: ${assignment.scopeValue})` : ""}
                        </span>
                        <button
                          disabled={pending}
                          className="text-xs text-destructive hover:underline"
                          onClick={() =>
                            run(
                              () =>
                                revokeCmsRoleAssignment({
                                  data: {
                                    assignmentId: assignment.id,
                                    reason: "CMS administrator revoked assignment",
                                  },
                                }),
                              "Role revoked.",
                            )
                          }
                        >
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 text-xs border-t">
                  {cmsUser.status !== "active" ? (
                    <button
                      disabled={pending}
                      className="px-2 py-1 border rounded bg-secondary hover:bg-secondary/80"
                      onClick={() =>
                        run(
                          () =>
                            changeCmsUserStatus({
                              data: {
                                userId: cmsUser.id,
                                status: "active",
                                reason: "CMS administrator activated user",
                              },
                            }),
                          "User activated.",
                        )
                      }
                    >
                      Activate
                    </button>
                  ) : (
                    <button
                      disabled={pending}
                      className="px-2 py-1 border rounded bg-secondary hover:bg-secondary/80"
                      onClick={() =>
                        run(
                          () =>
                            changeCmsUserStatus({
                              data: {
                                userId: cmsUser.id,
                                status: "suspended",
                                reason: "CMS administrator suspended user",
                              },
                            }),
                          "User suspended.",
                        )
                      }
                    >
                      Suspend
                    </button>
                  )}
                  <button
                    disabled={pending}
                    className="px-2 py-1 border rounded bg-secondary hover:bg-secondary/80"
                    onClick={() =>
                      run(
                        () =>
                          revokeCmsSessions({
                            data: {
                              userId: cmsUser.id,
                              reason: "CMS administrator revoked sessions",
                            },
                          }),
                        "Sessions revoked.",
                      )
                    }
                  >
                    Revoke sessions
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
