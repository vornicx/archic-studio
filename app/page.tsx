import { headers } from "next/headers";
import StudioApp from "./studio-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email") ?? "vadim@archic.es";
  const encodedName = requestHeaders.get("oai-authenticated-user-full-name");
  const encoding = requestHeaders.get("oai-authenticated-user-full-name-encoding");
  const fullName = encodedName && encoding === "percent-encoded-utf-8"
    ? decodeURIComponent(encodedName)
    : null;
  const displayName = fullName?.split(" ")[0] || email.split("@")[0] || "Vadim";

  return <StudioApp user={{ email, name: displayName }} />;
}
