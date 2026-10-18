import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createSeed } from "./seed";
import { DomainError } from "./domain";
import type { AppState, Snapshot } from "./types";

export class PamojaStore {
  private db: DatabaseSync;
  private secret: string;
  constructor(path: string, configuredSecret?: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, state TEXT NOT NULL, updated_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS invites (token TEXT PRIMARY KEY, session_id TEXT NOT NULL, pool_id TEXT NOT NULL, expires_at INTEGER NOT NULL);",
    );
    const stored = this.db.prepare("SELECT value FROM metadata WHERE key = 'qr_secret'").get() as
      | { value: string }
      | undefined;
    if (configuredSecret && configuredSecret.length < 32)
      throw new Error("PAMOJA_QR_SECRET must contain at least 32 characters.");
    this.secret = configuredSecret || stored?.value || randomBytes(48).toString("hex");
    this.db
      .prepare("INSERT OR IGNORE INTO metadata (key,value) VALUES ('qr_secret',?)")
      .run(this.secret);
    if (!configuredSecret) {
      this.secret = (
        this.db.prepare("SELECT value FROM metadata WHERE key = 'qr_secret'").get() as {
          value: string;
        }
      ).value;
    }
  }
  create() {
    const id = randomUUID();
    this.db.prepare("DELETE FROM sessions WHERE updated_at < ?").run(Date.now() - 30 * 86400000);
    this.db
      .prepare("INSERT INTO sessions (id,state,updated_at) VALUES (?,?,?)")
      .run(id, JSON.stringify(createSeed()), Date.now());
    return id;
  }
  read(id: string): AppState {
    const row = this.db
      .prepare("SELECT state FROM sessions WHERE id = ? AND updated_at > ?")
      .get(id, Date.now() - 30 * 86400000) as { state: string } | undefined;
    if (!row)
      throw new DomainError("Your demo session has expired. Reload to start a new workspace.", 401);
    return JSON.parse(row.state) as AppState;
  }
  snapshot(id: string): Snapshot {
    const { requests: _requests, ...snapshot } = this.read(id);
    return { ...snapshot, asOf: Date.now() };
  }
  invite(sessionId: string, poolId: string) {
    this.db.prepare("DELETE FROM invites WHERE expires_at < ?").run(Date.now());
    const existing = this.db
      .prepare("SELECT token FROM invites WHERE session_id = ? AND pool_id = ? AND expires_at > ?")
      .get(sessionId, poolId, Date.now() + 86400000) as { token: string } | undefined;
    if (existing) return existing.token;
    const token = randomBytes(24).toString("base64url");
    this.db
      .prepare("INSERT INTO invites (token,session_id,pool_id,expires_at) VALUES (?,?,?,?)")
      .run(token, sessionId, poolId, Date.now() + 7 * 86400000);
    return token;
  }
  resolveInvite(token: string) {
    const row = this.db
      .prepare("SELECT session_id FROM invites WHERE token = ? AND expires_at > ?")
      .get(token, Date.now()) as { session_id: string } | undefined;
    if (!row)
      throw new DomainError(
        "This invite has expired or is not valid. Ask your leader for a new link.",
        410,
      );
    this.read(row.session_id);
    return row.session_id;
  }
  update<T>(id: string, action: (state: AppState) => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const state = this.read(id);
      const result = action(state);
      this.db
        .prepare("UPDATE sessions SET state = ?,updated_at = ? WHERE id = ?")
        .run(JSON.stringify(state), Date.now(), id);
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  sign(sessionId: string, id: string, kind: "pickup" | "delivery", now = Date.now()) {
    const body = Buffer.from(
      JSON.stringify({ sid: sessionId, id, kind, exp: now + 30 * 60000 }),
    ).toString("base64url");
    return `${body}.${createHmac("sha256", this.secret).update(body).digest("base64url")}`;
  }
  verify(sessionId: string, token: string, kind: "pickup" | "delivery", now = Date.now()): string {
    const parts = token.split(".");
    if (parts.length !== 2) throw new DomainError("This QR pass is not valid.");
    const [body, signature] = parts;
    const expected = createHmac("sha256", this.secret).update(body).digest();
    const given = Buffer.from(signature, "base64url");
    if (expected.length !== given.length || !timingSafeEqual(expected, given))
      throw new DomainError("This QR pass could not be verified.");
    let payload: { sid?: string; id?: string; kind?: string; exp?: number };
    try {
      payload = JSON.parse(Buffer.from(body, "base64url").toString());
    } catch {
      throw new DomainError("This QR pass is not valid.");
    }
    if (
      payload.sid !== sessionId ||
      payload.kind !== kind ||
      typeof payload.id !== "string" ||
      typeof payload.exp !== "number"
    )
      throw new DomainError("This pass belongs to a different workspace or handoff.");
    if (payload.exp <= now)
      throw new DomainError("This pass has expired. Refresh the QR and try again.", 410);
    return payload.id;
  }
  close() {
    this.db.close();
  }
}

const shared = globalThis as typeof globalThis & { pamojaStore?: PamojaStore };
export function getStore() {
  if (!shared.pamojaStore) {
    const directory = process.env.PAMOJA_DATA_DIR || join(process.cwd(), ".data");
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    shared.pamojaStore = new PamojaStore(
      join(directory, "pamoja.sqlite"),
      process.env.PAMOJA_QR_SECRET,
    );
  }
  return shared.pamojaStore;
}
