import type { Membership, Pool, Tier } from "./types";

// Only new South African demo workspaces use this default. Persisted workspaces
// continue to pass their own currency; changing this is not an FX conversion.
export const DEFAULT_CURRENCY = "ZAR";

export function money(cents: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat(currency === "ZAR" ? "en-ZA" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
export function moneyParts(cents: number, currency = DEFAULT_CURRENCY) {
  const parts = new Intl.NumberFormat(currency === "ZAR" ? "en-ZA" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).formatToParts(cents / 100);
  return {
    whole: parts
      .filter((part) => part.type !== "decimal" && part.type !== "fraction")
      .map((part) => part.value)
      .join(""),
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
    fraction: parts.find((part) => part.type === "fraction")?.value ?? "",
  };
}
export function currentTier(tiers: Tier[], members: number): Tier {
  const sorted = [...tiers].sort((a, b) => a.minMembers - b.minMembers);
  return sorted.filter((tier) => members >= tier.minMembers).at(-1) ?? sorted[0];
}
export function nextTier(tiers: Tier[], members: number): Tier | undefined {
  return [...tiers]
    .sort((a, b) => a.minMembers - b.minMembers)
    .find((tier) => tier.minMembers > members);
}
export function poolMembers(poolId: string, memberships: Membership[]) {
  return memberships.filter(
    (member) => member.poolId === poolId && ["held", "released"].includes(member.status),
  );
}
export function priceFor(pool: Pool, memberships: Membership[]) {
  return currentTier(pool.tiers, poolMembers(pool.id, memberships).length).price;
}
export function supplierSettlement(total: number) {
  const fee = Math.round((total * 250) / 10000);
  return { total, fee, payout: total - fee };
}
export function rebateFor(member: Membership, finalPrice: number) {
  return Math.max(0, member.unitPrice - finalPrice) * member.quantity;
}
export function shortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
export function closingIn(date: string) {
  const hours = Math.ceil((new Date(date).getTime() - Date.now()) / 3600000);
  if (hours <= 0) return "Ready to close";
  if (hours < 24) return `${hours}h left`;
  return `${Math.ceil(hours / 24)} days left`;
}
