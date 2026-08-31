import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireIdentity } from "@slgs/auth";
import {
  academicClassInputSchema,
  academicSessionInputSchema,
  coreListQuerySchema,
  coreResourceSchema,
  createSimsCoreService,
  encodeCoreCursor,
  staffInputSchema,
  studentInputSchema,
  subjectInputSchema,
  type AcademicClassRecord,
  type AcademicSessionRecord,
  type StaffRecord,
  type StudentRecord,
  type SubjectRecord,
} from "@slgs/sims-domain";
import { DrizzleSimsCoreRepository } from "@slgs/sims-domain/drizzle-repository";

import { database, sessions } from "./auth.server";
import { coreMutationRequestSchema } from "./core-policy";

const repository = new DrizzleSimsCoreRepository(database.db);
const service = createSimsCoreService(repository);

async function requestIdentity() {
  const request = new Request("http://internal.slgs/sims-core", {
    headers: getRequestHeaders(),
  });
  return requireIdentity(sessions, request);
}

const listInputSchema = coreListQuerySchema.extend({
  resource: coreResourceSchema,
});

type CoreRecord =
  | StudentRecord
  | StaffRecord
  | AcademicClassRecord
  | SubjectRecord
  | AcademicSessionRecord;
type SerializeRecord<T> = T extends CoreRecord
  ? Omit<T, "createdAt" | "updatedAt"> & {
      createdAt: string;
      updatedAt: string;
    }
  : never;
type SerializedCoreRecord = SerializeRecord<CoreRecord>;

const serialize = (record: CoreRecord): SerializedCoreRecord => ({
  ...record,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const listSimsCoreRecords = createServerFn({ method: "GET" })
  .validator((input) => listInputSchema.parse(input))
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    const sessionStatus = ["planned", "active", "closed"] as const;
    const recordStatus = ["active", "inactive", "archived"] as const;
    if (
      data.status &&
      !(
        data.resource === "academic-sessions" ? sessionStatus : recordStatus
      ).includes(data.status as never)
    ) {
      throw new Error("The status filter is not valid for this resource.");
    }
    const query = {
      search: data.search,
      status: data.status,
      cursor: data.cursor,
      limit: data.limit,
      direction: data.direction,
    };
    const records =
      data.resource === "students"
        ? await service.listStudents(actor, query)
        : data.resource === "staff"
          ? await service.listStaff(actor, query)
          : data.resource === "classes"
            ? await service.listAcademicClasses(actor, query)
            : data.resource === "subjects"
              ? await service.listSubjects(actor, query)
              : await service.listAcademicSessions(actor, query);
    const lastRecord = records.at(-1) as CoreRecord | undefined;
    const sortValue = lastRecord
      ? "lastName" in lastRecord
        ? lastRecord.lastName
        : lastRecord.name
      : null;
    return {
      resource: data.resource,
      records: (records as readonly CoreRecord[]).map(serialize),
      nextCursor:
        records.length === data.limit && lastRecord && sortValue
          ? encodeCoreCursor(sortValue, lastRecord.id)
          : null,
    };
  });

export const getSimsCoreRecord = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({ resource: coreResourceSchema, id: z.string().min(1).max(200) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    const record =
      data.resource === "students"
        ? await service.getStudent(actor, data.id)
        : data.resource === "staff"
          ? await service.getStaff(actor, data.id)
          : data.resource === "classes"
            ? await service.getAcademicClass(actor, data.id)
            : data.resource === "subjects"
              ? await service.getSubject(actor, data.id)
              : await service.getAcademicSession(actor, data.id);
    return record ? serialize(record) : null;
  });

export const saveSimsCoreRecord = createServerFn({ method: "POST" })
  .validator((input) => coreMutationRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const actor = await requestIdentity();
    const updating = Boolean(data.id);
    if (data.resource === "students") {
      const input = studentInputSchema.parse(data.payload);
      return updating
        ? service.updateStudent({ actor, id: data.id!, input })
        : service.createStudent({ actor, input });
    }
    if (data.resource === "staff") {
      const input = staffInputSchema.parse(data.payload);
      return updating
        ? service.updateStaff({ actor, id: data.id!, input })
        : service.createStaff({ actor, input });
    }
    if (data.resource === "classes") {
      const input = academicClassInputSchema.parse(data.payload);
      return updating
        ? service.updateAcademicClass({ actor, id: data.id!, input })
        : service.createAcademicClass({ actor, input });
    }
    if (data.resource === "subjects") {
      const input = subjectInputSchema.parse(data.payload);
      return updating
        ? service.updateSubject({ actor, id: data.id!, input })
        : service.createSubject({ actor, input });
    }
    const input = academicSessionInputSchema.parse(data.payload);
    return updating
      ? service.updateAcademicSession({ actor, id: data.id!, input })
      : service.createAcademicSession({ actor, input });
  });
