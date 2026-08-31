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

const getActor = (grant: ReturnType<typeof createGrant> | ReturnType<typeof createScopedGrant>): SessionIdentity => ({
  userId: "actor-1",
  sessionId: "session-1",
  grants: new Map([["sims", grant]]),
});

class MockAttendanceRepository implements SimsCoreRepository {
  readonly students = new Map<string, StudentRecord>();
  readonly classes = new Map<string, AcademicClassRecord>();
  readonly sessions = new Map<string, AcademicSessionRecord>();
  readonly staff = new Map<string, StaffRecord>();
  readonly occurrences = new Map<string, AttendanceOccurrenceRecord>();
  readonly entries = new Map<string, AttendanceEntryRecord>();
  readonly corrections = new Map<string, AttendanceCorrectionRecord>();
  readonly audits: SimsCoreAuditEvent[] = [];

  async transaction<T>(
    work: (repository: SimsCoreRepository) => Promise<T>,
  ): Promise<T> {
    return work(this);
  }

  async findAcademicSession(id: string) {
    return this.sessions.get(id) ?? null;
  }
  async findAcademicClass(id: string) {
    return this.classes.get(id) ?? null;
  }
  async findSubject(id: string) {
    return null;
  }
  async findStudent(id: string) {
    return this.students.get(id) ?? null;
  }
  async findStaff(id: string) {
    return this.staff.get(id) ?? null;
  }
  async listAcademicSessions() { return []; }
  async listAcademicClasses() { return []; }
  async listSubjects() { return []; }
  async listStudents() { return []; }
  async listStaff() { return []; }

  async createAcademicSession(record: AcademicSessionRecord) {
    this.sessions.set(record.id, record);
  }
  async createAcademicClass(record: AcademicClassRecord) {
    this.classes.set(record.id, record);
  }
  async createSubject(record: SubjectRecord) {}
  async createStudent(record: StudentRecord) {
    this.students.set(record.id, record);
  }
  async createStaff(record: StaffRecord) {
    this.staff.set(record.id, record);
  }
  async saveAcademicSession(record: AcademicSessionRecord) {}
  async saveAcademicClass(record: AcademicClassRecord) {}
  async saveSubject(record: SubjectRecord) {}
  async saveStudent(record: StudentRecord) {}
  async saveStaff(record: StaffRecord) {}

  async findStaffByIdentity(identityUserId: string) {
    return [...this.staff.values()].find((s) => s.identityUserId === identityUserId) ?? null;
  }

  async findAttendanceOccurrence(id: string) {
    return this.occurrences.get(id) ?? null;
  }

  async findAttendanceOccurrenceByContext(academicSessionId: string, classId: string, date: string) {
    return (
      [...this.occurrences.values()].find(
        (o) =>
          o.academicSessionId === academicSessionId &&
          o.classId === classId &&
          o.attendanceDate === date,
      ) ?? null
    );
  }

  async findAttendanceEntry(id: string) {
    return this.entries.get(id) ?? null;
  }

  async findAttendanceEntryByStudent(occurrenceId: string, studentId: string) {
    return (
      [...this.entries.values()].find(
        (e) => e.occurrenceId === occurrenceId && e.studentId === studentId,
      ) ?? null
    );
  }

  async listAttendanceEntries(occurrenceId: string) {
    return [...this.entries.values()].filter((e) => e.occurrenceId === occurrenceId);
  }

  async listAttendanceCorrections(entryId: string) {
    return [...this.corrections.values()].filter((c) => c.entryId === entryId);
  }

  async createAttendanceOccurrence(record: AttendanceOccurrenceRecord) {
    this.occurrences.set(record.id, record);
  }

  async saveAttendanceOccurrence(record: AttendanceOccurrenceRecord) {
    this.occurrences.set(record.id, record);
  }

  async createAttendanceEntry(record: AttendanceEntryRecord) {
    this.entries.set(record.id, record);
  }

  async saveAttendanceEntry(record: AttendanceEntryRecord) {
    this.entries.set(record.id, record);
  }

  async createAttendanceCorrection(record: AttendanceCorrectionRecord) {
    this.corrections.set(record.id, record);
  }

  async listAttendanceOccurrences() {
    return [...this.occurrences.values()];
  }

  async getAttendanceHistory(studentId: string) {
    return [...this.entries.values()]
      .filter((e) => e.studentId === studentId)
      .map((entry) => ({
        entry,
        occurrence: this.occurrences.get(entry.occurrenceId)!,
      }));
  }

  async getRosterForClass(classId: string) {
    return [...this.students.values()].filter(
      (s) => s.classId === classId && s.status === "active",
    );
  }

  async appendAudit(event: SimsCoreAuditEvent) {
    this.audits.push(event);
  }
}

describe("Phase 2C Attendance Domain & Auth Service", () => {
  it("enforces attendance creation permissions and uniqueness constraints", async () => {
    const repository = new MockAttendanceRepository();
    const service = createSimsCoreService(repository);

    // Seed session and class
    await repository.createAcademicSession({
      id: "session-2026",
      name: "2026/2027",
      startDate: "2026-09-01",
      endDate: "2027-07-31",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repository.createAcademicClass({
      id: "class-1",
      academicSessionId: "session-2026",
      code: "JSS-1A",
      name: "JSS 1A",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const admin = getActor(createGrant("sims", ["attendance:create:school"]));

    // Successful creation
    const occurrence = await service.createAttendanceOccurrence({
      actor: admin,
      input: {
        academicSessionId: "session-2026",
        classId: "class-1",
        attendanceDate: "2026-09-01",
      },
    });

    expect(occurrence.status).toBe("active");
    expect(repository.occurrences.has(occurrence.id)).toBe(true);

    // Audit logged
    expect(repository.audits.some((a) => a.eventType === "attendance.occurrence_created")).toBe(true);

    // Duplicate creation rejected
    await expect(
      service.createAttendanceOccurrence({
        actor: admin,
        input: {
          academicSessionId: "session-2026",
          classId: "class-1",
          attendanceDate: "2026-09-01",
        },
      }),
    ).rejects.toThrow(/already exists/);
  });

  it("enforces roster eligibility when recording entries", async () => {
    const repository = new MockAttendanceRepository();
    const service = createSimsCoreService(repository);

    await repository.createAcademicSession({
      id: "session-2026",
      name: "2026/27",
      startDate: "2026-09-01",
      endDate: "2027-07-31",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repository.createAcademicClass({
      id: "class-1",
      academicSessionId: "session-2026",
      code: "JSS-1A",
      name: "JSS 1A",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Student on roster
    await repository.createStudent({
      id: "student-1",
      studentNumber: "ST-01",
      admissionNumber: "AD-01",
      firstName: "James",
      lastName: "Kargbo",
      status: "active",
      classId: "class-1",
      admittedOn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Student not on roster (class mismatch)
    await repository.createStudent({
      id: "student-2",
      studentNumber: "ST-02",
      admissionNumber: "AD-02",
      firstName: "Abu",
      lastName: "Kamara",
      status: "active",
      classId: "class-2",
      admittedOn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repository.createAttendanceOccurrence({
      id: "occurrence-1",
      academicSessionId: "session-2026",
      classId: "class-1",
      attendanceDate: "2026-09-01",
      status: "active",
      recorderUserId: "actor-1",
      recorderStaffId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const admin = getActor(createGrant("sims", ["attendance:create:school"]));

    // Allowed roster student
    await expect(
      service.recordAttendanceEntry({
        actor: admin,
        occurrenceId: "occurrence-1",
        entries: [{ studentId: "student-1", state: "present" }],
      }),
    ).resolves.not.toThrow();

    const recorded = [...repository.entries.values()].find((e) => e.studentId === "student-1");
    expect(recorded).toBeDefined();

    // Blocked student not in class-1
    await expect(
      service.recordAttendanceEntry({
        actor: admin,
        occurrenceId: "occurrence-1",
        entries: [{ studentId: "student-2", state: "present" }],
      }),
    ).rejects.toThrow(/not eligible/);
  });

  it("freezes attendance register after finalization but permits corrections", async () => {
    const repository = new MockAttendanceRepository();
    const service = createSimsCoreService(repository);

    await repository.createAcademicClass({
      id: "class-1",
      academicSessionId: "session-2026",
      code: "JSS-1A",
      name: "JSS 1A",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repository.createStudent({
      id: "student-1",
      studentNumber: "ST-01",
      admissionNumber: "AD-01",
      firstName: "James",
      lastName: "Kargbo",
      status: "active",
      classId: "class-1",
      admittedOn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repository.createAttendanceOccurrence({
      id: "occurrence-1",
      academicSessionId: "session-2026",
      classId: "class-1",
      attendanceDate: "2026-09-01",
      status: "active",
      recorderUserId: "actor-1",
      recorderStaffId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repository.createAttendanceEntry({
      id: "entry-1",
      occurrenceId: "occurrence-1",
      studentId: "student-1",
      state: "present",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const creatorAndCorrector = getActor(
      createGrant("sims", ["attendance:create:school", "attendance:correct:school"]),
    );

    // Finalize
    await service.finalizeAttendanceOccurrence({ actor: creatorAndCorrector, id: "occurrence-1" });
    expect(repository.occurrences.get("occurrence-1")?.status).toBe("finalized");

    // Ordinary entry marking is frozen
    await expect(
      service.recordAttendanceEntry({
        actor: creatorAndCorrector,
        occurrenceId: "occurrence-1",
        entries: [{ studentId: "student-1", state: "absent" }],
      }),
    ).rejects.toThrow(/finalized occurrence/);

    // Corrections are allowed
    const correction = await service.correctAttendanceEntry({
      actor: creatorAndCorrector,
      entryId: "entry-1",
      input: { state: "excused", reason: "Medical excuse" },
    });

    expect(correction.state).toBe("excused");
    expect(correction.reason).toBe("Medical excuse");
    expect(repository.corrections.has(correction.id)).toBe(true);

    // Original entry state remains unchanged (immutable)
    expect(repository.entries.get("entry-1")?.state).toBe("present");
  });

  it("enforces scope boundaries for operational staff", async () => {
    const repository = new MockAttendanceRepository();
    const service = createSimsCoreService(repository);

    await repository.createAcademicClass({
      id: "class-1",
      academicSessionId: "session-2026",
      code: "JSS-1A",
      name: "JSS 1A",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repository.createAcademicClass({
      id: "class-2",
      academicSessionId: "session-2026",
      code: "JSS-1B",
      name: "JSS 1B",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repository.createAttendanceOccurrence({
      id: "occurrence-1",
      academicSessionId: "session-2026",
      classId: "class-1",
      attendanceDate: "2026-09-01",
      status: "active",
      recorderUserId: "actor-1",
      recorderStaffId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Staff assigned only to class-1
    const staffActor = getActor(
      createScopedGrant("sims", [
        {
          permissions: ["attendance:create:assigned", "attendance:read:assigned"],
          scopes: [{ dimension: "class", value: "class-1" }],
        },
      ]),
    );

    // Permitted to mark class-1
    await expect(
      service.getAttendanceOccurrence(staffActor, "occurrence-1"),
    ).resolves.not.toBeNull();

    // Denied for class-2
    await repository.createAttendanceOccurrence({
      id: "occurrence-2",
      academicSessionId: "session-2026",
      classId: "class-2",
      attendanceDate: "2026-09-01",
      status: "active",
      recorderUserId: "actor-1",
      recorderStaffId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.getAttendanceOccurrence(staffActor, "occurrence-2"),
    ).rejects.toThrow(PermissionDeniedError);
  });
});
