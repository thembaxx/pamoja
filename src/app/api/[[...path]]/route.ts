import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addActivity,
  cancelPool,
  closePool,
  confirmOrder,
  createPool,
  deliverOrder,
  DomainError,
  getOrder,
  getPool,
  idempotent,
  joinPool,
  loadOrder,
  payMembership,
  previewPickup,
  redeemPickup,
  placeOrder,
} from "@/lib/domain";
import { getStore } from "@/lib/store";
import type { AppState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "pamoja_demo";
const tokenSchema = z.object({ token: z.string().min(10).max(2000) });
const poolSchema = z.object({
  name: z.string().trim().min(2).max(80),
  unit: z.string().trim().min(2).max(40),
  category: z.enum(["maize", "oil", "rice", "soap"]),
  supplier: z.string().trim().min(2).max(100),
  description: z.string().max(500),
  closesAt: z.iso.datetime(),
  pickupAt: z.iso.datetime(),
  tiers: z
    .array(
      z.object({
        minMembers: z.number().int().min(1).max(10000),
        price: z.number().int().min(1).max(10000000),
      }),
    )
    .min(1)
    .max(5),
});
const respond = (data: unknown, status = 200) =>
  NextResponse.json({ data }, { status, headers: { "Cache-Control": "private, no-store" } });
function failure(error: unknown) {
  if (error instanceof DomainError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Please check the form details." },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: "Send valid JSON." }, { status: 400 });
  console.error("Pamoja API error", error);
  return NextResponse.json({ error: "We couldn't save that. Please try again." }, { status: 500 });
}
function session(request: NextRequest) {
  const id = request.cookies.get(COOKIE)?.value;
  if (!id || !z.uuid().safeParse(id).success)
    throw new DomainError("Start a demo workspace first.", 401);
  getStore().read(id);
  return id;
}
type Context = { params: Promise<{ path?: string[] }> };
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { path = [] } = await params;
    const id = session(request);
    const store = getStore();
    const state = store.read(id);
    if (path.join("/") === "snapshot") return respond(store.snapshot(id));
    if (path[0] === "pools" && path.length === 1) return respond(state.pools);
    if (path[0] === "pools" && path.length === 2) return respond(getPool(state, path[1]));
    if (path[0] === "passes" && path.length === 2) {
      const member = state.memberships.find((item) => item.id === path[1]);
      if (!member || !["held", "released"].includes(member.status))
        throw new DomainError("A funded membership is required for a pickup pass.", 404);
      return respond({
        token: store.sign(id, member.id, "pickup"),
        expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
      });
    }
    if (path[0] === "orders" && path[2] === "pass") {
      const order = getOrder(state, path[1]);
      if (order.status !== "Loaded")
        throw new DomainError("Load the order before creating a delivery QR.", 409);
      return respond({ token: store.sign(id, order.id, "delivery") });
    }
    throw new DomainError("This endpoint could not be found.", 404);
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const origin = request.headers.get("origin");
    if (
      origin &&
      new URL(origin).host !== request.headers.get("host") &&
      new URL(origin).host !== request.nextUrl.host
    )
      throw new DomainError("This request must come from your Pamoja workspace.", 403);
    const { path = [] } = await params;
    const route = path.join("/");
    const store = getStore();
    if (route === "session") {
      const input = z
        .object({ invite: z.string().max(100).optional() })
        .parse(await request.json());
      let id = request.cookies.get(COOKIE)?.value;
      if (input.invite) id = store.resolveInvite(input.invite);
      else {
        try {
          if (!id || !z.uuid().safeParse(id).success) throw new Error();
          store.read(id);
        } catch {
          id = store.create();
        }
      }
      const response = respond(store.snapshot(id));
      response.cookies.set(COOKIE, id, {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 30 * 86400,
      });
      return response;
    }
    const id = session(request);
    const text = await request.text();
    if (text.length > 16000) throw new DomainError("This request is too large.", 413);
    const body = text ? JSON.parse(text) : {};
    const key = request.headers.get("idempotency-key");
    if (!key || !/^[a-zA-Z0-9_-]{8,100}$/.test(key))
      throw new DomainError("A valid Idempotency-Key is required.");
    const result = store.update(id, (state) =>
      idempotent(state, key, JSON.stringify({ route, body }), () =>
        mutate(state, route, path, body, id),
      ),
    );
    return respond(result);
  } catch (error) {
    return failure(error);
  }
}
function mutate(
  state: AppState,
  route: string,
  path: string[],
  body: unknown,
  sessionId: string,
): unknown {
  const store = getStore();
  if (route === "invites") {
    const { poolId } = z.object({ poolId: z.string().max(100) }).parse(body);
    const pool = getPool(state, poolId);
    if (pool.status !== "Open") throw new DomainError("Only open pools can be shared.", 409);
    return { token: store.invite(sessionId, poolId) };
  }
  if (route === "pools") return createPool(state, poolSchema.parse(body));
  if (path[0] === "pools" && path[2] === "join")
    return joinPool(
      state,
      path[1],
      z
        .object({
          name: z.string().trim().min(1).max(80),
          quantity: z.number().int().min(1).max(99),
          consent: z.boolean().default(false),
        })
        .parse(body),
    );
  if (path[0] === "pools" && path[2] === "close") return closePool(state, path[1]);
  if (path[0] === "pools" && path[2] === "cancel") return cancelPool(state, path[1]);
  if (path[0] === "payments" && path[2] === "confirm") return payMembership(state, path[1]);
  if (route === "orders")
    return placeOrder(state, z.object({ poolId: z.string().max(100) }).parse(body).poolId);
  if (path[0] === "orders" && path[2] === "confirm")
    return confirmOrder(
      state,
      path[1],
      z.object({ slot: z.string().min(1).max(100) }).parse(body).slot,
    );
  if (path[0] === "orders" && path[2] === "load") return loadOrder(state, path[1]);
  if (path[0] === "orders" && path[2] === "deliver") {
    const orderId = store.verify(sessionId, tokenSchema.parse(body).token, "delivery");
    if (orderId !== path[1]) throw new DomainError("This QR belongs to a different order.");
    return deliverOrder(state, orderId);
  }
  if (route === "pickups/verify")
    return previewPickup(state, store.verify(sessionId, tokenSchema.parse(body).token, "pickup"));
  if (route === "pickups/redeem")
    return redeemPickup(state, store.verify(sessionId, tokenSchema.parse(body).token, "pickup"));
  if (route === "settings") {
    const settings = z
      .object({
        groupName: z.string().trim().min(2).max(80),
        leaderName: z.string().trim().min(2).max(40),
      })
      .parse(body);
    Object.assign(state, settings);
    addActivity(state, "pool", "Workspace details updated", settings.groupName);
    return settings;
  }
  throw new DomainError("This endpoint could not be found.", 404);
}
