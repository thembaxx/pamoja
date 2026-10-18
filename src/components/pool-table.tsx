"use client";
import Link from "next/link";
import { money, nextTier, poolMembers, priceFor } from "@/lib/money";
import type { Pool } from "@/lib/types";
import { closeLabel, productName, useDesign } from "./design";
import { useApp } from "./provider";
import { EmptyState, Progress } from "./ui";

export function PoolTable({ pools, compact = false }: { pools: Pool[]; compact?: boolean }) {
  const { data } = useApp();
  const { href } = useDesign();
  if (!pools.length)
    return (
      <EmptyState
        title="No pools here yet"
        description="Try another category, or create a pool for your community."
      />
    );
  return (
    <div className={`ref-pool-table-scroll ${compact ? "compact" : ""}`}>
      <table className="ref-pool-table">
        <caption className="sr-only">Community pools and progress to the next price tier</caption>
        <thead>
          <tr>
            <th>Pool</th>
            <th>Members</th>
            <th>Progress to next tier</th>
            <th>Price now → next</th>
            <th>Closes</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((pool) => {
            const count = poolMembers(pool.id, data.memberships).length;
            const next = nextTier(pool.tiers, count);
            return (
              <tr key={pool.id}>
                <td>
                  <Link className="ref-pool-name" href={href(`/pools/${pool.id}`)}>
                    {productName(pool)}
                  </Link>
                </td>
                <td>
                  {count} / {next?.minMembers || pool.tiers.at(-1)?.minMembers}
                </td>
                <td>
                  <Progress
                    value={count}
                    max={next?.minMembers || count || 1}
                    label={`${pool.name} members toward the next tier`}
                  />
                </td>
                <td>
                  {money(priceFor(pool, data.memberships), data.currency)}
                  {next ? ` → ${money(next.price, data.currency)}` : ""}
                </td>
                <td>{closeLabel(pool.closesAt)}</td>
                <td>
                  <span className={pool.status === "Open" ? "ref-green" : "ref-muted"}>
                    {pool.status === "PickupOpen" ? "Pickup open" : pool.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
