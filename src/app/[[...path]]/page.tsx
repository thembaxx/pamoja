import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Application } from "@/components/application";
import { createPreviewSnapshot } from "@/lib/seed";
import { getStore } from "@/lib/store";
import type { Snapshot } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}): Promise<Metadata> {
  const { path = [] } = await params;
  const titles: Record<string, string> = {
    pools: "Community pools",
    members: "Community members",
    payments: "Payments & rebates",
    orders: "Community orders",
    pickups: "Collection desk",
    suppliers: "Supplier directory",
    supplier: "Supplier workspace",
    settings: "Workspace settings",
    join: "Join a buying pool",
    pass: "Your pickup pass",
  };
  return {
    title: titles[path[0]] || (path.length ? "Page not found" : "Community dashboard"),
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}
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
