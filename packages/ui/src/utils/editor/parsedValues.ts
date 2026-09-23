import type { Value } from "platejs";

export function parseEditorValue(input?: string | Value): Value {
  if (!input) {
    return [{ children: [{ text: "" }], type: "p" }];
  }
  if (Array.isArray(input)) {
    return input;
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      return [{ children: [{ text: "" }], type: "p" }];
    }
    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as Value;
        }
      } catch {
        // Fall back to plain text paragraph
      }
    }
    return [{ children: [{ text: input }], type: "p" }];
  }
  return [{ children: [{ text: "" }], type: "p" }];
}
