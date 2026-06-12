import { BuilderShell } from "@/components/builder-shell";

// The sets list comes from a third-party API via our cache — always render
// dynamically so a build without network (or with a cold cache) cannot fail.
export const dynamic = "force-dynamic";

export default function Home() {
  return <BuilderShell />;
}
