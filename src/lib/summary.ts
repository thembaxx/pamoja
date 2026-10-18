import { poolMembers } from "./money";
import type { Snapshot } from "./types";

export function communitySummary(data: Snapshot) {
  const open = data.pools.filter((pool) => pool.status === "Open");
  const members = data.memberships.filter(
    (member) => open.some((pool) => pool.id === member.poolId) && member.status === "held",
  );
  const people = new Set(members.map((member) => member.personId || member.id)).size;
  const escrow =
    (data.openingEscrow || 0) +
    data.memberships
      .filter((member) => member.status === "held")
      .reduce((sum, member) => sum + member.amount - member.rebate, 0) +
    data.orders
      .filter((order) => order.poolId === null && !order.external && !order.paidAt)
      .reduce((sum, order) => sum + order.total, 0);
  const pickup = data.pools.find((pool) => pool.status === "PickupOpen");
  const collecting = pickup ? poolMembers(pickup.id, data.memberships) : [];
  const collected = collecting.filter((member) => member.redeemedAt).length;
  return { open, members, people, escrow, pickup, collecting, collected };
}
