import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";

import type { CoreResource } from "@slgs/sims-domain";

import { saveSimsCoreRecord } from "./core-functions";
import { requiresLifecycleConfirmation } from "./core-policy";

type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "date" | "textarea";
  required?: boolean;
};

export const resourceLabels: Record<CoreResource, string> = {
  students: "Students",
  staff: "Staff",
  classes: "Classes",
  subjects: "Subjects",
  "academic-sessions": "Academic sessions",
};

const fields: Record<CoreResource, readonly Field[]> = {
  students: [
    { name: "studentNumber", label: "Student number", required: true },
    { name: "admissionNumber", label: "Admission number", required: true },
    { name: "firstName", label: "First name", required: true },
    { name: "lastName", label: "Last name", required: true },
    { name: "admittedOn", label: "Admission date", type: "date" },
    { name: "classId", label: "Assigned class ID" },
  ],
  staff: [
    { name: "staffNumber", label: "Staff number", required: true },
    { name: "firstName", label: "First name", required: true },
    { name: "lastName", label: "Last name", required: true },
    { name: "email", label: "Contact email", type: "email" },
    { name: "identityUserId", label: "Linked identity ID" },
  ],
  classes: [
    { name: "code", label: "Class code", required: true },
    { name: "name", label: "Class name", required: true },
    { name: "academicSessionId", label: "Academic session ID", required: true },
  ],
  subjects: [
    { name: "code", label: "Subject code", required: true },
    { name: "name", label: "Subject name", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "academicSessionId", label: "Academic session ID", required: true },
  ],
  "academic-sessions": [
    { name: "name", label: "Session name", required: true },
    { name: "startDate", label: "Start date", type: "date", required: true },
    { name: "endDate", label: "End date", type: "date", required: true },
  ],
};

export function CoreRecordForm({
  resource,
  record,
}: {
  resource: CoreResource;
  record?: object;
}) {
  const values = (record ?? {}) as Readonly<Record<string, unknown>>;
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const statusOptions =
    resource === "academic-sessions"
      ? ["planned", "active", "closed"]
      : ["active", "inactive", "archived"];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextStatus = String(formData.get("status"));
    if (
      record &&
      requiresLifecycleConfirmation(values.status, nextStatus) &&
      !window.confirm(`Confirm lifecycle change to ${nextStatus}.`)
    ) {
      return;
    }
    const payload: Record<string, string | null> = {};
    for (const field of fields[resource]) {
      const value = String(formData.get(field.name) ?? "").trim();
      payload[field.name] = value || null;
    }
    payload.status = nextStatus;
    setPending(true);
    setMessage(null);
    try {
      await saveSimsCoreRecord({
        data: {
          resource,
          id: typeof values.id === "string" ? values.id : undefined,
          payload,
        },
      });
      setMessage(record ? "Record updated." : "Record created.");
      if (!record) form.reset();
      await router.invalidate();
    } catch {
      setMessage(
        "The operation was not accepted. Check the fields and your access.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="sims-core-form" onSubmit={submit}>
      {fields[resource].map((field) => (
        <label key={field.name}>
          {field.label}
          {field.type === "textarea" ? (
            <textarea
              name={field.name}
              defaultValue={String(values[field.name] ?? "")}
              maxLength={1_000}
            />
          ) : (
            <input
              name={field.name}
              type={field.type ?? "text"}
              required={field.required}
              defaultValue={String(values[field.name] ?? "")}
            />
          )}
        </label>
      ))}
      <label>
        Status
        <select
          name="status"
          defaultValue={String(values.status ?? statusOptions[0])}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <button disabled={pending} type="submit">
        {pending ? "Saving…" : record ? "Save changes" : "Create record"}
      </button>
      {message ? (
        <p role="status" className="sims-feedback">
          {message}
        </p>
      ) : null}
    </form>
  );
}
