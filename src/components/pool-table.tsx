"use client";
import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { closingIn, money, nextTier, poolMembers, priceFor, shortDate } from "@/lib/money";
import type { Pool } from "@/lib/types";
import { useApp } from "./provider";
import { Badge, EmptyState, PoolTitle, Progress } from "./ui";

export function PoolTable({ pools }: { pools: Pool[] }) {
  const { data } = useApp();
  if (!pools.length)
    return (
      <EmptyState
        title="No pools here yet"
        description="Try a different filter, or create a new pool for your community."
      />
    );
  return (
    <div className="table-scroll">
      <table className="pool-table">
        <caption className="sr-only">Community pools and progress to the next price tier</caption>
        <thead>
          <tr>
            <th>Pool / product</th>
            <th>Members & next tier</th>
            <th>
              Price now <span>→ next</span>
            </th>
            <th>Closes</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Open pool</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {pools.map((pool) => {
            const count = poolMembers(pool.id, data.memberships).length;
            const next = nextTier(pool.tiers, count);
            return (
              <tr key={pool.id}>
                <td>
                  <Link href={`/pools/${pool.id}`} className="pool-name-link">
                    <PoolTitle pool={pool} />
                  </Link>
                </td>
                <td>
                  <div className="tier-progress">
                    <div>
                      <strong>
                        {count}
                        <span> / {next?.minMembers || pool.tiers.at(-1)?.minMembers}</span>
                      </strong>
                      <small>
                        {next ? `${Math.max(0, next.minMembers - count)} to go` : "Best price"}
                      </small>
                    </div>
                    <Progress
                      value={count}
                      max={next?.minMembers || count}
                      label={`${pool.name} members toward the next tier`}
                    />
                  </div>
                </td>
                <td className="price-cell">
                  <strong>{money(priceFor(pool, data.memberships), data.currency)}</strong>
                  {next ? (
                    <span>→ {money(next.price, data.currency)}</span>
                  ) : (
                    <span>Final tier</span>
                  )}
                </td>
                <td className="closing-cell">
                  <strong>{shortDate(pool.closesAt)}</strong>
                  <small>
                    {pool.status === "Open" ? closingIn(pool.closesAt) : "Price locked"}
                  </small>
                </td>
                <td>
                  <Badge status={pool.status} />
                </td>
                <td>
                  <Link
                    href={`/pools/${pool.id}`}
                    className="row-arrow"
                    aria-label={`View ${pool.name}`}
                  >
                    <ArrowRight size={19} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
