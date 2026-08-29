import { randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { stdin, stdout } from "node:process";

import { createDatabase, securityAuditEvent } from "@slgs/db";

import {
  addApprovedBootstrapDomain,
  approveAdministratorBootstrap,
  initiateAdministratorBootstrap,
  listAdministratorBootstraps,
  resolveBootstrapRole,
  type BootstrapRole,
} from "./bootstrap";

const usage = `SLGS privileged administrator bootstrap

Platform System Administration is an external two-person authority, not a global application role.

Commands:
  pnpm admin:bootstrap setup --operator <operator-reference>
  pnpm admin:bootstrap domain --domain <domain> --operator <operator-reference>
  pnpm admin:bootstrap initiate --application <cms|sims> [--role <cms_administrator|cms_system_administrator|sims_system_administrator>] --name <name> --email <email> --person-reference <reference> --initiator <operator-reference>
  pnpm admin:bootstrap approve --request <request-id> --approver <different-operator-reference>
  pnpm admin:bootstrap status

The initiate command prompts for the target administrator's initial password without echoing it.
CMS defaults to cms_administrator and may explicitly bootstrap the first
cms_system_administrator; S.I.M.S. receives sims_system_administrator.
The one-time setup command uses DATABASE_MIGRATION_URL to create/rotate a scoped
slgs_platform_admin database role and writes its URL to the ignored .env file.
All other commands require PLATFORM_ADMIN_DATABASE_URL.`;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireOption(name: string): string {
  const value = option(name)?.trim();
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing required option --${name}.`);
  }
  return value;
}

async function readHidden(label: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error(
      "A secure interactive terminal is required for password entry.",
    );
  }
  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
      stdout.write("\n");
    };
    const onData = (character: string) => {
      if (character === "\u0003") {
        finish();
        reject(new Error("Password entry cancelled."));
        return;
      }
      if (character === "\r" || character === "\n") {
        finish();
        resolve(value);
        return;
      }
      if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (character >= " ") value += character;
    };
    stdin.on("data", onData);
  });
}

async function readConfirmedPassword(): Promise<string> {
  const first = await readHidden("Initial password: ");
  const second = await readHidden("Confirm password: ");
  if (first !== second) throw new Error("Passwords do not match.");
  return first;
}

async function configurePlatformAdministratorCredential(
  operatorReference: string,
): Promise<void> {
  const bootstrapAdminUrl = process.env.DATABASE_BOOTSTRAP_ADMIN_URL;

  if (!bootstrapAdminUrl) {
    throw new Error(
      "DATABASE_BOOTSTRAP_ADMIN_URL is required for one-time platform-admin setup.",
    );
  }

  const connection = createDatabase({
    DATABASE_URL: bootstrapAdminUrl,
  });

  const password = randomBytes(36).toString("base64url");
  try {
    await connection.client.unsafe(`
      DO $bootstrap_role$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'slgs_platform_admin') THEN
          ALTER ROLE slgs_platform_admin WITH LOGIN PASSWORD '${password}';
        ELSE
          CREATE ROLE slgs_platform_admin WITH LOGIN PASSWORD '${password}';
        END IF;
      END
      $bootstrap_role$;
      DO $database_grant$
      BEGIN
        EXECUTE format(
          'GRANT CONNECT ON DATABASE %I TO slgs_platform_admin',
          current_database()
        );
      END
      $database_grant$;
      GRANT USAGE ON SCHEMA identity TO slgs_platform_admin;
      GRANT SELECT, INSERT, UPDATE ON
        identity."user",
        identity.account,
        identity.application_membership,
        identity.approved_contact_domain,
        identity.privileged_bootstrap,
        identity.role_assignment,
        identity.role_assignment_scope,
        identity.role_definition,
        identity.security_audit_event
      TO slgs_platform_admin;
      GRANT SELECT, DELETE ON identity.session TO slgs_platform_admin;
    `);

    const platformUrl = new URL(bootstrapAdminUrl);
    platformUrl.username = "slgs_platform_admin";
    platformUrl.password = password;
    const envPath = ".env";
    const existing = await readFile(envPath, "utf8").catch(() => "");
    const line = `PLATFORM_ADMIN_DATABASE_URL=${platformUrl.toString()}`;
    const updated = /^PLATFORM_ADMIN_DATABASE_URL=.*$/m.test(existing)
      ? existing.replace(/^PLATFORM_ADMIN_DATABASE_URL=.*$/m, line)
      : `${existing.trimEnd()}\n${line}\n`;
    await writeFile(envPath, updated, { encoding: "utf8", mode: 0o600 });
    await chmod(envPath, 0o600);

    await connection.db.insert(securityAuditEvent).values({
      id: crypto.randomUUID(),
      eventType: "platform_admin_database_role.configured",
      actorUserId: operatorReference,
      targetType: "database_role",
      targetId: "slgs_platform_admin",
      outcome: "success",
      reasonCode: "privileged_bootstrap_setup",
      metadata: {},
    });
  } finally {
    await connection.client.end();
  }
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!command || command === "help" || command === "--help") {
    console.log(usage);
    return;
  }

  if (command === "setup") {
    await configurePlatformAdministratorCredential(requireOption("operator"));
    console.log(
      "Platform-administration database credential configured in .env.",
    );
    console.log("The credential value was not printed.");
    return;
  }

  const databaseUrl = process.env.PLATFORM_ADMIN_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "PLATFORM_ADMIN_DATABASE_URL is required. Apply the identity migration and configure the platform-administration database credential first.",
    );
  }
  const connection = createDatabase({ DATABASE_URL: databaseUrl });

  try {
    if (command === "domain") {
      const domain = await addApprovedBootstrapDomain(connection.db, {
        domain: requireOption("domain"),
        operatorReference: requireOption("operator"),
      });
      console.log(`Approved contact domain: ${domain}`);
      return;
    }

    if (command === "initiate") {
      const application = requireOption("application");
      if (application !== "cms" && application !== "sims") {
        throw new Error("--application must be cms or sims.");
      }
      const role: BootstrapRole = resolveBootstrapRole(
        application,
        option("role"),
      );
      const password = await readConfirmedPassword();
      const result = await initiateAdministratorBootstrap(connection.db, {
        application,
        role,
        name: requireOption("name"),
        email: requireOption("email"),
        personReference: requireOption("person-reference"),
        initiatorReference: requireOption("initiator"),
        password,
      });
      console.log(`Bootstrap request created: ${result.requestId}`);
      console.log(`Pending identity created: ${result.userId}`);
      console.log("A different platform operator must approve this request.");
      return;
    }

    if (command === "approve") {
      await approveAdministratorBootstrap(connection.db, {
        requestId: requireOption("request"),
        approverReference: requireOption("approver"),
      });
      console.log("Bootstrap request approved and completed.");
      return;
    }

    if (command === "status") {
      const requests = await listAdministratorBootstraps(connection.db);
      if (requests.length === 0) {
        console.log("No administrator bootstrap requests exist.");
        return;
      }
      console.table(requests);
      return;
    }

    throw new Error(`Unknown bootstrap command: ${command}.`);
  } finally {
    await connection.client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown failure.";
  console.error(`Bootstrap failed: ${message}`);
  process.exitCode = 1;
});
