import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireIdentity } from "@slgs/auth";
import {
  createSimsCoreService,
  attendanceOccurrenceInputSchema,
  attendanceEntryInputSchema,
  attendanceCorrectionInputSchema,
  coreListQuerySchema,
  type AttendanceOccurrenceRecord,
  type AttendanceEntryRecord,
  type AttendanceCorrectionRecord,
} from "@slgs/sims-domain";
import { DrizzleSimsCoreRepository } from "@slgs/sims-domain/drizzle-repository";

import { database, sessions } from "./auth.server";

const repository = new DrizzleSimsCoreRepository(database.db);
const service = createSimsCoreService(repository);

async function requestIdentity() {
  const request = new Request("http://internal.slgs/sims-attendance", {
    headers: getRequestHeaders(),
  });
  return requireIdentity(sessions, request);
}

const serializeOccurrence = (record: AttendanceOccurrenceRecord) => ({
  ...record,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const serializeEntry = (record: AttendanceEntryRecord) => ({
  ...record,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const serializeCorrection = (record: AttendanceCorrectionRecord) => ({
  ...record,
  createdAt: record.createdAt.toISOString(),
});

export const listSimsAttendanceOccurrences = createServerFn({ method: "GET" })
  .validator((input) =>
    coreListQuerySchema
      .extend({
        classId: z.string().optional(),
        academicSessionId: z.string().optional(),
        date: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    const records = await service.listAttendanceOccurrences(actor, data);
    return records.map(serializeOccurrence);
  });

export const getSimsAttendanceOccurrence = createServerFn({ method: "GET" })
  .validator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    const occurrence = await service.getAttendanceOccurrence(actor, data.id);
    if (!occurrence) return null;

    const entries = await service.listAttendanceEntries(actor, data.id);

    // For each entry, get its corrections
    const entriesWithCorrections = await Promise.all(
      entries.map(async (entry) => {
        const corrections = await service.listAttendanceCorrections(
          actor,
          entry.id,
        );
        return {
          ...serializeEntry(entry),
          corrections: corrections.map(serializeCorrection),
        };
      }),
    );

    return {
      occurrence: serializeOccurrence(occurrence),
      entries: entriesWithCorrections,
    };
  });

export const createSimsAttendanceOccurrence = createServerFn({ method: "POST" })
  .validator((input) => attendanceOccurrenceInputSchema.parse(input))
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    const record = await service.createAttendanceOccurrence({
      actor,
      input: data,
    });
    return serializeOccurrence(record);
  });

export const recordSimsAttendanceEntries = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        occurrenceId: z.string(),
        entries: z.array(attendanceEntryInputSchema),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    await service.recordAttendanceEntry({
      actor,
      occurrenceId: data.occurrenceId,
      entries: data.entries,
    });
    return { success: true };
  });

export const finalizeSimsAttendanceOccurrence = createServerFn({
  method: "POST",
})
  .validator((input) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    const record = await service.finalizeAttendanceOccurrence({
      actor,
      id: data.id,
    });
    return serializeOccurrence(record);
  });

export const correctSimsAttendanceEntry = createServerFn({ method: "POST" })
  .validator((input) =>
    z
      .object({
        entryId: z.string(),
        input: attendanceCorrectionInputSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    const record = await service.correctAttendanceEntry({
      actor,
      entryId: data.entryId,
      input: data.input,
    });
    return serializeCorrection(record);
  });

export const getSimsAttendanceHistory = createServerFn({ method: "GET" })
  .validator((input) => z.object({ studentId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    const history = await service.getAttendanceHistory(actor, data.studentId);
    return history.map(({ entry, occurrence }) => ({
      entry: serializeEntry(entry),
      occurrence: serializeOccurrence(occurrence),
    }));
  });

export const getRosterForAttendanceCreation = createServerFn({ method: "GET" })
  .validator((input) => z.object({ classId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    const roster = await service.getRosterForOccurrenceCreation(
      actor,
      data.classId,
    );
    return roster.map((student) => ({
      ...student,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
    }));
  });
