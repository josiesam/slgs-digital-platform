import { describe, expect, it } from "vitest";

import type { SessionIdentity } from "@slgs/auth";
import { createGrant, createScopedGrant } from "@slgs/permissions";

import {
  PermissionDeniedError,
  createSimsCoreService,
  type SimsCoreAuditEvent,
  type SimsCoreRepository,
  type StudentRecord,
  type AcademicClassRecord,
  type AcademicSessionRecord,
  type StaffRecord,
  type SubjectRecord,
  type AttendanceOccurrenceRecord,
  type AttendanceEntryRecord,
  type AttendanceCorrectionRecord,
} from "./index";

const actor = (grant: ReturnType<typeof createGrant>): SessionIdentity => ({
  userId: "actor-1",
  sessionId: "session-1",
  grants: new Map([["sims", grant]]),
});

class MemoryRepository implements SimsCoreRepository {
  readonly students = new Map<string, StudentRecord>();
  readonly sessions = new Map<
    string,
    Awaited<ReturnType<SimsCoreRepository["findAcademicSession"]>> & object
  >();
  readonly classes = new Map<
    string,
    NonNullable<Awaited<ReturnType<SimsCoreRepository["findAcademicClass"]>>>
  >();
  readonly subjects = new Map<
    string,
    NonNullable<Awaited<ReturnType<SimsCoreRepository["findSubject"]>>>
  >();
  readonly staff = new Map<
    string,
    NonNullable<Awaited<ReturnType<SimsCoreRepository["findStaff"]>>>
  >();
  readonly audits: SimsCoreAuditEvent[] = [];

  async findStaffByIdentity(identityUserId: string): Promise<StaffRecord | null> {
    return null;
  }
  async findAttendanceOccurrence(id: string): Promise<AttendanceOccurrenceRecord | null> {
    return null;
  }
  async findAttendanceOccurrenceByContext(academicSessionId: string, classId: string, date: string): Promise<AttendanceOccurrenceRecord | null> {
    return null;
  }
  async findAttendanceEntry(id: string): Promise<AttendanceEntryRecord | null> {
    return null;
  }
  async findAttendanceEntryByStudent(occurrenceId: string, studentId: string): Promise<AttendanceEntryRecord | null> {
    return null;
  }
  async listAttendanceEntries(occurrenceId: string): Promise<readonly AttendanceEntryRecord[]> {
    return [];
  }
  async listAttendanceCorrections(entryId: string): Promise<readonly AttendanceCorrectionRecord[]> {
    return [];
  }
  async createAttendanceOccurrence(record: AttendanceOccurrenceRecord): Promise<void> {}
  async saveAttendanceOccurrence(record: AttendanceOccurrenceRecord): Promise<void> {}
  async createAttendanceEntry(record: AttendanceEntryRecord): Promise<void> {}
  async saveAttendanceEntry(record: AttendanceEntryRecord): Promise<void> {}
  async createAttendanceCorrection(record: AttendanceCorrectionRecord): Promise<void> {}
  async listAttendanceOccurrences(query: any, access: any): Promise<readonly AttendanceOccurrenceRecord[]> {
    return [];
  }
  async getAttendanceHistory(studentId: string, access: any): Promise<readonly { entry: AttendanceEntryRecord, occurrence: AttendanceOccurrenceRecord }[]> {
    return [];
  }
  async getRosterForClass(classId: string): Promise<readonly StudentRecord[]> {
    return [];
  }

  async transaction<T>(
    work: (repository: SimsCoreRepository) => Promise<T>,
  ): Promise<T> {
    return work(this);
  }
  async findAcademicSession(id: string) {
    return this.sessions.get(id) ?? null;
  }
  async findAcademicClass(id: string) {
    return (
      this.classes.get(id) ??
      (id === "class-1"
        ? {
            id,
            code: "JSS-1",
            name: "JSS 1",
            academicSessionId: "session-2026",
            status: "active" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : null)
    );
  }
  async findSubject(id: string) {
    return this.subjects.get(id) ?? null;
  }
  async findStudent(id: string) {
    return this.students.get(id) ?? null;
  }
  async findStaff(id: string) {
    return this.staff.get(id) ?? null;
  }
  async listAcademicSessions() {
    return [...this.sessions.values()];
  }
  async listAcademicClasses() {
    return [...this.classes.values()];
  }
  async listSubjects() {
    return [...this.subjects.values()];
  }
  async listStudents(
    _query: unknown,
    access: { scopes: readonly { dimension: string; value: string }[] | null },
  ) {
    if (access.scopes === null) return [...this.students.values()];
    const classes = new Set(
      access.scopes
        .filter((scope) => scope.dimension === "class")
        .map((scope) => scope.value),
    );
    return [...this.students.values()].filter(
      (record) => record.classId && classes.has(record.classId),
    );
  }
  async listStaff() {
    return [...this.staff.values()];
  }
  async createAcademicSession(
    record: NonNullable<
      Awaited<ReturnType<SimsCoreRepository["findAcademicSession"]>>
    >,
  ) {
    this.sessions.set(record.id, record);
  }
  async createAcademicClass(
    record: NonNullable<
      Awaited<ReturnType<SimsCoreRepository["findAcademicClass"]>>
    >,
  ) {
    this.classes.set(record.id, record);
  }
  async createSubject(
    record: NonNullable<Awaited<ReturnType<SimsCoreRepository["findSubject"]>>>,
  ) {
    this.subjects.set(record.id, record);
  }
  async createStudent(record: StudentRecord) {
    this.students.set(record.id, record);
  }
  async createStaff(
    record: NonNullable<Awaited<ReturnType<SimsCoreRepository["findStaff"]>>>,
  ) {
    this.staff.set(record.id, record);
  }
  async saveAcademicSession(
    record: NonNullable<
      Awaited<ReturnType<SimsCoreRepository["findAcademicSession"]>>
    >,
  ) {
    this.sessions.set(record.id, record);
  }
  async saveAcademicClass(
    record: NonNullable<
      Awaited<ReturnType<SimsCoreRepository["findAcademicClass"]>>
    >,
  ) {
    this.classes.set(record.id, record);
  }
  async saveSubject(
    record: NonNullable<Awaited<ReturnType<SimsCoreRepository["findSubject"]>>>,
  ) {
    this.subjects.set(record.id, record);
  }
  async saveStudent(record: StudentRecord) {
    this.students.set(record.id, record);
  }
  async saveStaff(
    record: NonNullable<Awaited<ReturnType<SimsCoreRepository["findStaff"]>>>,
  ) {
    this.staff.set(record.id, record);
  }
  async appendAudit(event: SimsCoreAuditEvent) {
    this.audits.push(event);
  }
}

describe("S.I.M.S. core service authorization and audit", () => {
  it("creates an administrative student record and an audit event atomically", async () => {
    const repository = new MemoryRepository();
    const service = createSimsCoreService(repository);
    const created = await service.createStudent({
      actor: actor(createGrant("sims", ["student:create:school"])),
      input: {
        studentNumber: "ST-0001",
        admissionNumber: "ADM-0001",
        firstName: "Synthetic",
        lastName: "Student",
        classId: null,
        admittedOn: null,
        status: "active",
      },
    });

    expect(repository.students.get(created.id)).toEqual(created);
    expect(repository.audits).toEqual([
      expect.objectContaining({
        eventType: "student.created",
        actorUserId: "actor-1",
        targetId: created.id,
        outcome: "success",
      }),
    ]);
  });

  it("denies and audits an assigned actor outside the student's class", async () => {
    const repository = new MemoryRepository();
    const service = createSimsCoreService(repository);
    const now = new Date();
    repository.students.set("student-existing", {
      id: "student-existing",
      studentNumber: "ST-0002",
      admissionNumber: "ADM-0002",
      firstName: "Synthetic",
      lastName: "Denied",
      classId: "class-1",
      admittedOn: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const assigned = createScopedGrant("sims", [
      {
        permissions: ["student:update:assigned"],
        scopes: [{ dimension: "class", value: "another-class" }],
      },
    ]);

    await expect(
      service.updateStudent({
        actor: actor(assigned),
        id: "student-existing",
        input: {
          studentNumber: "ST-0002",
          admissionNumber: "ADM-0002",
          firstName: "Synthetic",
          lastName: "Denied",
          classId: "class-1",
          admittedOn: null,
          status: "active",
        },
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(repository.students.get("student-existing")?.classId).toBe(
      "class-1",
    );
    expect(repository.audits).toEqual([
      expect.objectContaining({
        eventType: "authorization.denied",
        outcome: "denied",
        reasonCode: "scope_mismatch",
      }),
    ]);
  });

  it("archives rather than deleting a student", async () => {
    const repository = new MemoryRepository();
    const service = createSimsCoreService(repository);
    const admin = actor(
      createGrant("sims", ["student:create:school", "student:update:school"]),
    );
    const created = await service.createStudent({
      actor: admin,
      input: {
        studentNumber: "ST-0003",
        admissionNumber: "ADM-0003",
        firstName: "Synthetic",
        lastName: "Lifecycle",
      },
    });

    const archived = await service.updateStudent({
      actor: admin,
      id: created.id,
      input: { ...created, status: "archived" },
    });
    expect(archived.status).toBe("archived");
    expect(repository.audits.at(-1)?.eventType).toBe("student.updated");
  });

  it("creates the approved session, class, subject and staff core records", async () => {
    const repository = new MemoryRepository();
    const service = createSimsCoreService(repository);
    const admin = actor(
      createGrant("sims", [
        "academic_session:create:school",
        "class:create:school",
        "subject:create:school",
        "staff:create:school",
      ]),
    );
    const session = await service.createAcademicSession({
      actor: admin,
      input: {
        name: "Synthetic 2026/27",
        startDate: "2026-09-01",
        endDate: "2027-07-31",
        status: "planned",
      },
    });
    const academicClass = await service.createAcademicClass({
      actor: admin,
      input: {
        code: "JSS-1",
        name: "JSS 1",
        academicSessionId: session.id,
        status: "active",
      },
    });
    const subject = await service.createSubject({
      actor: admin,
      input: {
        code: "MATH",
        name: "Mathematics",
        description: null,
        academicSessionId: session.id,
        status: "active",
      },
    });
    const staff = await service.createStaff({
      actor: admin,
      input: {
        staffNumber: "SF-0001",
        firstName: "Synthetic",
        lastName: "Staff",
        email: null,
        identityUserId: null,
        status: "active",
      },
    });

    expect(repository.sessions.has(session.id)).toBe(true);
    expect(repository.classes.has(academicClass.id)).toBe(true);
    expect(repository.subjects.has(subject.id)).toBe(true);
    expect(repository.staff.has(staff.id)).toBe(true);
    expect(repository.audits.map((event) => event.eventType)).toEqual([
      "academic_session.created",
      "class.created",
      "subject.created",
      "staff.created",
    ]);
  });

  it("reads, updates and closes each non-student core record without deletion", async () => {
    const repository = new MemoryRepository();
    const service = createSimsCoreService(repository);
    const admin = actor(
      createGrant("sims", [
        "academic_session:read:school",
        "academic_session:create:school",
        "academic_session:update:school",
        "class:read:school",
        "class:create:school",
        "class:update:school",
        "subject:read:school",
        "subject:create:school",
        "subject:update:school",
        "staff:read:school",
        "staff:create:school",
        "staff:update:school",
      ]),
    );
    const session = await service.createAcademicSession({
      actor: admin,
      input: {
        name: "Synthetic 2027/28",
        startDate: "2027-09-01",
        endDate: "2028-07-31",
      },
    });
    const academicClass = await service.createAcademicClass({
      actor: admin,
      input: {
        code: "JSS-2",
        name: "JSS 2",
        academicSessionId: session.id,
      },
    });
    const subject = await service.createSubject({
      actor: admin,
      input: {
        code: "SCI",
        name: "Science",
        academicSessionId: session.id,
      },
    });
    const staff = await service.createStaff({
      actor: admin,
      input: {
        staffNumber: "SF-0002",
        firstName: "Synthetic",
        lastName: "Teacher",
      },
    });

    await service.updateAcademicSession({
      actor: admin,
      id: session.id,
      input: { ...session, status: "closed" },
    });
    await service.updateAcademicClass({
      actor: admin,
      id: academicClass.id,
      input: { ...academicClass, status: "archived" },
    });
    await service.updateSubject({
      actor: admin,
      id: subject.id,
      input: { ...subject, status: "inactive" },
    });
    await service.updateStaff({
      actor: admin,
      id: staff.id,
      input: { ...staff, status: "archived" },
    });

    expect((await service.getAcademicSession(admin, session.id))?.status).toBe(
      "closed",
    );
    expect(
      (await service.getAcademicClass(admin, academicClass.id))?.status,
    ).toBe("archived");
    expect((await service.getSubject(admin, subject.id))?.status).toBe(
      "inactive",
    );
    expect((await service.getStaff(admin, staff.id))?.status).toBe("archived");
    expect(repository.audits.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        "academic_session.updated",
        "class.updated",
        "subject.updated",
        "staff.updated",
      ]),
    );
  });

  it("supports existing operational-staff student updates only inside assignment scope", async () => {
    const repository = new MemoryRepository();
    const service = createSimsCoreService(repository);
    const now = new Date();
    repository.students.set("student-1", {
      id: "student-1",
      studentNumber: "ST-1",
      admissionNumber: "ADM-1",
      firstName: "Synthetic",
      lastName: "Scoped",
      classId: "class-1",
      admittedOn: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const operational = actor(
      createScopedGrant("sims", [
        {
          permissions: ["student:read:assigned", "student:update:assigned"],
          scopes: [{ dimension: "class", value: "class-1" }],
        },
      ]),
    );

    const visible = await service.listStudents(operational);
    const updated = await service.updateStudent({
      actor: operational,
      id: "student-1",
      input: {
        studentNumber: "ST-1",
        admissionNumber: "ADM-1",
        firstName: "Synthetic",
        lastName: "Scoped Updated",
        classId: "class-1",
        admittedOn: null,
        status: "inactive",
      },
    });
    expect(visible.map((record) => record.id)).toEqual(["student-1"]);
    expect(updated.lastName).toBe("Scoped Updated");
    expect(updated.status).toBe("inactive");
  });

  it("denies a cross-application or access-only grant", async () => {
    const repository = new MemoryRepository();
    const service = createSimsCoreService(repository);
    const accessOnly = actor(createGrant("sims", ["role:assign:approved"]));
    await expect(service.listStudents(accessOnly)).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(repository.audits).toEqual([
      expect.objectContaining({
        eventType: "authorization.denied",
        targetType: "student",
        outcome: "denied",
      }),
    ]);
  });
});
