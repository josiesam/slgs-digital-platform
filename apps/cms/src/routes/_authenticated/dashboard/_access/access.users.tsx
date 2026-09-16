import { createFileRoute } from "@tanstack/react-router";
import { useState, useTransition, type FormEvent } from "react";

import {
  changeCmsUserStatus,
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
    <div className="space-y-6 p-6">
      <header className="pb-4 border-b">
        <h1 className="font-bold text-2xl tracking-tight">CMS Users</h1>
        <p className="text-muted-foreground text-sm">
          Provision users, manage lifecycle state and sessions, and inspect or
          change effective CMS roles and scopes.
        </p>
      </header>

      {message ? (
        <div
          className="bg-accent p-3 rounded font-medium text-sm text-accent-foreground"
          role="status"
        >
          {message}
        </div>
      ) : null}

      <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
        <section
          aria-labelledby="provision-user"
          className="space-y-4 bg-card shadow-sm p-4 border rounded-lg h-fit"
        >
          <h2 id="provision-user" className="font-semibold text-lg">
            Provision CMS User
          </h2>
          <p className="text-muted-foreground text-xs">
            Approved email domains: {data.approvedDomains.join(", ") || "none"}
          </p>
          <form className="space-y-3 text-xs" onSubmit={provision}>
            <label className="block space-y-1">
              <span className="font-medium">Name</span>
              <input
                className="bg-background p-2 border rounded w-full"
                name="name"
                required
                maxLength={160}
              />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">Email</span>
              <input
                className="bg-background p-2 border rounded w-full"
                name="email"
                type="email"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">Approved person reference</span>
              <input
                className="bg-background p-2 border rounded w-full"
                name="personReference"
                required
                maxLength={200}
              />
            </label>

            <label className="block space-y-1">
              <span className="font-medium">Temporary password</span>
              <input
                className="bg-background p-2 border rounded w-full"
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
              className="bg-primary hover:bg-primary/90 py-2 rounded w-full font-semibold text-primary-foreground transition-colors"
            >
              Provision user
            </button>
          </form>
        </section>

        <section
          aria-labelledby="user-list"
          className="space-y-4 lg:col-span-2"
        >
          <div className="flex justify-between items-center">
            <h2 id="user-list" className="font-semibold text-lg">
              CMS Memberships
            </h2>
            <form
              className="flex gap-2 text-xs"
              onSubmit={(event) => {
                event.preventDefault();
                refresh(
                  String(new FormData(event.currentTarget).get("search") ?? ""),
                );
              }}
            >
              <input
                className="bg-background p-1.5 border rounded"
                name="search"
                type="search"
                placeholder="Search users..."
              />
              <button
                disabled={pending}
                className="bg-secondary px-3 py-1.5 border rounded"
              >
                Search
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {data.users.map((cmsUser) => (
              <article
                className="space-y-3 bg-card shadow-sm p-4 border rounded-lg"
                key={cmsUser.id}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-base">{cmsUser.name}</h3>
                    <p className="text-muted-foreground text-xs">
                      {cmsUser.email}
                    </p>
                  </div>
                  <span className="bg-muted px-2 py-0.5 rounded font-medium text-xs">
                    Status: {cmsUser.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <h4 className="font-semibold text-muted-foreground">
                    Assigned Roles:
                  </h4>
                  <ul className="space-y-1">
                    {cmsUser.assignments.map((assignment) => (
                      <li
                        key={`${assignment.id}-${assignment.scopeValue ?? "global"}`}
                        className="flex justify-between items-center bg-muted/50 p-2 rounded"
                      >
                        <span>
                          <strong>{assignment.roleName}</strong>
                          {assignment.scopeValue
                            ? ` (${assignment.scopeDimension}: ${assignment.scopeValue})`
                            : ""}
                        </span>
                        <button
                          disabled={pending}
                          className="text-destructive text-xs hover:underline"
                          onClick={() =>
                            run(
                              () =>
                                revokeCmsRoleAssignment({
                                  data: {
                                    assignmentId: assignment.id,
                                    reason:
                                      "CMS administrator revoked assignment",
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

                <div className="flex flex-wrap gap-2 pt-2 border-t text-xs">
                  {cmsUser.status !== "active" ? (
                    <button
                      disabled={pending}
                      className="bg-secondary hover:bg-secondary/80 px-2 py-1 border rounded"
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
                      className="bg-secondary hover:bg-secondary/80 px-2 py-1 border rounded"
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
                    className="bg-secondary hover:bg-secondary/80 px-2 py-1 border rounded"
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
