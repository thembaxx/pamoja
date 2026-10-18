import { cookies } from "next/headers";
import { Application } from "@/components/application";
import { createPreviewSnapshot } from "@/lib/seed";
import { getStore } from "@/lib/store";
import type { Snapshot } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const session = (await cookies()).get("pamoja_demo")?.value;
  let initial: Snapshot;
  try {
    if (!session) throw new Error("New demo session");
    initial = getStore().snapshot(session);
  } catch {
    initial = createPreviewSnapshot();
  }
  return <Application initial={initial} path={path} />;
}
