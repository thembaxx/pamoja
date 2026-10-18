"use client";

import { useState } from "react";
import type { Snapshot } from "@/lib/types";
import { AppProvider } from "./provider";
import { Dashboard } from "./dashboard";
import { MemberJoin, MemberPass } from "./member";
import { Delivery, OrderDetail, Orders, SupplierConsole } from "./orders";
import { Pickups } from "./pickups";
import { InviteDialog, NewPoolDialog } from "./pool-dialogs";
import { PoolDetail, Pools } from "./pools";
import { Shell } from "./shell";
import { ActionLink, EmptyState } from "./ui";
import { Members, Payments, Settings, Suppliers } from "./workspace-pages";

function Screens({ path }: { path: string[] }) {
  const [newPool, setNewPool] = useState(false);
  const [invite, setInvite] = useState(false);
  const [invitePool, setInvitePool] = useState<string>();
  const openInvite = (id?: string) => {
    setInvitePool(id);
    setInvite(true);
  };
  if (path[0] === "join" && path[1]) return <MemberJoin key={path[1]} id={path[1]} />;
  if (path[0] === "pass" && path[1]) return <MemberPass key={path[1]} id={path[1]} />;
  let screen;
  if (!path.length) screen = <Dashboard onNewPool={() => setNewPool(true)} onInvite={openInvite} />;
  else if (path[0] === "pools" && path[1])
    screen = <PoolDetail key={path[1]} id={path[1]} onInvite={openInvite} />;
  else if (path[0] === "pools") screen = <Pools onNewPool={() => setNewPool(true)} />;
  else if (path[0] === "members") screen = <Members onInvite={() => openInvite()} />;
  else if (path[0] === "payments") screen = <Payments />;
  else if (path[0] === "orders" && path[1]) screen = <OrderDetail key={path[1]} id={path[1]} />;
  else if (path[0] === "orders") screen = <Orders />;
  else if (path[0] === "pickups") screen = <Pickups />;
  else if (path[0] === "suppliers") screen = <Suppliers />;
  else if (path[0] === "supplier" && path[1] === "delivery" && path[2])
    screen = <Delivery key={path[2]} id={path[2]} />;
  else if (path[0] === "supplier" && path.length === 1) screen = <SupplierConsole />;
  else if (path[0] === "settings") screen = <Settings />;
  else
    screen = (
      <EmptyState
        title="A little off the beaten path."
        description="This page isn't part of your community workspace."
      >
        <ActionLink href="/">Back to your dashboard</ActionLink>
      </EmptyState>
    );
  return (
    <>
      <Shell onNewPool={() => setNewPool(true)}>{screen}</Shell>
      <NewPoolDialog open={newPool} onClose={() => setNewPool(false)} />
      <InviteDialog
        key={invitePool || "any-pool"}
        open={invite}
        onClose={() => setInvite(false)}
        initialPool={invitePool}
      />
    </>
  );
}
export function Application({ initial, path }: { initial: Snapshot; path: string[] }) {
  return (
    <AppProvider initial={initial}>
      <Screens path={path} />
    </AppProvider>
  );
}
