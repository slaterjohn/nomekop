import { z } from "zod";

/** The kinds of inaccuracy a visitor can report — drives the issue dropdown and
 *  is echoed in the email so reports can be triaged at a glance. */
export const ISSUE_TYPES = [
  { value: "count", label: "Wrong card count" },
  { value: "missing", label: "Missing or extra cards" },
  { value: "image", label: "Wrong or missing card image" },
  { value: "variant", label: "Wrong rarity, variant or pattern" },
  { value: "price", label: "Wrong price" },
  { value: "other", label: "Something else" },
] as const;

const ISSUE_VALUES = ISSUE_TYPES.map((i) => i.value) as [string, ...string[]];

/** Human label for an issue value (falls back to the raw value). */
export function issueLabel(value: string): string {
  return ISSUE_TYPES.find((i) => i.value === value)?.label ?? value;
}

export const reportSchema = z.object({
  name: z.string().trim().min(1, "Please add your name.").max(100, "Name is too long."),
  email: z
    .string()
    .trim()
    .min(1, "Please add your email.")
    .max(200)
    .pipe(z.email("That doesn't look like a valid email.")),
  // Era is required (every report is about some era); set is optional because a
  // report can be era-wide ("lots of XY sets are off") rather than set-specific.
  era: z.string().trim().min(1, "Please choose an era.").max(100),
  set: z.string().trim().max(120).optional().default(""),
  issue: z.enum(ISSUE_VALUES, { error: "Please choose an issue type." }),
  message: z
    .string()
    .trim()
    .min(1, "Please describe the issue.")
    .max(2000, "Message is too long (2000 characters max)."),
});

export type ReportInput = z.infer<typeof reportSchema>;

export type ReportFieldErrors = Partial<Record<keyof ReportInput, string[]>>;

/** Validate raw form values. Returns the parsed report or per-field errors. */
export function parseReport(
  raw: Record<string, unknown>,
): { ok: true; data: ReportInput } | { ok: false; errors: ReportFieldErrors } {
  const result = reportSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: z.flattenError(result.error).fieldErrors };
}
