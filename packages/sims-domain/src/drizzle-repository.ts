import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  academicClass,
  academicSession,
  securityAuditEvent,
  staff,
  student,
  subject,
  type DatabaseConnection,
} from "@slgs/db";

import type {
  AcademicClassRecord,
  AcademicSessionRecord,
  CoreListAccess,
  CoreListQuery,
  SimsCoreAuditEvent,
  SimsCoreRepository,
  StaffRecord,
  StudentRecord,
  SubjectRecord,
} from "./index";
import { decodeCoreCursor } from "./index";

type Database = DatabaseConnection["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Executor = Database | Transaction;

const compact = (conditions: (SQL | undefined)[]) =>
  conditions.filter((condition): condition is SQL => Boolean(condition));

function valuesFor(access: CoreListAccess, dimension: string): string[] {
  return (
    access.scopes
      ?.filter((scope) => scope.dimension === dimension)
      .map((scope) => scope.value) ?? []
  );
}

function scopeCondition(
  access: CoreListAccess,
  dimensions: Readonly<Record<string, Parameters<typeof inArray>[0]>>,
): SQL | undefined {
  if (access.scopes === null) return undefined;
  const candidates = Object.entries(dimensions).flatMap(
    ([dimension, column]) => {
      const values = valuesFor(access, dimension);
      return values.length > 0 ? [inArray(column, values)] : [];
    },
  );
  return candidates.length > 0 ? or(...candidates) : sql`false`;
}

function cursorCondition(
  sortColumn: Parameters<typeof gt>[0],
  idColumn: Parameters<typeof gt>[0],
  query: CoreListQuery,
) {
  if (!query.cursor) return undefined;
  const cursor = decodeCoreCursor(query.cursor);
  return query.direction === "asc"
    ? or(
        gt(sortColumn, cursor.sortValue),
        and(eq(sortColumn, cursor.sortValue), gt(idColumn, cursor.id)),
      )
    : or(
        lt(sortColumn, cursor.sortValue),
        and(eq(sortColumn, cursor.sortValue), lt(idColumn, cursor.id)),
      );
}

export class DrizzleSimsCoreRepository implements SimsCoreRepository {
  constructor(private readonly executor: Executor) {}

  async transaction<T>(
    work: (repository: SimsCoreRepository) => Promise<T>,
  ): Promise<T> {
    if (!("transaction" in this.executor)) return work(this);
    return this.executor.transaction((transaction) =>
      work(new DrizzleSimsCoreRepository(transaction)),
    );
  }

  async findAcademicSession(id: string) {
    return (
      (await this.executor.query.academicSession.findFirst({
        where: eq(academicSession.id, id),
      })) ?? null
    );
  }
  async findAcademicClass(id: string) {
    return (
      (await this.executor.query.academicClass.findFirst({
        where: eq(academicClass.id, id),
      })) ?? null
    );
  }
  async findSubject(id: string) {
    return (
      (await this.executor.query.subject.findFirst({
        where: eq(subject.id, id),
      })) ?? null
    );
  }
  async findStudent(id: string) {
    return (
      (await this.executor.query.student.findFirst({
        where: eq(student.id, id),
      })) ?? null
    );
  }
  async findStaff(id: string) {
    return (
      (await this.executor.query.staff.findFirst({
        where: eq(staff.id, id),
      })) ?? null
    );
  }

  async listAcademicSessions(query: CoreListQuery, access: CoreListAccess) {
    return this.executor
      .select()
      .from(academicSession)
      .where(
        and(
          ...compact([
            query.search
              ? ilike(academicSession.name, `%${query.search}%`)
              : undefined,
            query.status
              ? eq(
                  academicSession.status,
                  query.status as AcademicSessionRecord["status"],
                )
              : undefined,
            cursorCondition(academicSession.name, academicSession.id, query),
            scopeCondition(access, { academic_session: academicSession.id }),
          ]),
        ),
      )
      .orderBy(
        query.direction === "asc"
          ? asc(academicSession.name)
          : desc(academicSession.name),
        query.direction === "asc"
          ? asc(academicSession.id)
          : desc(academicSession.id),
      )
      .limit(query.limit);
  }

  async listAcademicClasses(query: CoreListQuery, access: CoreListAccess) {
    return this.executor
      .select()
      .from(academicClass)
      .where(
        and(
          ...compact([
            query.search
              ? or(
                  ilike(academicClass.name, `%${query.search}%`),
                  ilike(academicClass.code, `%${query.search}%`),
                )
              : undefined,
            query.status
              ? eq(
                  academicClass.status,
                  query.status as AcademicClassRecord["status"],
                )
              : undefined,
            cursorCondition(academicClass.name, academicClass.id, query),
            scopeCondition(access, {
              class: academicClass.id,
              academic_session: academicClass.academicSessionId,
            }),
          ]),
        ),
      )
      .orderBy(
        query.direction === "asc"
          ? asc(academicClass.name)
          : desc(academicClass.name),
        query.direction === "asc"
          ? asc(academicClass.id)
          : desc(academicClass.id),
      )
      .limit(query.limit);
  }

  async listSubjects(query: CoreListQuery, access: CoreListAccess) {
    return this.executor
      .select()
      .from(subject)
      .where(
        and(
          ...compact([
            query.search
              ? or(
                  ilike(subject.name, `%${query.search}%`),
                  ilike(subject.code, `%${query.search}%`),
                )
              : undefined,
            query.status
              ? eq(subject.status, query.status as SubjectRecord["status"])
              : undefined,
            cursorCondition(subject.name, subject.id, query),
            scopeCondition(access, {
              subject: subject.id,
              academic_session: subject.academicSessionId,
            }),
          ]),
        ),
      )
      .orderBy(
        query.direction === "asc" ? asc(subject.name) : desc(subject.name),
        query.direction === "asc" ? asc(subject.id) : desc(subject.id),
      )
      .limit(query.limit);
  }

  async listStudents(query: CoreListQuery, access: CoreListAccess) {
    const sessionIds = valuesFor(access, "academic_session");
    const classIds = valuesFor(access, "class");
    const visibility =
      access.scopes === null
        ? undefined
        : or(
            classIds.length ? inArray(student.classId, classIds) : sql`false`,
            sessionIds.length
              ? inArray(academicClass.academicSessionId, sessionIds)
              : sql`false`,
          );
    return this.executor
      .select({
        id: student.id,
        studentNumber: student.studentNumber,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        status: student.status,
        admittedOn: student.admittedOn,
        classId: student.classId,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      })
      .from(student)
      .leftJoin(academicClass, eq(student.classId, academicClass.id))
      .where(
        and(
          ...compact([
            query.search
              ? or(
                  ilike(student.firstName, `%${query.search}%`),
                  ilike(student.lastName, `%${query.search}%`),
                  ilike(student.studentNumber, `%${query.search}%`),
                  ilike(student.admissionNumber, `%${query.search}%`),
                )
              : undefined,
            query.status
              ? eq(student.status, query.status as StudentRecord["status"])
              : undefined,
            cursorCondition(student.lastName, student.id, query),
            visibility,
          ]),
        ),
      )
      .orderBy(
        query.direction === "asc"
          ? asc(student.lastName)
          : desc(student.lastName),
        query.direction === "asc" ? asc(student.id) : desc(student.id),
      )
      .limit(query.limit);
  }

  async listStaff(query: CoreListQuery, access: CoreListAccess) {
    return this.executor
      .select()
      .from(staff)
      .where(
        and(
          ...compact([
            query.search
              ? or(
                  ilike(staff.firstName, `%${query.search}%`),
                  ilike(staff.lastName, `%${query.search}%`),
                  ilike(staff.staffNumber, `%${query.search}%`),
                )
              : undefined,
            query.status
              ? eq(staff.status, query.status as StaffRecord["status"])
              : undefined,
            cursorCondition(staff.lastName, staff.id, query),
            access.scopes === null ? undefined : sql`false`,
          ]),
        ),
      )
      .orderBy(
        query.direction === "asc" ? asc(staff.lastName) : desc(staff.lastName),
        query.direction === "asc" ? asc(staff.id) : desc(staff.id),
      )
      .limit(query.limit);
  }

  async createAcademicSession(record: AcademicSessionRecord) {
    await this.executor.insert(academicSession).values(record);
  }
  async createAcademicClass(record: AcademicClassRecord) {
    await this.executor.insert(academicClass).values(record);
  }
  async createSubject(record: SubjectRecord) {
    await this.executor.insert(subject).values(record);
  }
  async createStudent(record: StudentRecord) {
    await this.executor.insert(student).values(record);
  }
  async createStaff(record: StaffRecord) {
    await this.executor.insert(staff).values(record);
  }
  async saveAcademicSession(record: AcademicSessionRecord) {
    await this.executor
      .update(academicSession)
      .set(record)
      .where(eq(academicSession.id, record.id));
  }
  async saveAcademicClass(record: AcademicClassRecord) {
    await this.executor
      .update(academicClass)
      .set(record)
      .where(eq(academicClass.id, record.id));
  }
  async saveSubject(record: SubjectRecord) {
    await this.executor
      .update(subject)
      .set(record)
      .where(eq(subject.id, record.id));
  }
  async saveStudent(record: StudentRecord) {
    await this.executor
      .update(student)
      .set(record)
      .where(eq(student.id, record.id));
  }
  async saveStaff(record: StaffRecord) {
    await this.executor
      .update(staff)
      .set(record)
      .where(eq(staff.id, record.id));
  }

  async appendAudit(event: SimsCoreAuditEvent) {
    await this.executor.insert(securityAuditEvent).values({
      id: event.id,
      eventType: event.eventType,
      application: "sims",
      actorUserId: event.actorUserId,
      sessionId: event.sessionId,
      targetType: event.targetType,
      targetId: event.targetId,
      outcome: event.outcome,
      reasonCode: event.reasonCode,
      metadata: { ...event.metadata },
      occurredAt: event.occurredAt,
    });
  }
}
