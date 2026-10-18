import { supplierSettlement } from "./money";
import type { AppState, Category, Membership, Order, Pool, Snapshot, Tier } from "./types";

export function createPreviewSnapshot(): Snapshot {
  const asOf = Date.now();
  const { requests: _requests, ...state } = createSeed(new Date(asOf));
  return { ...state, asOf };
}
const names = [
  "Nomsa Dlamini",
  "Sipho Khumalo",
  "Lerato Molefe",
  "Thabo Mokoena",
  "Naledi Khumalo",
  "Ayanda Dube",
  "Kabelo Ndlovu",
  "Zanele Sithole",
  "Bongani Maseko",
  "Lindiwe Zulu",
  "Sibusiso Gumede",
  "Palesa Mofokeng",
];
function dateFrom(now: Date, days: number, hour = 18) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function createSeed(now = new Date()): AppState {
  // A rolling Friday keeps the supplied October sample usable after its pictured date.
  const friday = (5 - now.getUTCDay() + 7) % 7 || 7;
  const specs: [string, string, string, Category, number, Tier[]][] = [
    [
      "maize",
      "Maize meal",
      "25kg",
      "maize",
      64,
      [
        { minMembers: 20, price: 1420 },
        { minMembers: 50, price: 1290 },
        { minMembers: 100, price: 1140 },
      ],
    ],
    [
      "oil",
      "Cooking oil",
      "5L",
      "oil",
      38,
      [
        { minMembers: 20, price: 840 },
        { minMembers: 50, price: 760 },
        { minMembers: 100, price: 710 },
      ],
    ],
    [
      "rice",
      "Long-grain rice",
      "10kg",
      "rice",
      29,
      [
        { minMembers: 20, price: 960 },
        { minMembers: 50, price: 890 },
        { minMembers: 100, price: 820 },
      ],
    ],
    [
      "soap",
      "Laundry soap",
      "2kg",
      "soap",
      17,
      [
        { minMembers: 10, price: 310 },
        { minMembers: 30, price: 280 },
        { minMembers: 60, price: 250 },
      ],
    ],
  ];
  const pools: Pool[] = specs.map(([id, name, unit, category, , tiers], index) => ({
    id,
    name,
    unit,
    category,
    tiers,
    supplier: "Wholesale partner",
    status: "Open",
    closesAt: dateFrom(now, friday + (index > 1 ? 1 : 0), index > 1 ? 12 : 18),
    pickupAt: dateFrom(now, friday + (index > 1 ? 2 : 1), 9),
    description: `Good-quality ${name.toLowerCase()}, at a better price when we buy together.`,
  }));
  let identity = 0;
  const memberships: Membership[] = specs.flatMap(([id, , , , count, tiers]) =>
    Array.from({ length: count }, (_, index) => {
      const person = identity++;
      const quantity = id === "maize" ? 2 : 1;
      const unitPrice = id === "maize" ? 1290 : tiers[0].price;
      return {
        id: `${id}-member-${index + 1}`,
        personId: `neighbour-${person >= 142 ? person - 142 : person}`,
        poolId: id,
        name: names[index % names.length],
        quantity,
        unitPrice,
        amount: unitPrice * quantity,
        status: "held",
        rebate: 0,
        redeemedAt: null,
        createdAt: new Date(now.getTime() - (count - index) * 900000).toISOString(),
        consent: true,
      };
    }),
  );
  const extraPools: Pool[] = ["Family maize", "Cooking oil refill"].map((name, index) => ({
    ...pools[index],
    id: `new-${index + 1}`,
    name,
  }));
  const readyPool: Pool = {
    ...pools[2],
    id: "rice-ready",
    name: "Long-grain rice · Friday batch",
    status: "Closed",
    closesAt: dateFrom(now, -1),
    pickupAt: dateFrom(now, friday + 1, 9),
  };
  const readyMembers: Membership[] = Array.from({ length: 52 }, (_, index) => ({
    id: `ready-member-${index + 1}`,
    poolId: readyPool.id,
    name: names[index % names.length],
    quantity: 1,
    unitPrice: 960,
    amount: 960,
    status: "held",
    rebate: 70,
    redeemedAt: null,
    createdAt: dateFrom(now, -3),
    consent: false,
  }));
  const pickupPool: Pool = {
    ...pools[0],
    id: "maize-pickup",
    closesAt: dateFrom(now, -3),
    pickupAt: dateFrom(now, friday + 1, 9),
    status: "PickupOpen",
  };
  const pickupMembers: Membership[] = Array.from({ length: 142 }, (_, index) => ({
    id: `pickup-member-${index + 1}`,
    poolId: pickupPool.id,
    name: names[index % names.length],
    quantity: index % 3 === 0 ? 2 : 1,
    unitPrice: 1290,
    amount: (index % 3 === 0 ? 2 : 1) * 1290,
    status: "released",
    rebate: 0,
    redeemedAt:
      index === 0 || (index >= 3 && index <= 106 && index !== 23)
        ? new Date(now.getTime() - index * 120000).toISOString()
        : null,
    createdAt: dateFrom(now, -5),
    consent: true,
  }));
  pickupMembers[108].pickupBundle = "pickup-1042";
  const oilPickupPool: Pool = {
    ...pools[1],
    id: "oil-pickup",
    status: "PickupOpen",
    closesAt: pickupPool.closesAt,
    pickupAt: pickupPool.pickupAt,
  };
  const oilPickup: Membership = {
    ...pickupMembers[108],
    id: "pickup-oil-1042",
    poolId: oilPickupPool.id,
    quantity: 1,
    unitPrice: 840,
    amount: 840,
  };
  const lines = [
    { name: "Maize meal", unit: "25kg", quantity: 64, unitPrice: 1290 },
    { name: "Cooking oil", unit: "5L", quantity: 38, unitPrice: 840 },
    { name: "Long-grain rice", unit: "10kg", quantity: 29, unitPrice: 960 },
    { name: "Laundry soap", unit: "2kg", quantity: 17, unitPrice: 310 },
  ];
  const main: Order = {
    id: "order-1042",
    reference: "PO-0317",
    poolId: null,
    name: "Eastside Pool",
    supplier: "Wholesale partner",
    lines,
    ...supplierSettlement(147590),
    status: "Placed",
    slot: null,
    deliverBy: dateFrom(now, friday, 10),
    paidAt: null,
    createdAt: dateFrom(now, -1),
  };
  function external(
    id: string,
    name: string,
    total: number,
    lineCount: number,
    status: Order["status"],
    day: number,
  ): Order {
    const first = Math.floor(total / lineCount);
    return {
      ...main,
      id,
      reference: `PO-${id.slice(-4)}`,
      external: true,
      name,
      status,
      slot: status === "Placed" ? null : `${dayDate(day)} · 09:00–11:00`,
      deliverBy: dateFrom(now, day, 10),
      ...supplierSettlement(total),
      lines: Array.from({ length: lineCount }, (_, i) => ({
        name: lines[i % lines.length].name,
        unit: lines[i % lines.length].unit,
        quantity: 1,
        unitPrice: i === 0 ? total - first * (lineCount - 1) : first,
      })),
    };
  }
  function dayDate(days: number) {
    return new Date(dateFrom(now, days)).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }
  const otherOrders = [
    external("order-0318", "Hillcrest Pool", 210440, 3, "Placed", friday),
    external("order-0319", "Riverside Pool", 89010, 5, "Placed", friday + 1),
    external("order-0320", "Market Lane Pool", 131000, 2, "Confirmed", friday - 1),
    ...[147590, 180000, 120000, 100000, 154370].map((total, i) =>
      external(
        `order-032${i + 1}`,
        ["Northside Pool", "Oakfield Pool", "West End Pool", "Parkside Pool", "Garden Pool"][i],
        total,
        4,
        "Loaded",
        friday,
      ),
    ),
  ];
  const held = [...memberships, ...readyMembers].reduce(
    (sum, member) => sum + member.amount - member.rebate,
    0,
  );
  const pending: Membership[] = Array.from({ length: 7 }, (_, index) => ({
    ...memberships[index],
    id: `unpaid-${index + 1}`,
    personId: `unpaid-${index + 1}`,
    status: "pending",
    name: names[index + 3],
  }));
  return {
    version: 1,
    groupName: "Eastside Pool",
    leaderName: "Themba",
    currency: "USD",
    // Imported opening balance and weekly category demand reconcile the reference dashboard.
    // Supplier orders for other communities are visible to the wholesaler, excluded from leader funds.
    openingEscrow: 482000 - held - main.total,
    weeklyDemand: { maize: 197600, oil: 130100, rice: 91600, soap: 62700 },
    pools: [...pools, ...extraPools, readyPool, pickupPool, oilPickupPool],
    memberships: [...memberships, ...pending, ...readyMembers, ...pickupMembers, oilPickup],
    orders: [main, ...otherOrders],
    requests: {},
    activity: [
      {
        id: "activity-1",
        kind: "join",
        title: "Nomsa D. +2 bags",
        description: "Maize meal 25kg",
        createdAt: now.toISOString(),
      },
      {
        id: "activity-2",
        kind: "join",
        title: "Sipho K. +1 bag",
        description: "Maize meal 25kg",
        createdAt: new Date(now.getTime() - 60000).toISOString(),
      },
      {
        id: "activity-3",
        kind: "tier",
        title: "A better price is getting closer",
        description: "Oil needs 12 more members to unlock $7.60",
        createdAt: new Date(now.getTime() - 1200000).toISOString(),
      },
    ],
  };
}
