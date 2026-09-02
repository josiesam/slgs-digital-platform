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
  attendanceOccurrence,
  attendanceEntry,
  attendanceCorrection,
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
  AttendanceOccurrenceRecord,
  AttendanceEntryRecord,
  AttendanceCorrectionRecord,
  AttendanceOccurrenceStatus,
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

  async findStaffByIdentity(identityUserId: string) {
    return (
      (await this.executor.query.staff.findFirst({
        where: eq(staff.identityUserId, identityUserId),
      })) ?? null
    );
  }

  async findAttendanceOccurrence(id: string) {
    return (
      (await this.executor.query.attendanceOccurrence.findFirst({
        where: eq(attendanceOccurrence.id, id),
      })) ?? null
    );
  }

  async findAttendanceOccurrenceByContext(
    academicSessionId: string,
    classId: string,
    date: string,
  ) {
    return (
      (await this.executor.query.attendanceOccurrence.findFirst({
        where: and(
          eq(attendanceOccurrence.academicSessionId, academicSessionId),
          eq(attendanceOccurrence.classId, classId),
          eq(attendanceOccurrence.attendanceDate, date),
        ),
      })) ?? null
    );
  }

  async findAttendanceEntry(id: string) {
    return (
      (await this.executor.query.attendanceEntry.findFirst({
        where: eq(attendanceEntry.id, id),
      })) ?? null
    );
  }

  async findAttendanceEntryByStudent(occurrenceId: string, studentId: string) {
    return (
      (await this.executor.query.attendanceEntry.findFirst({
        where: and(
          eq(attendanceEntry.occurrenceId, occurrenceId),
          eq(attendanceEntry.studentId, studentId),
        ),
      })) ?? null
    );
  }

  async listAttendanceEntries(occurrenceId: string) {
    return this.executor
      .select()
      .from(attendanceEntry)
      .where(eq(attendanceEntry.occurrenceId, occurrenceId))
      .orderBy(asc(attendanceEntry.studentId));
  }

  async listAttendanceCorrections(entryId: string) {
    return this.executor
      .select()
      .from(attendanceCorrection)
      .where(eq(attendanceCorrection.entryId, entryId))
      .orderBy(desc(attendanceCorrection.createdAt));
  }

  async createAttendanceOccurrence(record: AttendanceOccurrenceRecord) {
    await this.executor.insert(attendanceOccurrence).values(record);
  }

  async saveAttendanceOccurrence(record: AttendanceOccurrenceRecord) {
    await this.executor
      .update(attendanceOccurrence)
      .set(record)
      .where(eq(attendanceOccurrence.id, record.id));
  }

  async createAttendanceEntry(record: AttendanceEntryRecord) {
    await this.executor.insert(attendanceEntry).values(record);
  }

  async saveAttendanceEntry(record: AttendanceEntryRecord) {
    await this.executor
      .update(attendanceEntry)
      .set(record)
      .where(eq(attendanceEntry.id, record.id));
  }

  async createAttendanceCorrection(record: AttendanceCorrectionRecord) {
    await this.executor.insert(attendanceCorrection).values(record);
  }

  async listAttendanceOccurrences(
    query: CoreListQuery & {
      classId?: string;
      academicSessionId?: string;
      date?: string;
    },
    access: CoreListAccess,
  ) {
    const sessionIds = valuesFor(access, "academic_session");
    const classIds = valuesFor(access, "class");

    const visibility =
      access.scopes === null
        ? undefined
        : and(
            classIds.length
              ? inArray(attendanceOccurrence.classId, classIds)
              : sql`true`,
            sessionIds.length
              ? inArray(attendanceOccurrence.academicSessionId, sessionIds)
              : sql`true`,
          );

    const conditions = compact([
      query.search
        ? or(
            ilike(academicClass.name, `%${query.search}%`),
            ilike(academicClass.code, `%${query.search}%`),
          )
        : undefined,
      query.status
        ? eq(
            attendanceOccurrence.status,
            query.status as AttendanceOccurrenceStatus,
          )
        : undefined,
      query.classId
        ? eq(attendanceOccurrence.classId, query.classId)
        : undefined,
      query.academicSessionId
        ? eq(attendanceOccurrence.academicSessionId, query.academicSessionId)
        : undefined,
      query.date
        ? eq(attendanceOccurrence.attendanceDate, query.date)
        : undefined,
      cursorCondition(
        attendanceOccurrence.attendanceDate,
        attendanceOccurrence.id,
        query,
      ),
      visibility,
    ]);

    return this.executor
      .select({
        id: attendanceOccurrence.id,
        academicSessionId: attendanceOccurrence.academicSessionId,
        classId: attendanceOccurrence.classId,
        attendanceDate: attendanceOccurrence.attendanceDate,
        status: attendanceOccurrence.status,
        recorderUserId: attendanceOccurrence.recorderUserId,
        recorderStaffId: attendanceOccurrence.recorderStaffId,
        createdAt: attendanceOccurrence.createdAt,
        updatedAt: attendanceOccurrence.updatedAt,
      })
      .from(attendanceOccurrence)
      .leftJoin(
        academicClass,
        eq(attendanceOccurrence.classId, academicClass.id),
      )
      .where(and(...conditions))
      .orderBy(
        query.direction === "asc"
          ? asc(attendanceOccurrence.attendanceDate)
          : desc(attendanceOccurrence.attendanceDate),
        query.direction === "asc"
          ? asc(attendanceOccurrence.id)
          : desc(attendanceOccurrence.id),
      )
      .limit(query.limit);
  }

  async getAttendanceHistory(studentId: string, access: CoreListAccess) {
    const sessionIds = valuesFor(access, "academic_session");
    const classIds = valuesFor(access, "class");

    const visibility =
      access.scopes === null
        ? undefined
        : and(
            classIds.length
              ? inArray(attendanceOccurrence.classId, classIds)
              : sql`true`,
            sessionIds.length
              ? inArray(attendanceOccurrence.academicSessionId, sessionIds)
              : sql`true`,
          );

    return this.executor
      .select({
        entry: attendanceEntry,
        occurrence: attendanceOccurrence,
      })
      .from(attendanceEntry)
      .innerJoin(
        attendanceOccurrence,
        eq(attendanceEntry.occurrenceId, attendanceOccurrence.id),
      )
      .where(
        and(eq(attendanceEntry.studentId, studentId), visibility ?? sql`true`),
      )
      .orderBy(desc(attendanceOccurrence.attendanceDate));
  }

  async getRosterForClass(classId: string) {
    return this.executor
      .select()
      .from(student)
      .where(and(eq(student.classId, classId), eq(student.status, "active")))
      .orderBy(asc(student.lastName), asc(student.firstName));
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
