import "server-only";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { issueLabel, type ReportInput } from "@/lib/report/schema";

/** Where reports are delivered. SES_TO overrides; defaults to the site contact. */
const REPORT_TO = process.env.SES_TO ?? "hello@nomekop.app";

/** True when every AWS SES env var the sender needs is present. When false the
 *  form degrades gracefully (it tells the visitor to email us directly) instead
 *  of throwing — so a deploy without SES configured still works. */
export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_REGION &&
      process.env.SES_FROM,
  );
}

export type SendResult =
  | { sent: true }
  | { sent: false; reason: "not-configured" | "send-failed" };

let client: SESv2Client | null = null;
function sesClient(): SESv2Client {
  // Created lazily and reused — never at import time, so a missing region can't
  // crash a build/boot where email isn't configured.
  client ??= new SESv2Client({ region: process.env.AWS_REGION });
  return client;
}

function subjectFor(report: ReportInput): string {
  const where = report.set ? `${report.era} / ${report.set}` : report.era;
  return `[NOMEKOP report] ${issueLabel(report.issue)} — ${where}`;
}

function bodyFor(report: ReportInput): string {
  return [
    `Issue:   ${issueLabel(report.issue)}`,
    `Era:     ${report.era}`,
    `Set:     ${report.set || "(not set-specific)"}`,
    "",
    `From:    ${report.name} <${report.email}>`,
    "",
    "Message:",
    report.message,
  ].join("\n");
}

/** Email a single inaccuracy report to the site inbox via AWS SES. Never throws:
 *  returns a discriminated result the caller turns into form feedback. */
export async function sendReportEmail(report: ReportInput): Promise<SendResult> {
  if (!isEmailConfigured()) return { sent: false, reason: "not-configured" };

  try {
    await sesClient().send(
      new SendEmailCommand({
        FromEmailAddress: process.env.SES_FROM,
        Destination: { ToAddresses: [REPORT_TO] },
        // Replies go straight to the reporter, not the no-reply sender.
        ReplyToAddresses: [report.email],
        Content: {
          Simple: {
            Subject: { Data: subjectFor(report), Charset: "UTF-8" },
            Body: { Text: { Data: bodyFor(report), Charset: "UTF-8" } },
          },
        },
      }),
    );
    return { sent: true };
  } catch (err) {
    console.error("[report] SES send failed:", err);
    return { sent: false, reason: "send-failed" };
  }
}
