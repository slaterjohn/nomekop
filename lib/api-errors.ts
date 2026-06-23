import { NextResponse } from "next/server";
import { TcgError } from "@/lib/tcg/types";

const STATUS_BY_KIND: Record<TcgError["kind"], number> = {
  timeout: 504,
  http: 502,
  network: 503,
  parse: 502,
  "unknown-set": 404,
  incomplete: 502,
};

/** Maps data-layer failures to friendly JSON error responses. */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof TcgError) {
    return NextResponse.json(
      { error: friendlyMessage(err) },
      { status: STATUS_BY_KIND[err.kind] },
    );
  }
  return NextResponse.json(
    { error: "Something unexpected went wrong. Please try again." },
    { status: 500 },
  );
}

function friendlyMessage(err: TcgError): string {
  switch (err.kind) {
    case "timeout":
      return "The Pokemon TCG library is responding slowly. Please try again in a moment.";
    case "network":
      return "Could not reach the Pokemon TCG library. Check your connection and try again.";
    case "unknown-set":
      return err.message;
    default:
      return "The Pokemon TCG library returned an unexpected answer. Please try again.";
  }
}
