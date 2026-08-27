import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSchema,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const identitySchema = pgSchema("identity");

export const identityStatus = pgEnum("identity_status", [
  "pending",
  "active",
  "suspended",
  "deactivated",
]);
export const applicationName = pgEnum("application_name", ["cms", "sims"]);
export const membershipStatus = pgEnum("membership_status", [
  "active",
  "suspended",
  "deactivated",
]);
export const bootstrapStatus = pgEnum("bootstrap_status", [
  "pending",
  "approved",
  "rejected",
  "completed",
  "failed",
]);
export const auditOutcome = pgEnum("audit_outcome", [
  "success",
  "failure",
  "denied",
]);

export const user = identitySchema.table(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text(),
    personReference: text("person_reference").notNull(),
    status: identityStatus().notNull().default("pending"),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("identity_user_email_unique").on(table.email),
    unique("identity_user_person_reference_unique").on(table.personReference),
    index("identity_user_status_idx").on(table.status),
  ],
);

export const session = identitySchema.table(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("identity_session_token_unique").on(table.token),
    index("identity_session_user_idx").on(table.userId),
    index("identity_session_expiry_idx").on(table.expiresAt),
  ],
);

export const account = identitySchema.table(
  "account",
  {
    id: text().primaryKey(),
    issuer: text().notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text(),
    password: text(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("identity_account_issuer_unique").on(table.issuer, table.accountId),
    index("identity_account_user_idx").on(table.userId),
  ],
);

export const verification = identitySchema.table(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("identity_verification_identifier_idx").on(table.identifier),
  ],
);

export const twoFactor = identitySchema.table(
  "two_factor",
  {
    id: text().primaryKey(),
    secret: text().notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean().notNull().default(false),
    failedVerificationCount: integer("failed_verification_count")
      .notNull()
      .default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (table) => [unique("identity_two_factor_user_unique").on(table.userId)],
);

export const applicationMembership = identitySchema.table(
  "application_membership",
  {
    id: text().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    application: applicationName().notNull(),
    status: membershipStatus().notNull().default("active"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("identity_membership_user_application_unique").on(
      table.userId,
      table.application,
    ),
    index("identity_membership_application_status_idx").on(
      table.application,
      table.status,
    ),
  ],
);

export const roleDefinition = identitySchema.table(
  "role_definition",
  {
    id: text().primaryKey(),
    application: applicationName().notNull(),
    key: text().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    permissions: jsonb().$type<string[]>().notNull().default([]),
    systemManaged: boolean("system_managed").notNull().default(true),
    active: boolean().notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("identity_role_application_key_unique").on(
      table.application,
      table.key,
    ),
  ],
);

export const roleAssignment = identitySchema.table(
  "role_assignment",
  {
    id: text().primaryKey(),
    membershipId: text("membership_id")
      .notNull()
      .references(() => applicationMembership.id, { onDelete: "restrict" }),
    roleDefinitionId: text("role_definition_id")
      .notNull()
      .references(() => roleDefinition.id, { onDelete: "restrict" }),
    assignedBy: text("assigned_by").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedBy: text("revoked_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    reason: text(),
  },
  (table) => [
    index("identity_role_assignment_membership_idx").on(table.membershipId),
    check(
      "identity_role_assignment_revocation_complete",
      sql`(${table.revokedAt} is null and ${table.revokedBy} is null) or (${table.revokedAt} is not null and ${table.revokedBy} is not null)`,
    ),
  ],
);

export const approvedContactDomain = identitySchema.table(
  "approved_contact_domain",
  {
    domain: text().primaryKey(),
    active: boolean().notNull().default(true),
    managedBy: text("managed_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "identity_contact_domain_lowercase",
      sql`${table.domain} = lower(${table.domain})`,
    ),
  ],
);

export const privilegedBootstrap = identitySchema.table(
  "privileged_bootstrap",
  {
    id: text().primaryKey(),
    initiatedBy: text("initiated_by").notNull(),
    approvedBy: text("approved_by"),
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    application: applicationName().notNull(),
    roleKey: text("role_key").notNull(),
    status: bootstrapStatus().notNull().default("pending"),
    outcomeReason: text("outcome_reason"),
    initiatedAt: timestamp("initiated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "identity_bootstrap_distinct_approvers",
      sql`${table.approvedBy} is null or ${table.approvedBy} <> ${table.initiatedBy}`,
    ),
    index("identity_bootstrap_application_status_idx").on(
      table.application,
      table.status,
    ),
  ],
);

export const securityAuditEvent = identitySchema.table(
  "security_audit_event",
  {
    id: text().primaryKey(),
    eventType: text("event_type").notNull(),
    application: applicationName(),
    actorUserId: text("actor_user_id"),
    sessionId: text("session_id"),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    outcome: auditOutcome().notNull(),
    reasonCode: text("reason_code"),
    metadata: jsonb()
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("identity_audit_occurred_at_idx").on(table.occurredAt),
    index("identity_audit_actor_idx").on(table.actorUserId),
    index("identity_audit_target_idx").on(table.targetType, table.targetId),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  twoFactors: many(twoFactor),
  memberships: many(applicationMembership),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}));

export const membershipRelations = relations(
  applicationMembership,
  ({ one, many }) => ({
    user: one(user, {
      fields: [applicationMembership.userId],
      references: [user.id],
    }),
    assignments: many(roleAssignment),
  }),
);

export const roleAssignmentRelations = relations(roleAssignment, ({ one }) => ({
  membership: one(applicationMembership, {
    fields: [roleAssignment.membershipId],
    references: [applicationMembership.id],
  }),
  roleDefinition: one(roleDefinition, {
    fields: [roleAssignment.roleDefinitionId],
    references: [roleDefinition.id],
  }),
}));

export const roleDefinitionRelations = relations(
  roleDefinition,
  ({ many }) => ({
    assignments: many(roleAssignment),
  }),
);
