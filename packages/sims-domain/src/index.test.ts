import { describe, expect, it } from "vitest";

import {
  academicSessionInputSchema,
  decodeCoreCursor,
  encodeCoreCursor,
  staffInputSchema,
  studentInputSchema,
} from "./index";

describe("Phase 2B core record validation", () => {
  it("keeps student records administrative and credential-free", () => {
    const student = studentInputSchema.parse({
      studentNumber: "ST-0001",
      admissionNumber: "ADM-0001",
      firstName: "Synthetic",
      lastName: "Student",
      status: "active",
      admittedOn: "2026-09-01",
      classId: null,
    });
    expect(student).not.toHaveProperty("password");
    expect(student).not.toHaveProperty("identityUserId");
  });

  it("allows an optional explicit staff-to-authentication identity link", () => {
    expect(
      staffInputSchema.parse({
        staffNumber: "SF-0001",
        firstName: "Synthetic",
        lastName: "Staff",
        email: null,
        identityUserId: "identity-1",
        status: "active",
      }).identityUserId,
    ).toBe("identity-1");
  });

  it("rejects an academic session whose end precedes its start", () => {
    expect(() =>
      academicSessionInputSchema.parse({
        name: "Synthetic 2026/27",
        startDate: "2027-07-01",
        endDate: "2026-09-01",
        status: "planned",
      }),
    ).toThrow(/end date/i);
  });

  it("round-trips a stable sort value and record ID in a list cursor", () => {
    const cursor = encodeCoreCursor("Synthetic Student", "student-1");
    expect(decodeCoreCursor(cursor)).toEqual({
      sortValue: "Synthetic Student",
      id: "student-1",
    });
  });
});
