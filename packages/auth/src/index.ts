import type { Application, ApplicationGrant } from "@slgs/permissions";

export interface SessionIdentity {
  readonly userId: string;
  readonly sessionId: string;
  readonly grants: ReadonlyMap<Application, ApplicationGrant>;
}

export interface SessionReader {
  read(request: Request): Promise<SessionIdentity | null>;
}

export class AuthenticationRequiredError extends Error {
  readonly code = "AUTHENTICATION_REQUIRED";

  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export async function requireIdentity(
  sessions: SessionReader,
  request: Request,
): Promise<SessionIdentity> {
  const identity = await sessions.read(request);

  if (!identity) {
    throw new AuthenticationRequiredError();
  }

  return identity;
}

// Better Auth is intentionally configured by a server-only application adapter
// after the identity schema and production login policy are approved.
export { betterAuth } from "better-auth";
