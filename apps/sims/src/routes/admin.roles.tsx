import { useState, type FormEvent } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

import { PERMISSION_CATALOGUE, permissionApplication } from "@slgs/permissions";
import { PageShell } from "@slgs/ui";

import { getCurrentSimsIdentity } from "../access";
import {
  createSimsRole,
  getSimsIdentityAdministration,
  setSimsRoleActive,
} from "../admin-functions";

const simsPermissions = PERMISSION_CATALOGUE.filter(
  (permission) => permissionApplication(permission) === "sims",
);
const scopeDimensions = [
  "class",
  "subject",
  "department",
  "academic_session",
  "term",
  "location",
] as const;

export const Route = createFileRoute("/admin/roles")({
  beforeLoad: async () => {
    try {
      return await getCurrentSimsIdentity();
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  loader: () => getSimsIdentityAdministration(),
  component: SimsRoleAdministration,
});

function SimsRoleAdministration() {
  const dashboard = Route.useLoaderData();
  const permissions = new Set(dashboard.permissions);
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canCreate = permissions.has("role:create:sims");
  const canUpdate = permissions.has("role:update:sims");
  const canDeactivate = permissions.has("role:deactivate:sims");

  async function run(task: () => Promise<unknown>, success: string) {
    setPending(true);
    setMessage(null);
    try {
      await task();
      setMessage(success);
      await router.invalidate();
    } catch {
      setMessage("The role operation was not accepted.");
    } finally {
      setPending(false);
    }
  }

  const createRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void run(async () => {
      await createSimsRole({
        data: {
          key: String(data.get("key")),
          name: String(data.get("name")),
          description: String(data.get("description")),
          permissions: data.getAll(
            "permissions",
          ) as (typeof simsPermissions)[number][],
          scopeDimensions: data.getAll(
            "scopeDimensions",
          ) as (typeof scopeDimensions)[number][],
        },
      });
      form.reset();
    }, "Custom S.I.M.S. role created.");
  };

  return (
    <PageShell application="SLGS S.I.M.S." eyebrow="Role administration">
      <main className="sims-admin">
        <header>
          <a href="/admin/identities">Identity administration</a>
          <h1>S.I.M.S. role definitions</h1>
          <p>
            Access Administrators assign approved roles; only System
            Administrators define custom roles.
          </p>
        </header>
        {message ? (
          <p role="status" className="sims-feedback">
            {message}
          </p>
        ) : null}
        {canCreate ? (
          <section aria-labelledby="create-role">
            <h2 id="create-role">Create custom role</h2>
            <form className="sims-form" onSubmit={createRole}>
              <label>
                Key
                <input name="key" pattern="[a-z][a-z0-9_]*" required />
              </label>
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Description
                <input name="description" required />
              </label>
              <fieldset>
                <legend>Permissions</legend>
                {simsPermissions.map((permission) => (
                  <label key={permission}>
                    <input
                      type="checkbox"
                      name="permissions"
                      value={permission}
                    />
                    {permission}
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Allowed assignment scopes</legend>
                {scopeDimensions.map((dimension) => (
                  <label key={dimension}>
                    <input
                      type="checkbox"
                      name="scopeDimensions"
                      value={dimension}
                    />
                    {dimension.replaceAll("_", " ")}
                  </label>
                ))}
              </fieldset>
              <button disabled={pending} type="submit">
                Create role
              </button>
            </form>
          </section>
        ) : null}
        <section aria-labelledby="role-list">
          <h2 id="role-list">Approved S.I.M.S. roles</h2>
          {dashboard.roles.map((role) => (
            <article className="sims-identity" key={role.id}>
              <h3>{role.name}</h3>
              <p>
                {role.key} · {role.active ? "active" : "inactive"} ·{" "}
                {role.systemManaged ? "system managed" : "custom"}
              </p>
              <p>{role.permissions.join(", ")}</p>
              <p>Scopes: {role.scopeDimensions.join(", ") || "global"}</p>
              {!role.systemManaged &&
              ((role.active && canDeactivate) ||
                (!role.active && canUpdate)) ? (
                <button
                  className="secondary"
                  disabled={pending}
                  onClick={() =>
                    (role.active
                      ? window.confirm(`Deactivate ${role.name}?`)
                      : true) &&
                    void run(
                      () =>
                        setSimsRoleActive({
                          data: { roleId: role.id, active: !role.active },
                        }),
                      role.active ? "Role deactivated." : "Role activated.",
                    )
                  }
                >
                  {role.active ? "Deactivate" : "Activate"} role
                </button>
              ) : null}
            </article>
          ))}
        </section>
      </main>
    </PageShell>
  );
}
