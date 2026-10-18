import { currentTier, supplierSettlement } from "./money";
import type { AppState, Category, Membership, Pool, Snapshot, Tier } from "./types";

export function createPreviewSnapshot(): Snapshot {
  const asOf = Date.now();
  const { requests: _requests, ...state } = createSeed(new Date(asOf));
  return { ...state, asOf };
}

const names = [
  "Nomsa Dlamini",
  "Thabo Mokoena",
  "Lerato Molefe",
  "Sipho Nkosi",
  "Naledi Khumalo",
  "Ayanda Dube",
  "Kabelo Ndlovu",
  "Zanele Sithole",
  "Bongani Maseko",
  "Lindiwe Zulu",
  "Sibusiso Gumede",
  "Palesa Mofokeng",
];
const daysFrom = (now: Date, days: number, hour = 16) => {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

export function createSeed(now = new Date()): AppState {
  const specs: [string, string, string, Category, number, Tier[]][] = [
    [
      "maize",
      "Maize meal",
      "10 kg bag",
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
      "Sunflower oil",
      "5 litre bottle",
      "oil",
      38,
      [
        { minMembers: 20, price: 980 },
        { minMembers: 50, price: 860 },
        { minMembers: 100, price: 790 },
      ],
    ],
    [
      "rice",
      "Long grain rice",
      "10 kg bag",
      "rice",
      27,
      [
        { minMembers: 20, price: 1250 },
        { minMembers: 50, price: 1090 },
        { minMembers: 100, price: 990 },
      ],
    ],
    [
      "soap",
      "Laundry soap",
      "6 bar pack",
      "soap",
      56,
      [
        { minMembers: 20, price: 420 },
        { minMembers: 50, price: 360 },
        { minMembers: 100, price: 310 },
      ],
    ],
  ];
  const pools: Pool[] = specs.map(([id, name, unit, category, , tiers], index) => ({
    id,
    name,
    unit,
    category,
    tiers,
    supplier: index % 2 ? "Ubuntu Wholesale" : "Market Link Wholesalers",
    closesAt: daysFrom(now, index === 0 ? 1 : index + 1),
    pickupAt: daysFrom(now, 5, 9),
    status: "Open",
    description: `Good-quality ${name.toLowerCase()}, at a better price when we buy together. Join your neighbours and help unlock the next tier.`,
  }));
  const memberships: Membership[] = specs.flatMap(([id, , , , count, tiers]) =>
    Array.from({ length: count }, (_, index) => {
      const unitPrice = currentTier(tiers, Math.max(20, index)).price;
      const quantity = index % 4 === 0 ? 2 : 1;
      return {
        id: `${id}-member-${index + 1}`,
        poolId: id,
        name: names[index % names.length],
        quantity,
        unitPrice,
        amount: quantity * unitPrice,
        status: "held" as const,
        rebate: 0,
        redeemedAt: null,
        createdAt: new Date(now.getTime() - (count - index) * 900000).toISOString(),
        consent: index % 3 === 0,
      };
    }),
  );
  const pickupPool: Pool = {
    ...pools[0],
    id: "maize-pickup",
    name: "Maize meal · October batch",
    closesAt: daysFrom(now, -3),
    pickupAt: daysFrom(now, 0, 9),
    status: "PickupOpen",
  };
  const pickupMembers = Array.from({ length: 32 }, (_, index): Membership => ({
    id: `pickup-member-${index + 1}`,
    poolId: pickupPool.id,
    name: names[index % names.length],
    quantity: index % 3 === 0 ? 2 : 1,
    unitPrice: 1420,
    amount: (index % 3 === 0 ? 2 : 1) * 1420,
    status: "released",
    rebate: 0,
    redeemedAt: index < 23 ? new Date(now.getTime() - index * 120000).toISOString() : null,
    createdAt: daysFrom(now, -5),
    consent: true,
  }));
  const readyPool: Pool = {
    ...pools[2],
    id: "rice-ready",
    name: "Long grain rice · Friday batch",
    status: "Closed",
    closesAt: daysFrom(now, -1),
    pickupAt: daysFrom(now, 4, 9),
  };
  const readyMembers = Array.from({ length: 52 }, (_, index): Membership => ({
    id: `ready-member-${index + 1}`,
    poolId: readyPool.id,
    name: names[index % names.length],
    quantity: 1,
    unitPrice: index < 50 ? 1250 : 1090,
    amount: index < 50 ? 1250 : 1090,
    status: "held",
    rebate: index < 50 ? 160 : 0,
    redeemedAt: null,
    createdAt: daysFrom(now, -3),
    consent: false,
  }));
  const lines = [
    { name: "Maize meal", quantity: 80, unitPrice: 1140, unit: "10 kg bag" },
    { name: "Sunflower oil", quantity: 40, unitPrice: 860, unit: "5 litre bottle" },
    { name: "Long grain rice", quantity: 19, unitPrice: 1090, unit: "10 kg bag" },
    { name: "Laundry soap", quantity: 8, unitPrice: 160, unit: "single bar" },
  ];
  return {
    version: 1,
    groupName: "Khayelitsha community",
    leaderName: "Themba",
    currency: "USD",
    pools: [...pools, readyPool, pickupPool],
    memberships: [...memberships, ...readyMembers, ...pickupMembers],
    requests: {},
    orders: [
      {
        id: "order-1042",
        reference: "PO-1042",
        poolId: null,
        name: "Saturday essentials",
        supplier: "Market Link Wholesalers",
        lines,
        ...supplierSettlement(
          lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0),
        ),
        status: "Placed",
        slot: null,
        deliverBy: daysFrom(now, 2, 10),
        paidAt: null,
        createdAt: daysFrom(now, -1),
      },
    ],
    activity: [
      {
        id: "activity-1",
        kind: "join",
        title: "A neighbour joined Maize meal",
        description: "2 bags closer to the next price drop",
        createdAt: new Date(now.getTime() - 120000).toISOString(),
      },
      {
        id: "activity-2",
        kind: "tier",
        title: "Laundry soap unlocked a better price",
        description: "56 members are now paying $3.60 per pack",
        createdAt: new Date(now.getTime() - 1080000).toISOString(),
      },
      {
        id: "activity-3",
        kind: "payment",
        title: "Friday rice rebates calculated",
        description: "$80.00 going back to the community",
        createdAt: new Date(now.getTime() - 2700000).toISOString(),
      },
    ],
  };
}
