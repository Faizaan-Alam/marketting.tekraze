import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { Enquiry } from "@/lib/enquiry-schema";
import { headerSafe, maskEmail } from "@/lib/sanitize";
import type { ServerEnv } from "./env";

/**
 * Delivers an enquiry as a plain-text email through nodemailer (a vetted mail library that also
 * encodes headers). User input only ever appears in the text body and, after CRLF stripping, in
 * the Subject and Reply-To headers. No HTML email is generated, so there is nothing to inject.
 */

let transporter: Transporter | null = null;

export function isMailConfigured(env: ServerEnv): boolean {
  return Boolean(env.SMTP_HOST && env.MAIL_FROM && env.MAIL_TO);
}

function getTransporter(env: ServerEnv): Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: !env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

export function buildEnquiryEmail(enquiry: Enquiry): {
  subject: string;
  text: string;
  replyTo: string;
} {
  const name = headerSafe(`${enquiry.firstName} ${enquiry.lastName}`, 130);
  return {
    subject: headerSafe(`New enquiry: ${enquiry.service} — ${name}`, 200),
    replyTo: headerSafe(enquiry.email, 254),
    text: [
      "New enquiry from services.tekraze.com",
      "",
      `Name:    ${enquiry.firstName} ${enquiry.lastName}`,
      `Email:   ${enquiry.email}`,
      `Service: ${enquiry.service}`,
      "",
      "Message:",
      enquiry.message,
      "",
      "— Sent by the enquiry form. Reply to this email to answer the sender.",
    ].join("\n"),
  };
}

export async function deliverEnquiry(env: ServerEnv, enquiry: Enquiry): Promise<void> {
  if (env.ENQUIRY_DELIVERY === "log") {
    console.info(
      JSON.stringify({
        ts: new Date().toISOString(),
        scope: "enquiry",
        delivery: "log",
        service: enquiry.service,
        from: maskEmail(enquiry.email),
        messageLength: enquiry.message.length,
      }),
    );
    return;
  }
  const mail = buildEnquiryEmail(enquiry);
  await getTransporter(env).sendMail({
    from: env.MAIL_FROM,
    to: env.MAIL_TO,
    replyTo: mail.replyTo,
    subject: mail.subject,
    text: mail.text,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
