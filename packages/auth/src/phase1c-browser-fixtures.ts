import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray } from "drizzle-orm";

import {
  account,
  applicationMembership,
  club,
  createDatabase,
  roleAssignment,
  roleAssignmentScope,
  roleDefinition,
  user,
} from "@slgs/db";

import {
  addApprovedBootstrapDomain,
  approveAdministratorBootstrap,
  initiateAdministratorBootstrap,
} from "./bootstrap";

const FIXTURE_FLAG = "SLGS_PHASE1C_BROWSER_FIXTURES";
const FIXTURE_BRANCH = "SLGS_NEON_BRANCH";
const branchName = "phase1c-browser-20260828";

if (
  process.env[FIXTURE_FLAG] !== "1" ||
  process.env[FIXTURE_BRANCH] !== branchName
) {
  throw new Error(
    "Phase 1C fixtures require the explicit disposable-branch gates.",
  );
}

const databaseUrl = process.env.DATABASE_MIGRATION_URL;
const password = process.env.SLGS_SYNTHETIC_PASSWORD;
if (!databaseUrl || !password) {
  throw new Error(
    "The disposable database URL and synthetic password are required.",
  );
}

const fixtures = [
  [
    "cms-administrator",
    "Synthetic CMS Administrator",
    "cms_administrator",
    null,
  ],
  [
    "multimedia-member",
    "Synthetic Multimedia Member",
    "cms_multimedia_club",
    "multimedia",
  ],
  [
    "multimedia-supervisor",
    "Synthetic Multimedia Supervisor",
    "cms_multimedia_club_supervisor",
    "multimedia",
  ],
  [
    "news-member",
    "Synthetic News Journal Member",
    "cms_news_journal_club",
    "news-journal",
  ],
  [
    "news-supervisor",
    "Synthetic News Journal Supervisor",
    "cms_news_journal_club_supervisor",
    "news-journal",
  ],
  ["editor", "Synthetic Editor", "cms_editor", null],
  ["reviewer", "Synthetic Reviewer", "cms_reviewer", "organisation"],
  ["approver", "Synthetic Approver", "cms_approver", "organisation"],
  ["publisher", "Synthetic Publisher", "cms_publisher", null],
] as const;

const connection = createDatabase({ DATABASE_URL: databaseUrl });
try {
  await addApprovedBootstrapDomain(connection.db, {
    domain: "invalid.example",
    operatorReference: "synthetic-platform-operator-1",
  });
  const bootstrap = await initiateAdministratorBootstrap(connection.db, {
    application: "cms",
    role: "cms_system_administrator",
    name: "Synthetic CMS System Administrator",
    email: "phase1c-system-administrator@invalid.example",
    personReference: "synthetic-phase1c-system-administrator",
    password,
    initiatorReference: "synthetic-platform-operator-1",
  });
  await approveAdministratorBootstrap(connection.db, {
    requestId: bootstrap.requestId,
    approverReference: "synthetic-platform-operator-2",
  });

  const passwordHash = await hashPassword(password);
  await connection.db.transaction(async (transaction) => {
    const systemAdministratorId = bootstrap.userId;
    const clubRows = [
      {
        id: crypto.randomUUID(),
        key: "synthetic-multimedia",
        name: "Synthetic Multimedia Club",
        description: "Disposable Phase 1C browser fixture.",
        createdBy: systemAdministratorId,
      },
      {
        id: crypto.randomUUID(),
        key: "synthetic-news-journal",
        name: "Synthetic News Journal Club",
        description: "Disposable Phase 1C browser fixture.",
        createdBy: systemAdministratorId,
      },
    ];
    await transaction.insert(club).values(clubRows);
    const clubIds = new Map([
      ["multimedia", clubRows[0]!.id],
      ["news-journal", clubRows[1]!.id],
      ["organisation", "slgs"],
    ]);
    const roleKeys = fixtures.map((fixture) => fixture[2]);
    const roles = await transaction
      .select({ id: roleDefinition.id, key: roleDefinition.key })
      .from(roleDefinition)
      .where(
        and(
          eq(roleDefinition.application, "cms"),
          inArray(roleDefinition.key, roleKeys),
          eq(roleDefinition.active, true),
        ),
      );
    const rolesByKey = new Map(roles.map((role) => [role.key, role.id]));
    if (rolesByKey.size !== roleKeys.length) {
      throw new Error(
        "One or more required CMS fixture roles are unavailable.",
      );
    }

    for (const [key, name, roleKey, scope] of fixtures) {
      const userId = crypto.randomUUID();
      const membershipId = crypto.randomUUID();
      const assignmentId = crypto.randomUUID();
      await transaction.insert(user).values({
        id: userId,
        name,
        email: `phase1c-${key}@invalid.example`,
        emailVerified: true,
        personReference: `synthetic-phase1c-${key}`,
        status: "active",
      });
      await transaction.insert(account).values({
        id: crypto.randomUUID(),
        issuer: "local:credential",
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      });
      await transaction.insert(applicationMembership).values({
        id: membershipId,
        userId,
        application: "cms",
        status: "active",
        approvedBy: systemAdministratorId,
        approvedAt: new Date(),
      });
      await transaction.insert(roleAssignment).values({
        id: assignmentId,
        membershipId,
        roleDefinitionId: rolesByKey.get(roleKey)!,
        assignedBy: systemAdministratorId,
        reason: "Disposable Phase 1C browser fixture",
      });
      if (scope) {
        await transaction.insert(roleAssignmentScope).values({
          id: crypto.randomUUID(),
          roleAssignmentId: assignmentId,
          dimension: scope === "organisation" ? "organisation" : "club",
          value: clubIds.get(scope)!,
        });
      }
    }
  });

  console.log("Phase 1C synthetic browser fixtures created.");
  console.log(`Synthetic identities: ${fixtures.length + 1}`);
} finally {
  await connection.client.end();
}
