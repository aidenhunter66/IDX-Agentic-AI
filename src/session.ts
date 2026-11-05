import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ListingRow } from "./listings.ts";

export interface UserSession {
  city?: string;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  type?: string;
  pool?: string;
  hasView?: string;
  lastResults?: ListingRow[];
  conversationStep: number;
  asked: string[];      // follow-up questions already asked, so each is asked once
  pending?: string;     // field the last reply was asking about, if any
  page: number;         // results page last shown
  updatedAt: number;
}

// Every skill call is a new `node` process, so sessions are kept in a JSON
// file instead of the handbook's in-memory Map. IDX_SESSIONS_FILE overrides
// the location (used by the tests).
const SESSIONS_FILE = process.env.IDX_SESSIONS_FILE
  ?? path.join(os.homedir(), ".openclaw", "idx-sessions.json");

// A session idle this long is treated as a new conversation.
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

function load(): Record<string, UserSession> {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(sessions: Record<string, UserSession>) {
  fs.mkdirSync(path.dirname(SESSIONS_FILE), { recursive: true });
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

const newSession = (): UserSession => ({ conversationStep: 0, asked: [], page: 1, updatedAt: Date.now() });

export function getSession(userId: string): UserSession {
  const session = load()[userId];
  if (!session || Date.now() - session.updatedAt > SESSION_TTL_MS) return newSession();
  return session;
}

export function updateSession(userId: string, updates: Partial<UserSession>) {
  const sessions = load();
  sessions[userId] = { ...getSession(userId), ...updates, updatedAt: Date.now() };
  save(sessions);
  return sessions[userId];
}

export function clearSession(userId: string) {
  const sessions = load();
  delete sessions[userId];
  save(sessions);
}
