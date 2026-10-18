export type Category = "maize" | "oil" | "rice" | "soap";
export type PoolStatus =
  | "Open"
  | "Closed"
  | "Ordered"
  | "Delivered"
  | "PickupOpen"
  | "Settled"
  | "Cancelled";
export type OrderStatus = "Placed" | "Confirmed" | "Loaded" | "Delivered";
export type Tier = { minMembers: number; price: number };
export type Pool = {
  id: string;
  name: string;
  unit: string;
  category: Category;
  supplier: string;
  closesAt: string;
  pickupAt: string;
  status: PoolStatus;
  tiers: Tier[];
  description: string;
};
export type Membership = {
  id: string;
  poolId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  status: "pending" | "held" | "released" | "refunded" | "cancelled";
  rebate: number;
  redeemedAt: string | null;
  createdAt: string;
  consent: boolean;
};
export type OrderLine = { name: string; quantity: number; unitPrice: number; unit: string };
export type Order = {
  id: string;
  reference: string;
  poolId: string | null;
  name: string;
  supplier: string;
  lines: OrderLine[];
  total: number;
  fee: number;
  payout: number;
  status: OrderStatus;
  slot: string | null;
  deliverBy: string;
  paidAt: string | null;
  createdAt: string;
};
export type Activity = {
  id: string;
  kind: "join" | "tier" | "payment" | "order" | "pickup" | "pool";
  title: string;
  description: string;
  createdAt: string;
};
export type AppState = {
  version: 1;
  groupName: string;
  leaderName: string;
  currency: string;
  pools: Pool[];
  memberships: Membership[];
  orders: Order[];
  activity: Activity[];
  requests: Record<string, { fingerprint: string; result: unknown }>;
};
export type Snapshot = Omit<AppState, "requests"> & { asOf: number };
export type PickupPreview = { membership: Membership; pool: Pool; alreadyCollected: boolean };
export type ApiResult<T> = { data: T; error?: never } | { error: string; data?: never };
