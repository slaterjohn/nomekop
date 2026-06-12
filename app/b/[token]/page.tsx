import { notFound, redirect } from "next/navigation";
import { decodeShareToken } from "@/lib/share";
import { serializeConfig } from "@/lib/config";

type Props = {
  params: Promise<{ token: string }>;
};

/** Share-link landing: /b/sv8pt5~34m111ic → the builder with that config. */
export default async function ShareRedirect({ params }: Props) {
  const { token } = await params;
  const config = decodeShareToken(decodeURIComponent(token));
  if (!config) notFound();
  const qs = serializeConfig(config).toString();
  redirect(qs ? `/?${qs}` : "/");
}
