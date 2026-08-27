import { createHash } from "node:crypto";

import { Resend } from "resend";

import { resendEnvironmentSchema } from "@slgs/validation";

import type { AuthEmailSender } from "./server";

interface ResendSendResult {
  readonly data: { readonly id: string } | null;
  readonly error: { readonly message: string } | null;
}

interface ResendTransport {
  readonly emails: {
    send(
      message: {
        readonly from: string;
        readonly to: readonly string[];
        readonly subject: string;
        readonly html: string;
        readonly text: string;
      },
      options: { readonly idempotencyKey: string },
    ): Promise<ResendSendResult>;
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function createResendEmailSender(
  environment: Record<string, string | undefined>,
  transport?: ResendTransport,
): AuthEmailSender {
  return {
    async sendPasswordReset({ email, resetUrl }) {
      const config = resendEnvironmentSchema.parse(environment);
      const resend = transport ?? new Resend(config.RESEND_API_KEY);
      const parsedUrl = new URL(resetUrl);
      if (
        parsedUrl.protocol !== "https:" &&
        parsedUrl.hostname !== "localhost"
      ) {
        throw new Error("Password recovery URL must use HTTPS.");
      }

      const safeUrl = escapeHtml(parsedUrl.toString());
      const deliveryReference = createHash("sha256")
        .update(parsedUrl.toString())
        .digest("hex")
        .slice(0, 32);
      const { error } = await resend.emails.send(
        {
          from: `SLGS Digital Platform <${config.RESEND_FROM_EMAIL}>`,
          to: [email],
          subject: "Reset your SLGS Digital Platform password",
          text: `A password reset was requested for your SLGS Digital Platform account. Use this link within one hour: ${parsedUrl.toString()}\n\nIf you did not request this, ignore this email.`,
          html: `<p>A password reset was requested for your SLGS Digital Platform account.</p><p><a href="${safeUrl}">Reset your password</a>. This link expires in one hour.</p><p>If you did not request this, ignore this email.</p>`,
        },
        { idempotencyKey: `password-reset/${deliveryReference}` },
      );

      if (error) {
        throw new Error("Password recovery email delivery failed.");
      }
    },
  };
}
