import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useTransition, type FormEvent } from "react";
import { AdminShell } from "../admin-shell";
import { getCurrentCmsIdentity } from "../access";
import {
  assignCmsUserRole,
  changeCmsUserStatus,
  getCmsUserLifecycleHistory,
  getCmsUsers,
  provisionCmsUserAccount,
  revokeCmsRoleAssignment,
  revokeCmsSessions,
} from "../user-admin-functions";

export const Route = createFileRoute("/admin/users")({
  beforeLoad: async () => {
    try {
      await getCurrentCmsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
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
    <AdminShell>
      <div className="cms-admin users-admin">
        <h1>CMS users</h1>
        <p>
          Provision users, manage lifecycle state and sessions, and inspect or
          change effective CMS roles and scopes.
        </p>
        <p aria-live="polite">{message}</p>
        <p>
          <a href="/admin">← CMS dashboard</a>
        </p>
        <form
          className="cms-form"
          onSubmit={(event) => {
            event.preventDefault();
            refresh(
              String(new FormData(event.currentTarget).get("search") ?? ""),
            );
          }}
        >
          <label htmlFor="user-search">Search users</label>
          <input id="user-search" name="search" type="search" />
          <button disabled={pending}>Search</button>
        </form>
        <section aria-labelledby="provision-user">
          <h2 id="provision-user">Provision CMS user</h2>
          <p>
            Approved email domains: {data.approvedDomains.join(", ") || "none"}
          </p>
          <form className="cms-form" onSubmit={provision}>
            <label>
              Name
              <input name="name" required maxLength={160} />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Approved person reference
              <input name="personReference" required maxLength={200} />
            </label>
            <label>
              Temporary password
              <input
                name="temporaryPassword"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
            <button disabled={pending}>Provision user</button>
          </form>
        </section>
        <section aria-labelledby="user-list">
          <h2 id="user-list">CMS memberships</h2>
          <datalist id="cms-scope-values">
            <option value="slgs">SLGS organisation</option>
            {data.clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </datalist>
          {data.users.map((cmsUser) => (
            <article className="cms-content-card" key={cmsUser.id}>
              <h3>{cmsUser.name}</h3>
              <p>{cmsUser.email}</p>
              <p>
                Status: {cmsUser.status} · Membership:{" "}
                {cmsUser.membershipStatus}
              </p>
              <ul>
                {cmsUser.assignments.map((assignment) => (
                  <li
                    key={`${assignment.id}-${assignment.scopeValue ?? "global"}`}
                  >
                    {assignment.roleName}
                    {assignment.scopeValue
                      ? ` · ${assignment.scopeDimension}: ${assignment.scopeValue}`
                      : ""}{" "}
                    <small>
                      Effective permissions: {assignment.permissions.join(", ")}
                    </small>{" "}
                    <button
                      disabled={pending}
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
                      Revoke role
                    </button>
                  </li>
                ))}
              </ul>
              <form
                className="cms-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const dimension = String(form.get("dimension"));
                  const value = String(form.get("scopeValue") ?? "").trim();
                  run(
                    () =>
                      assignCmsUserRole({
                        data: {
                          targetUserId: cmsUser.id,
                          roleId: String(form.get("roleId")),
                          scopes:
                            dimension === "club" || dimension === "organisation"
                              ? [{ dimension, value }]
                              : [],
                          reason: String(form.get("reason")),
                        },
                      }),
                    "Role assigned.",
                  );
                }}
              >
                <h4>Assign role</h4>
                <label>
                  CMS role
                  <select name="roleId" required>
                    {data.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                        {role.scopeDimensions.length
                          ? ` (${role.scopeDimensions.join("/")} scope)`
                          : " (global)"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Scope dimension
                  <select name="dimension" defaultValue="">
                    <option value="">Global / none</option>
                    <option value="club">Club</option>
                    <option value="organisation">Organisation</option>
                  </select>
                </label>
                <label>
                  Scope value
                  <input
                    name="scopeValue"
                    list="cms-scope-values"
                    maxLength={200}
                    placeholder="Required for a scoped role"
                  />
                </label>
                <label>
                  Reason
                  <input name="reason" required maxLength={600} />
                </label>
                <button disabled={pending}>Assign role</button>
              </form>
              <div className="flex flex-wrap gap-2">
                {cmsUser.status !== "active" ? (
                  <button
                    disabled={pending}
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
                  disabled={pending || cmsUser.status === "deactivated"}
                  onClick={() =>
                    run(
                      () =>
                        changeCmsUserStatus({
                          data: {
                            userId: cmsUser.id,
                            status: "deactivated",
                            reason: "CMS administrator deactivated user",
                          },
                        }),
                      "User deactivated.",
                    )
                  }
                >
                  Deactivate
                </button>
                <button
                  disabled={pending}
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
                <button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        const history = await getCmsUserLifecycleHistory({
                          data: { userId: cmsUser.id },
                        });
                        setHistories((current) => ({
                          ...current,
                          [cmsUser.id]: history,
                        }));
                      } catch {
                        setMessage("Lifecycle history could not be loaded.");
                      }
                    })
                  }
                >
                  View lifecycle history
                </button>
              </div>
              {histories[cmsUser.id]?.length ? (
                <div>
                  <h4>Lifecycle history</h4>
                  <ul>
                    {(histories[cmsUser.id] ?? []).map((event) => (
                      <li key={`${event.eventType}-${event.occurredAt}`}>
                        {event.occurredAt} · {event.eventType} · {event.outcome}
                        {event.reasonCode ? ` · ${event.reasonCode}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}
