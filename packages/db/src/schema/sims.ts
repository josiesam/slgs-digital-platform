import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgEnum,
  pgSchema,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./identity";

export const simsSchema = pgSchema("sims");

export const simsRecordStatus = pgEnum("sims_record_status", [
  "active",
  "inactive",
  "archived",
]);
export const simsAcademicSessionStatus = pgEnum(
  "sims_academic_session_status",
  ["planned", "active", "closed"],
);

export const academicSession = simsSchema.table(
  "academic_session",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: simsAcademicSessionStatus().notNull().default("planned"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("sims_academic_session_name_unique").on(table.name),
    check(
      "sims_academic_session_dates_valid",
      sql`${table.endDate} >= ${table.startDate}`,
    ),
    index("sims_academic_session_status_idx").on(table.status),
  ],
);

export const academicClass = simsSchema.table(
  "academic_class",
  {
    id: text().primaryKey(),
    academicSessionId: text("academic_session_id")
      .notNull()
      .references(() => academicSession.id, { onDelete: "restrict" }),
    code: text().notNull(),
    name: text().notNull(),
    status: simsRecordStatus().notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("sims_academic_class_session_code_unique").on(
      table.academicSessionId,
      table.code,
    ),
    index("sims_academic_class_session_status_idx").on(
      table.academicSessionId,
      table.status,
    ),
  ],
);

export const subject = simsSchema.table(
  "subject",
  {
    id: text().primaryKey(),
    academicSessionId: text("academic_session_id")
      .notNull()
      .references(() => academicSession.id, { onDelete: "restrict" }),
    code: text().notNull(),
    name: text().notNull(),
    description: text(),
    status: simsRecordStatus().notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("sims_subject_session_code_unique").on(
      table.academicSessionId,
      table.code,
    ),
    index("sims_subject_session_status_idx").on(
      table.academicSessionId,
      table.status,
    ),
  ],
);

export const student = simsSchema.table(
  "student",
  {
    id: text().primaryKey(),
    studentNumber: text("student_number").notNull(),
    admissionNumber: text("admission_number").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    status: simsRecordStatus().notNull().default("active"),
    admittedOn: date("admitted_on"),
    classId: text("class_id").references(() => academicClass.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("sims_student_number_unique").on(table.studentNumber),
    unique("sims_student_admission_number_unique").on(table.admissionNumber),
    index("sims_student_class_status_idx").on(table.classId, table.status),
    index("sims_student_name_idx").on(table.lastName, table.firstName),
  ],
);

export const staff = simsSchema.table(
  "staff",
  {
    id: text().primaryKey(),
    staffNumber: text("staff_number").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text(),
    identityUserId: text("identity_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    status: simsRecordStatus().notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("sims_staff_number_unique").on(table.staffNumber),
    unique("sims_staff_identity_user_unique").on(table.identityUserId),
    index("sims_staff_status_name_idx").on(
      table.status,
      table.lastName,
      table.firstName,
    ),
  ],
);

export const simsAttendanceOccurrenceStatus = pgEnum(
  "sims_attendance_occurrence_status",
  ["active", "finalized"],
);

export const simsAttendanceState = pgEnum("sims_attendance_state", [
  "present",
  "absent",
  "late",
  "excused",
]);

export const attendanceOccurrence = simsSchema.table(
  "attendance_occurrence",
  {
    id: text().primaryKey(),
    academicSessionId: text("academic_session_id")
      .notNull()
      .references(() => academicSession.id, { onDelete: "restrict" }),
    classId: text("class_id")
      .notNull()
      .references(() => academicClass.id, { onDelete: "restrict" }),
    attendanceDate: date("attendance_date").notNull(),
    status: simsAttendanceOccurrenceStatus().notNull().default("active"),
    recorderUserId: text("recorder_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    recorderStaffId: text("recorder_staff_id").references(() => staff.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("sims_attendance_occurrence_unique").on(
      table.academicSessionId,
      table.classId,
      table.attendanceDate,
    ),
    index("sims_attendance_occurrence_lookup_idx").on(
      table.classId,
      table.attendanceDate,
    ),
  ],
);

export const attendanceEntry = simsSchema.table(
  "attendance_entry",
  {
    id: text().primaryKey(),
    occurrenceId: text("occurrence_id")
      .notNull()
      .references(() => attendanceOccurrence.id, { onDelete: "restrict" }),
    studentId: text("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "restrict" }),
    state: simsAttendanceState().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("sims_attendance_entry_student_unique").on(
      table.occurrenceId,
      table.studentId,
    ),
  ],
);

export const attendanceCorrection = simsSchema.table(
  "attendance_correction",
  {
    id: text().primaryKey(),
    entryId: text("entry_id")
      .notNull()
      .references(() => attendanceEntry.id, { onDelete: "restrict" }),
    state: simsAttendanceState().notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    actorStaffId: text("actor_staff_id").references(() => staff.id, {
      onDelete: "restrict",
    }),
    reason: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("sims_attendance_correction_entry_idx").on(table.entryId)],
);
