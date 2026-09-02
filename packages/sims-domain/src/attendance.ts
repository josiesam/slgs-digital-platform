import { z } from "zod";

export const attendanceOccurrenceStatusSchema = z.enum(["active", "finalized"]);
export type AttendanceOccurrenceStatus = z.infer<
  typeof attendanceOccurrenceStatusSchema
>;

export const attendanceStateSchema = z.enum([
  "present",
  "absent",
  "late",
  "excused",
]);
export type AttendanceState = z.infer<typeof attendanceStateSchema>;

export const attendanceOccurrenceInputSchema = z.object({
  academicSessionId: z.string().trim().min(1),
  classId: z.string().trim().min(1),
  attendanceDate: z.iso.date(),
});
export type AttendanceOccurrenceInput = z.infer<
  typeof attendanceOccurrenceInputSchema
>;

export const attendanceEntryInputSchema = z.object({
  studentId: z.string().trim().min(1),
  state: attendanceStateSchema,
});
export type AttendanceEntryInput = z.infer<typeof attendanceEntryInputSchema>;

export const attendanceCorrectionInputSchema = z.object({
  state: attendanceStateSchema,
  reason: z.string().trim().min(1).max(500),
});
export type AttendanceCorrectionInput = z.infer<
  typeof attendanceCorrectionInputSchema
>;

export interface AttendanceOccurrenceRecord {
  readonly id: string;
  readonly academicSessionId: string;
  readonly classId: string;
  readonly attendanceDate: string;
  readonly status: AttendanceOccurrenceStatus;
  readonly recorderUserId: string;
  readonly recorderStaffId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AttendanceEntryRecord {
  readonly id: string;
  readonly occurrenceId: string;
  readonly studentId: string;
  readonly state: AttendanceState;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AttendanceCorrectionRecord {
  readonly id: string;
  readonly entryId: string;
  readonly state: AttendanceState;
  readonly actorUserId: string;
  readonly actorStaffId: string | null;
  readonly reason: string;
  readonly createdAt: Date;
}
