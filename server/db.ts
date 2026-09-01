import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertNote, InsertUser, notes, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.error("[Database] Failed to connect", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) { values.role = user.role ?? "admin"; updateSet.role = values.role; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0];
}

export async function listNotesByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.updatedAt));
}

export async function getNoteByUser(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const rows = await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.userId, userId))).limit(1);
  return rows[0];
}

export async function createNoteForUser(input: InsertNote) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.insert(notes).values(input);
  return getNoteByUser(Number(result[0].insertId), input.userId);
}

export async function updateNoteForUser(noteId: number, userId: number, input: Pick<InsertNote, "title" | "content">) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(notes).set({ ...input, updatedAt: new Date() }).where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  return getNoteByUser(noteId, userId);
}

export async function deleteNoteForUser(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  return result[0].affectedRows > 0;
}
