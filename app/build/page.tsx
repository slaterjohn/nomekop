import { BuilderShell } from "@/components/builder-shell";

// The set-binder builder (fresh CHOOSE SET flow). Configured states live at
// /b/<token>. Always dynamic — the sets list comes from the cached TCG API.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Build a set binder",
  description:
    "Pick any Pokemon TCG set and build a printable binder layout — choose your grid, master sets with reverse holos and ball patterns, and download A4 pages.",
  alternates: { canonical: "/build" },
};

export default function BuildPage() {
  return <BuilderShell />;
}
