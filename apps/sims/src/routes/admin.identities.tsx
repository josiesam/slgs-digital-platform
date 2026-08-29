import { useState, type FormEvent } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

import { PageShell } from "@slgs/ui";

import { getCurrentSimsIdentity } from "../access";
import {
  assignSimsIdentityRole,
  createIdentitySimsMembership,
  getSimsIdentityAdministration,
  provisionSimsIdentity,
  revokeSimsIdentityRole,
  revokeSimsIdentitySessions,
  setIdentitySimsMembershipStatus,
  setSimsIdentityStatus,
} from "../admin-functions";

export const Route = createFileRoute("/admin/identities")({
  beforeLoad: async () => {
    try {
      return await getCurrentSimsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  loader: () => getSimsIdentityAdministration(),
  component: SimsIdentityAdministration,
});

function SimsIdentityAdministration() {
  const dashboard = Route.useLoaderData();
  const router = useRouter();
  const permissions = new Set(dashboard.permissions);
  const canManageIdentity = permissions.has("identity:manage:sims");
  const canAssign = permissions.has("role:assign:approved");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function run(task: () => Promise<unknown>, success: string) {
    setPending(true);
    setMessage(null);
    try {
      await task();
      setMessage(success);
      await router.invalidate();
    } catch {
      setMessage(
        "The operation was not accepted. Check the fields, state and your access.",
      );
    } finally {
      setPending(false);
    }
  }
  const provision = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return run(async () => {
      await provisionSimsIdentity({
        data: {
          name: String(data.get("name")),
          email: String(data.get("email")),
          personReference: String(data.get("personReference")),
          password: String(data.get("password")),
        },
      });
      form.reset();
    }, "Staff identity provisioned in pending state.");
  };
  const reason = (form: HTMLFormElement) =>
    String(new FormData(form).get("reason")) as
      | "approved_staff_administration"
      | "employment_status_change"
      | "security_containment"
      | "access_review"
      | "administrative_correction";
  return (
    <PageShell application="SLGS S.I.M.S." eyebrow="Identity administration">
      <a className="skip-link" href="#identity-admin">
        Skip to identity administration
      </a>
      <main id="identity-admin" className="sims-admin">
        <header>
          <h1>Identity and access administration</h1>
          <p>
            Staff identities and explicit S.I.M.S. access. Student accounts are
            outside Phase 2A.
          </p>
        </header>
        {message ? (
          <p role="status" className="sims-feedback">
            {message}
          </p>
        ) : null}
        {canManageIdentity ? (
          <section aria-labelledby="provision-identity">
            <h2 id="provision-identity">Provision staff identity</h2>
            <form className="sims-form" onSubmit={provision}>
              <label>
                Display name
                <input name="name" required maxLength={160} />
              </label>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Person reference
                <input name="personReference" required />
              </label>
              <label>
                Initial password
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </label>
              <button disabled={pending} type="submit">
                Provision identity
              </button>
            </form>
          </section>
        ) : null}
        <section aria-labelledby="identity-list">
          <h2 id="identity-list">Staff and administrative identities</h2>
          {dashboard.identities.length ? (
            dashboard.identities.map((item) => (
              <article className="sims-identity" key={item.id}>
                <header>
                  <h3>{item.name}</h3>
                  <p>{item.email}</p>
                </header>
                <dl>
                  <div>
                    <dt>Identity</dt>
                    <dd>{item.status}</dd>
                  </div>
                  <div>
                    <dt>S.I.M.S. membership</dt>
                    <dd>{item.membershipStatus ?? "none"}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(item.createdAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
                <p>
                  {item.assignments.length
                    ? item.assignments.map((assignment) => (
                        <span className="sims-role" key={assignment.id}>
                          {assignment.roleName}
                          {assignment.scopes.length
                            ? ` (${assignment.scopes
                                .map(
                                  (scope) =>
                                    `${scope.dimension}: ${scope.value}`,
                                )
                                .join(", ")})`
                            : ""}
                        </span>
                      ))
                    : "No S.I.M.S. role"}
                </p>
                {canManageIdentity ? (
                  <form
                    className="sims-actions"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const action = String(
                        new FormData(event.currentTarget).get("action"),
                      );
                      const reasonCode = reason(event.currentTarget);
                      if (
                        ["suspended", "deactivated"].includes(action) &&
                        !window.confirm(
                          `Change this identity to ${action}? Active sessions will be revoked.`,
                        )
                      )
                        return;
                      void run(
                        () =>
                          setSimsIdentityStatus({
                            data: {
                              userId: item.id,
                              status: action as
                                "active" | "suspended" | "deactivated",
                              reason: reasonCode,
                            },
                          }),
                        "Identity lifecycle updated.",
                      );
                    }}
                  >
                    <label>
                      Reason
                      <select name="reason">
                        <option value="approved_staff_administration">
                          Approved staff administration
                        </option>
                        <option value="employment_status_change">
                          Employment status change
                        </option>
                        <option value="security_containment">
                          Security containment
                        </option>
                        <option value="access_review">Access review</option>
                        <option value="administrative_correction">
                          Administrative correction
                        </option>
                      </select>
                    </label>
                    <select
                      name="action"
                      aria-label={`Identity action for ${item.name}`}
                    >
                      <option value="active">Activate/reactivate</option>
                      <option value="suspended">Suspend</option>
                      <option value="deactivated">Deactivate</option>
                    </select>
                    <button disabled={pending} type="submit">
                      Apply identity action
                    </button>
                    <button
                      disabled={pending}
                      type="button"
                      className="secondary"
                      onClick={() =>
                        window.confirm(
                          "Revoke every active session for this identity?",
                        ) &&
                        void run(
                          () =>
                            revokeSimsIdentitySessions({
                              data: {
                                userId: item.id,
                                reason: "administrative_session_revocation",
                              },
                            }),
                          "Sessions revoked.",
                        )
                      }
                    >
                      Revoke sessions
                    </button>
                  </form>
                ) : null}
                {canManageIdentity && !item.membershipId ? (
                  <button
                    disabled={pending}
                    onClick={() =>
                      void run(
                        () =>
                          createIdentitySimsMembership({
                            data: {
                              userId: item.id,
                              reason: "approved_sims_access",
                            },
                          }),
                        "S.I.M.S. membership created.",
                      )
                    }
                  >
                    Create S.I.M.S. membership
                  </button>
                ) : null}
                {canManageIdentity && item.membershipId ? (
                  <div className="sims-actions">
                    {(["active", "suspended", "deactivated"] as const).map(
                      (status) => (
                        <button
                          className="secondary"
                          disabled={pending || item.membershipStatus === status}
                          key={status}
                          onClick={() =>
                            (status === "active" ||
                              window.confirm(
                                `Change this S.I.M.S. membership to ${status}?`,
                              )) &&
                            void run(
                              () =>
                                setIdentitySimsMembershipStatus({
                                  data: {
                                    userId: item.id,
                                    status,
                                    reason: "membership_status_change",
                                  },
                                }),
                              "Membership lifecycle updated.",
                            )
                          }
                        >
                          {status} membership
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
                {canAssign && item.membershipStatus === "active" ? (
                  <details>
                    <summary>Assign approved S.I.M.S. role</summary>
                    {dashboard.roles
                      .filter((role) => role.active)
                      .map((role) => (
                        <form
                          className="sims-form compact"
                          key={role.id}
                          onSubmit={(event) => {
                            event.preventDefault();
                            const data = new FormData(event.currentTarget);
                            const dimension = String(
                              data.get("scopeDimension"),
                            );
                            const value = String(data.get("scopeValue")).trim();
                            void run(
                              () =>
                                assignSimsIdentityRole({
                                  data: {
                                    userId: item.id,
                                    roleId: role.id,
                                    scopes:
                                      dimension && value
                                        ? [
                                            {
                                              dimension: dimension as
                                                | "class"
                                                | "subject"
                                                | "department"
                                                | "academic_session"
                                                | "term"
                                                | "location",
                                              value,
                                            },
                                          ]
                                        : [],
                                    reason: "approved_role_assignment",
                                  },
                                }),
                              "Approved S.I.M.S. role assigned.",
                            );
                          }}
                        >
                          <strong>{role.name}</strong>
                          {role.scopeDimensions.length ? (
                            <>
                              <label>
                                Scope type
                                <select name="scopeDimension" required>
                                  {role.scopeDimensions.map((dimension) => (
                                    <option key={dimension} value={dimension}>
                                      {dimension.replaceAll("_", " ")}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Approved scope reference
                                <input
                                  name="scopeValue"
                                  required
                                  maxLength={200}
                                />
                              </label>
                            </>
                          ) : (
                            <input
                              name="scopeDimension"
                              type="hidden"
                              value=""
                            />
                          )}
                          <button disabled={pending} type="submit">
                            Assign {role.name}
                          </button>
                        </form>
                      ))}
                  </details>
                ) : null}
                {canAssign
                  ? item.assignments.map((assignment) => (
                      <button
                        className="secondary"
                        key={assignment.id}
                        disabled={pending}
                        onClick={() =>
                          window.confirm(`Revoke ${assignment.roleName}?`) &&
                          void run(
                            () =>
                              revokeSimsIdentityRole({
                                data: {
                                  assignmentId: assignment.id,
                                  reason: "approved_role_revocation",
                                },
                              }),
                            "Role revoked.",
                          )
                        }
                      >
                        Revoke {assignment.roleName}
                      </button>
                    ))
                  : null}
              </article>
            ))
          ) : (
            <p>No identities are available.</p>
          )}
        </section>
        {dashboard.audit.length ? (
          <section aria-labelledby="identity-audit">
            <h2 id="identity-audit">Identity audit history</h2>
            <ul>
              {dashboard.audit.map((event, index) => (
                <li key={`${event.occurredAt}-${index}`}>
                  <strong>{event.eventType}</strong> · {event.outcome} ·{" "}
                  {new Date(event.occurredAt).toLocaleString()}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </PageShell>
  );
}
