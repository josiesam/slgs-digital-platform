import { z } from "zod";

import type { SessionIdentity } from "@slgs/auth";
import {
  PermissionDeniedError,
  evaluateAuthorization,
  type AuthorizationReason,
  type Permission,
  type ResourceAuthorizationContext,
} from "@slgs/permissions";

export { PermissionDeniedError } from "@slgs/permissions";

export const coreRecordStatusSchema = z.enum([
  "active",
  "inactive",
  "archived",
]);
export type CoreRecordStatus = z.infer<typeof coreRecordStatusSchema>;

export const academicSessionStatusSchema = z.enum([
  "planned",
  "active",
  "closed",
]);
export type AcademicSessionStatus = z.infer<typeof academicSessionStatusSchema>;

const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._/-]*$/,
    "Use letters, numbers, dots, underscores, slashes, or hyphens.",
  );

const nameSchema = z.string().trim().min(1).max(120);
const nullableIdentifierSchema = identifierSchema.nullable().default(null);
const dateOnlySchema = z.iso.date();

export const studentInputSchema = z.object({
  studentNumber: identifierSchema,
  admissionNumber: identifierSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  status: coreRecordStatusSchema.default("active"),
  admittedOn: dateOnlySchema.nullable().default(null),
  classId: nullableIdentifierSchema,
});
export type StudentInput = z.input<typeof studentInputSchema>;
export type StudentData = z.output<typeof studentInputSchema>;

export const staffInputSchema = z.object({
  staffNumber: identifierSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  email: z.email().trim().toLowerCase().nullable().default(null),
  identityUserId: nullableIdentifierSchema,
  status: coreRecordStatusSchema.default("active"),
});
export type StaffInput = z.input<typeof staffInputSchema>;
export type StaffData = z.output<typeof staffInputSchema>;

export const academicClassInputSchema = z.object({
  code: identifierSchema,
  name: nameSchema,
  academicSessionId: identifierSchema,
  status: coreRecordStatusSchema.default("active"),
});
export type AcademicClassInput = z.input<typeof academicClassInputSchema>;
export type AcademicClassData = z.output<typeof academicClassInputSchema>;

export const subjectInputSchema = z.object({
  code: identifierSchema,
  name: nameSchema,
  description: z.string().trim().max(1_000).nullable().default(null),
  academicSessionId: identifierSchema,
  status: coreRecordStatusSchema.default("active"),
});
export type SubjectInput = z.input<typeof subjectInputSchema>;
export type SubjectData = z.output<typeof subjectInputSchema>;

export const academicSessionInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    status: academicSessionStatusSchema.default("planned"),
  })
  .superRefine((value, context) => {
    if (value.endDate < value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "The end date must not precede the start date.",
      });
    }
  });
export type AcademicSessionInput = z.input<typeof academicSessionInputSchema>;
export type AcademicSessionData = z.output<typeof academicSessionInputSchema>;

export const coreResourceSchema = z.enum([
  "students",
  "staff",
  "classes",
  "subjects",
  "academic-sessions",
]);
export type CoreResource = z.infer<typeof coreResourceSchema>;

export const coreListQuerySchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z
    .union([coreRecordStatusSchema, academicSessionStatusSchema])
    .optional(),
  cursor: z.string().trim().max(1_000).nullable().default(null),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  direction: z.enum(["asc", "desc"]).default("asc"),
});
export type CoreListQueryInput = z.input<typeof coreListQuerySchema>;
export type CoreListQuery = z.output<typeof coreListQuerySchema>;

const coreCursorSchema = z.object({
  sortValue: z.string().max(240),
  id: identifierSchema,
});

export function encodeCoreCursor(sortValue: string, id: string): string {
  return encodeURIComponent(
    JSON.stringify(coreCursorSchema.parse({ sortValue, id })),
  );
}

export function decodeCoreCursor(cursor: string): {
  readonly sortValue: string;
  readonly id: string;
} {
  return coreCursorSchema.parse(JSON.parse(decodeURIComponent(cursor)));
}

interface RecordMetadata {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type StudentRecord = StudentData & RecordMetadata;
export type StaffRecord = StaffData & RecordMetadata;
export type AcademicClassRecord = AcademicClassData & RecordMetadata;
export type SubjectRecord = SubjectData & RecordMetadata;
export type AcademicSessionRecord = AcademicSessionData & RecordMetadata;

export interface SimsCoreAuditEvent {
  readonly id: string;
  readonly eventType: string;
  readonly actorUserId: string;
  readonly sessionId: string;
  readonly targetType: string;
  readonly targetId: string | null;
  readonly outcome: "success" | "failure" | "denied";
  readonly reasonCode: string | null;
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;
  readonly occurredAt: Date;
}

export interface CoreListAccess {
  /** null means school-wide; an empty array means no records are visible. */
  readonly scopes: readonly { dimension: string; value: string }[] | null;
}

export interface SimsCoreRepository {
  transaction<T>(
    work: (repository: SimsCoreRepository) => Promise<T>,
  ): Promise<T>;
  findAcademicSession(id: string): Promise<AcademicSessionRecord | null>;
  findAcademicClass(id: string): Promise<AcademicClassRecord | null>;
  findSubject(id: string): Promise<SubjectRecord | null>;
  findStudent(id: string): Promise<StudentRecord | null>;
  findStaff(id: string): Promise<StaffRecord | null>;
  listAcademicSessions(
    query: CoreListQuery,
    access: CoreListAccess,
  ): Promise<readonly AcademicSessionRecord[]>;
  listAcademicClasses(
    query: CoreListQuery,
    access: CoreListAccess,
  ): Promise<readonly AcademicClassRecord[]>;
  listSubjects(
    query: CoreListQuery,
    access: CoreListAccess,
  ): Promise<readonly SubjectRecord[]>;
  listStudents(
    query: CoreListQuery,
    access: CoreListAccess,
  ): Promise<readonly StudentRecord[]>;
  listStaff(
    query: CoreListQuery,
    access: CoreListAccess,
  ): Promise<readonly StaffRecord[]>;
  createAcademicSession(record: AcademicSessionRecord): Promise<void>;
  createAcademicClass(record: AcademicClassRecord): Promise<void>;
  createSubject(record: SubjectRecord): Promise<void>;
  createStudent(record: StudentRecord): Promise<void>;
  createStaff(record: StaffRecord): Promise<void>;
  saveAcademicSession(record: AcademicSessionRecord): Promise<void>;
  saveAcademicClass(record: AcademicClassRecord): Promise<void>;
  saveSubject(record: SubjectRecord): Promise<void>;
  saveStudent(record: StudentRecord): Promise<void>;
  saveStaff(record: StaffRecord): Promise<void>;
  appendAudit(event: SimsCoreAuditEvent): Promise<void>;
}

const permissionDomains = {
  academicSession: "academic_session",
  academicClass: "class",
  subject: "subject",
  student: "student",
  staff: "staff",
} as const;

type PermissionDomain =
  (typeof permissionDomains)[keyof typeof permissionDomains];
type CoreAction = "read" | "create" | "update";

const grantFor = (actor: SessionIdentity) => actor.grants.get("sims");

function permission(
  domain: PermissionDomain,
  action: CoreAction,
  scope: "school" | "assigned",
): Permission {
  return `${domain}:${action}:${scope}` as Permission;
}

function decisionFor(
  actor: SessionIdentity,
  domain: PermissionDomain,
  action: CoreAction,
  resource: ResourceAuthorizationContext,
) {
  const base = {
    identityId: actor.userId,
    application: "sims" as const,
    grant: grantFor(actor),
    resource,
  };
  const school = evaluateAuthorization({
    ...base,
    permission: permission(domain, action, "school"),
  });
  if (school.allowed) return school;
  return evaluateAuthorization({
    ...base,
    permission: permission(domain, action, "assigned"),
  });
}

function makeAudit(
  actor: SessionIdentity,
  eventType: string,
  targetType: string,
  targetId: string | null,
  outcome: SimsCoreAuditEvent["outcome"],
  reasonCode: string | null,
): SimsCoreAuditEvent {
  return {
    id: crypto.randomUUID(),
    eventType,
    actorUserId: actor.userId,
    sessionId: actor.sessionId,
    targetType,
    targetId,
    outcome,
    reasonCode,
    metadata: {},
    occurredAt: new Date(),
  };
}

async function authorizeMutation(
  repository: SimsCoreRepository,
  actor: SessionIdentity,
  domain: PermissionDomain,
  action: CoreAction,
  resource: ResourceAuthorizationContext,
  targetId: string | null,
): Promise<void> {
  const decision = decisionFor(actor, domain, action, resource);
  if (decision.allowed) return;
  await repository.appendAudit(
    makeAudit(
      actor,
      "authorization.denied",
      domain,
      targetId,
      "denied",
      decision.reason,
    ),
  );
  throw new PermissionDeniedError(decision.reason as AuthorizationReason);
}

async function authorizeRead(
  repository: SimsCoreRepository,
  actor: SessionIdentity,
  domain: PermissionDomain,
  resource: ResourceAuthorizationContext,
  targetId: string,
): Promise<void> {
  const decision = decisionFor(actor, domain, "read", resource);
  if (decision.allowed) return;
  await repository.appendAudit(
    makeAudit(
      actor,
      "authorization.denied",
      domain,
      targetId,
      "denied",
      decision.reason,
    ),
  );
  throw new PermissionDeniedError(decision.reason);
}

async function listAccess(
  repository: SimsCoreRepository,
  actor: SessionIdentity,
  domain: PermissionDomain,
): Promise<CoreListAccess> {
  const grant = grantFor(actor);
  const school = evaluateAuthorization({
    identityId: actor.userId,
    application: "sims",
    permission: permission(domain, "read", "school"),
    grant,
  });
  if (school.allowed) return { scopes: null };
  const assignedPermission = permission(domain, "read", "assigned");
  const scopes =
    grant?.entitlements
      .filter((entitlement) => entitlement.permissions.has(assignedPermission))
      .flatMap((entitlement) => entitlement.scopes) ?? [];
  if (scopes.length === 0) {
    await repository.appendAudit(
      makeAudit(
        actor,
        "authorization.denied",
        domain,
        null,
        "denied",
        school.reason,
      ),
    );
    throw new PermissionDeniedError(school.reason);
  }
  return { scopes };
}

async function classScopes(
  repository: SimsCoreRepository,
  classId: string | null,
): Promise<ResourceAuthorizationContext> {
  if (!classId) return { scopes: [] };
  const record = await repository.findAcademicClass(classId);
  if (!record) throw new Error("The selected class does not exist.");
  return {
    scopes: [
      { dimension: "class", value: record.id },
      { dimension: "academic_session", value: record.academicSessionId },
    ],
  };
}

function sessionScopes(id: string): ResourceAuthorizationContext {
  return { scopes: [{ dimension: "academic_session", value: id }] };
}

function classRecordScopes(
  record: AcademicClassData,
): ResourceAuthorizationContext {
  return {
    scopes: [
      { dimension: "class", value: record.code },
      { dimension: "academic_session", value: record.academicSessionId },
    ],
  };
}

function subjectScopes(record: SubjectData): ResourceAuthorizationContext {
  return {
    scopes: [
      { dimension: "subject", value: record.code },
      { dimension: "academic_session", value: record.academicSessionId },
    ],
  };
}

function createRecord<T extends object>(data: T): T & RecordMetadata {
  const now = new Date();
  return { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
}

export function createSimsCoreService(repository: SimsCoreRepository) {
  return {
    async listStudents(actor: SessionIdentity, query: CoreListQueryInput = {}) {
      return repository.listStudents(
        coreListQuerySchema.parse(query),
        await listAccess(repository, actor, permissionDomains.student),
      );
    },
    async getStudent(actor: SessionIdentity, id: string) {
      const record = await repository.findStudent(id);
      if (!record) return null;
      await authorizeRead(
        repository,
        actor,
        permissionDomains.student,
        await classScopes(repository, record.classId),
        id,
      );
      return record;
    },
    async listStaff(actor: SessionIdentity, query: CoreListQueryInput = {}) {
      return repository.listStaff(
        coreListQuerySchema.parse(query),
        await listAccess(repository, actor, permissionDomains.staff),
      );
    },
    async getStaff(actor: SessionIdentity, id: string) {
      const record = await repository.findStaff(id);
      if (!record) return null;
      await authorizeRead(
        repository,
        actor,
        permissionDomains.staff,
        { scopes: [] },
        id,
      );
      return record;
    },
    async listAcademicSessions(
      actor: SessionIdentity,
      query: CoreListQueryInput = {},
    ) {
      return repository.listAcademicSessions(
        coreListQuerySchema.parse(query),
        await listAccess(repository, actor, permissionDomains.academicSession),
      );
    },
    async getAcademicSession(actor: SessionIdentity, id: string) {
      const record = await repository.findAcademicSession(id);
      if (!record) return null;
      await authorizeRead(
        repository,
        actor,
        permissionDomains.academicSession,
        sessionScopes(id),
        id,
      );
      return record;
    },
    async listAcademicClasses(
      actor: SessionIdentity,
      query: CoreListQueryInput = {},
    ) {
      return repository.listAcademicClasses(
        coreListQuerySchema.parse(query),
        await listAccess(repository, actor, permissionDomains.academicClass),
      );
    },
    async getAcademicClass(actor: SessionIdentity, id: string) {
      const record = await repository.findAcademicClass(id);
      if (!record) return null;
      await authorizeRead(
        repository,
        actor,
        permissionDomains.academicClass,
        {
          scopes: [
            { dimension: "class", value: id },
            { dimension: "academic_session", value: record.academicSessionId },
          ],
        },
        id,
      );
      return record;
    },
    async listSubjects(actor: SessionIdentity, query: CoreListQueryInput = {}) {
      return repository.listSubjects(
        coreListQuerySchema.parse(query),
        await listAccess(repository, actor, permissionDomains.subject),
      );
    },
    async getSubject(actor: SessionIdentity, id: string) {
      const record = await repository.findSubject(id);
      if (!record) return null;
      await authorizeRead(
        repository,
        actor,
        permissionDomains.subject,
        {
          scopes: [
            { dimension: "subject", value: id },
            { dimension: "academic_session", value: record.academicSessionId },
          ],
        },
        id,
      );
      return record;
    },
    async createStudent(input: {
      actor: SessionIdentity;
      input: StudentInput;
    }): Promise<StudentRecord> {
      const data = studentInputSchema.parse(input.input);
      const scopes = await classScopes(repository, data.classId);
      await authorizeMutation(
        repository,
        input.actor,
        permissionDomains.student,
        "create",
        scopes,
        null,
      );
      const record = createRecord(data);
      return repository.transaction(async (transaction) => {
        await transaction.createStudent(record);
        await transaction.appendAudit(
          makeAudit(
            input.actor,
            "student.created",
            "student",
            record.id,
            "success",
            null,
          ),
        );
        return record;
      });
    },

    async updateStudent(input: {
      actor: SessionIdentity;
      id: string;
      input: StudentInput;
    }): Promise<StudentRecord> {
      const existing = await repository.findStudent(input.id);
      if (!existing) throw new Error("Student record not found.");
      const data = studentInputSchema.parse(input.input);
      const existingScopes = await classScopes(repository, existing.classId);
      const nextScopes = await classScopes(repository, data.classId);
      await authorizeMutation(
        repository,
        input.actor,
        permissionDomains.student,
        "update",
        existingScopes,
        existing.id,
      );
      await authorizeMutation(
        repository,
        input.actor,
        permissionDomains.student,
        "update",
        nextScopes,
        existing.id,
      );
      const record = { ...existing, ...data, updatedAt: new Date() };
      return repository.transaction(async (transaction) => {
        await transaction.saveStudent(record);
        await transaction.appendAudit(
          makeAudit(
            input.actor,
            "student.updated",
            "student",
            record.id,
            "success",
            null,
          ),
        );
        return record;
      });
    },

    async createStaff(input: {
      actor: SessionIdentity;
      input: StaffInput;
    }): Promise<StaffRecord> {
      const data = staffInputSchema.parse(input.input);
      await authorizeMutation(
        repository,
        input.actor,
        permissionDomains.staff,
        "create",
        { scopes: [] },
        null,
      );
      const record = createRecord(data);
      return repository.transaction(async (transaction) => {
        await transaction.createStaff(record);
        await transaction.appendAudit(
          makeAudit(
            input.actor,
            "staff.created",
            "staff",
            record.id,
            "success",
            null,
          ),
        );
        return record;
      });
    },

    async updateStaff(input: {
      actor: SessionIdentity;
      id: string;
      input: StaffInput;
    }): Promise<StaffRecord> {
      const existing = await repository.findStaff(input.id);
      if (!existing) throw new Error("Staff record not found.");
      const data = staffInputSchema.parse(input.input);
      await authorizeMutation(
        repository,
        input.actor,
        permissionDomains.staff,
        "update",
        { scopes: [] },
        existing.id,
      );
      const record = { ...existing, ...data, updatedAt: new Date() };
      return repository.transaction(async (transaction) => {
        await transaction.saveStaff(record);
        await transaction.appendAudit(
          makeAudit(
            input.actor,
            "staff.updated",
            "staff",
            record.id,
            "success",
            null,
          ),
        );
        return record;
      });
    },

    async createAcademicSession(input: {
      actor: SessionIdentity;
      input: AcademicSessionInput;
    }): Promise<AcademicSessionRecord> {
      const data = academicSessionInputSchema.parse(input.input);
      const record = createRecord(data);
      await authorizeMutation(
        repository,
        input.actor,
        permissionDomains.academicSession,
        "create",
        sessionScopes(record.id),
        null,
      );
      return repository.transaction(async (transaction) => {
        await transaction.createAcademicSession(record);
        await transaction.appendAudit(
          makeAudit(
            input.actor,
            "academic_session.created",
            "academic_session",
            record.id,
            "success",
            null,
          ),
        );
        return record;
      });
    },

    async updateAcademicSession(input: {
      actor: SessionIdentity;
      id: string;
      input: AcademicSessionInput;
    }): Promise<AcademicSessionRecord> {
      const existing = await repository.findAcademicSession(input.id);
      if (!existing) throw new Error("Academic session not found.");
      const data = academicSessionInputSchema.parse(input.input);
      await authorizeMutation(
        repository,
        input.actor,
        permissionDomains.academicSession,
        "update",
        sessionScopes(existing.id),
        existing.id,
      );
      const record = { ...existing, ...data, updatedAt: new Date() };
      return repository.transaction(async (transaction) => {
        await transaction.saveAcademicSession(record);
        await transaction.appendAudit(
          makeAudit(
            input.actor,
            "academic_session.updated",
            "academic_session",
            record.id,
            "success",
            null,
          ),
        );
        return record;
      });
    },

    async createAcademicClass(input: {
      actor: SessionIdentity;
      input: AcademicClassInput;
    }): Promise<AcademicClassRecord> {
      const data = academicClassInputSchema.parse(input.input);
      if (!(await repository.findAcademicSession(data.academicSessionId)))
        throw new Error("The selected academic session does not exist.");
      const record = createRecord(data);
      const scopes = {
        scopes: [
          { dimension: "class" as const, value: record.id },
          ...(classRecordScopes(data).scopes ?? []).filter(
            (scope) => scope.dimension !== "class",
          ),
        ],
      };
      await authorizeMutation(
        repository,
        input.actor,
        permissionDomains.academicClass,
        "create",
        scopes,
        null,
      );
      return repository.transaction(async (transaction) => {
        await transaction.createAcademicClass(record);
        await transaction.appendAudit(
          makeAudit(
            input.actor,
            "class.created",
            "class",
            record.id,
            "success",
            null,
          ),
        );
        return record;
      });
    },

    async updateAcademicClass(input: {
      actor: SessionIdentity;
      id: string;
      input: AcademicClassInput;
    }): Promise<AcademicClassRecord> {
      const existing = await repository.findAcademicClass(input.id);
      if (!existing) throw new Error("Class record not found.");
      const data = academicClassInputSchema.parse(input.input);
      if (!(await repository.findAcademicSession(data.academicSessionId)))
        throw new Error("The selected academic session does not exist.");
      const scopes = {
        scopes: [
          { dimension: "class" as const, value: existing.id },
          {
            dimension: "academic_session" as const,
            value: data.academicSessionId,
          },
        ],
      };
      await authorizeMutation(
        repository,
        input.actor,
        permissionDomains.academicClass,
        "update",
        scopes,
        existing.id,
      );
      const record = { ...existing, ...data, updatedAt: new Date() };
      return repository.transaction(async (transaction) => {
        await transaction.saveAcademicClass(record);
        await transaction.appendAudit(
          makeAudit(
            input.actor,
            "class.updated",
            "class",
            record.id,
            "success",
            null,
          ),
        );
        return record;
      });
    },

    async createSubject(input: {
      actor: SessionIdentity;
      input: SubjectInput;
    }): Promise<SubjectRecord> {
      const data = subjectInputSchema.parse(input.input);
      if (!(await repository.findAcademicSession(data.academicSessionId)))
        throw new Error("The selected academic session does not exist.");
      const record = createRecord(data);
      const scopes = {
        scopes: [
          { dimension: "subject" as const, value: record.id },
          ...(subjectScopes(data).scopes ?? []).filter(
            (scope) => scope.dimension !== "subject",
          ),
        ],
      };
      await authorizeMutation(
        repository,
        input.actor,
        permissionDomains.subject,
        "create",
        scopes,
        null,
      );
      return repository.transaction(async (transaction) => {
        await transaction.createSubject(record);
        await transaction.appendAudit(
          makeAudit(
            input.actor,
            "subject.created",
            "subject",
            record.id,
            "success",
            null,
          ),
        );
        return record;
      });
    },

    async updateSubject(input: {
      actor: SessionIdentity;
      id: string;
      input: SubjectInput;
    }): Promise<SubjectRecord> {
      const existing = await repository.findSubject(input.id);
      if (!existing) throw new Error("Subject record not found.");
      const data = subjectInputSchema.parse(input.input);
      if (!(await repository.findAcademicSession(data.academicSessionId)))
        throw new Error("The selected academic session does not exist.");
      const scopes = {
        scopes: [
          { dimension: "subject" as const, value: existing.id },
          {
            dimension: "academic_session" as const,
            value: data.academicSessionId,
          },
        ],
      };
      await authorizeMutation(
        repository,
        input.actor,
        permissionDomains.subject,
        "update",
        scopes,
        existing.id,
      );
      const record = { ...existing, ...data, updatedAt: new Date() };
      return repository.transaction(async (transaction) => {
        await transaction.saveSubject(record);
        await transaction.appendAudit(
          makeAudit(
            input.actor,
            "subject.updated",
            "subject",
            record.id,
            "success",
            null,
          ),
        );
        return record;
      });
    },
  };
}
