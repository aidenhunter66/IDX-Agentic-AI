// Multi-turn tests: these query the real idx_exchange database, but keep
// sessions in a temp file so the real ~/.openclaw/idx-sessions.json is untouched.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "idx-sessions-"));
process.env.IDX_SESSIONS_FILE = path.join(tmpDir, "sessions.json");

const { handleTurn } = await import("../src/conversation.ts");
const { getSession } = await import("../src/session.ts");
const { closePool } = await import("../src/db.ts");

after(async () => {
  await closePool();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("handbook conversation: asks for budget, then type, then searches", async () => {
  const user = "handbook";
  assert.match(await handleTurn(user, "Find homes in Irvine"), /budget/i);
  assert.match(await handleTurn(user, "Under $1.2M"), /condo, townhome, or single family/i);

  const reply = await handleTurn(user, "Single family with at least 3 beds");
  assert.match(reply, /Found \d+ active listing/);
  assert.match(reply, /photos/);

  const session = getSession(user);
  assert.equal(session.city, "Irvine");
  assert.equal(session.maxPrice, 1200000);
  assert.equal(session.type, "SingleFamilyResidence");
  assert.equal(session.beds, 3);
  assert.ok(session.lastResults!.length > 0);
  for (const row of session.lastResults!) {
    assert.equal(row.L_City, "Irvine");
    assert.ok(row.price <= 1200000);
    assert.ok(row.beds! >= 3);
  }
});

test("a complete first message searches right away", async () => {
  const reply = await handleTurn("complete", "3 bed condo in Irvine under 1.5M");
  assert.match(reply, /Found \d+ active listing/);
});

test("missing city is asked first, and a bare city name answers it", async () => {
  assert.match(await handleTurn("nocity", "3 bed condo under 1M"), /which city/i);
  assert.match(await handleTurn("nocity", "irvine."), /Found \d+ active listing/);
  assert.equal(getSession("nocity").city, "Irvine");
  for (const row of getSession("nocity").lastResults!) assert.equal(row.L_City, "Irvine");
});

test("a bare amount answers the budget question", async () => {
  await handleTurn("bare", "homes in Irvine");
  await handleTurn("bare", "$1.2M");
  assert.equal(getSession("bare").maxPrice, 1200000);
});

test("a filter given instead of the city doesn't become the city", async () => {
  const user = "detour";
  assert.match(await handleTurn(user, "start over"), /which city/i);
  assert.match(await handleTurn(user, "condo"), /which city/i);
  assert.match(await handleTurn(user, "Tustin"), /budget/i);
  assert.match(await handleTurn(user, "900k"), /Found \d+ active listing|No active listings/);
  const session = getSession(user);
  assert.equal(session.city, "Tustin");
  assert.equal(session.type, "Condominium");
  assert.equal(session.maxPrice, 900000);
});

test("bare answers only count right after the question", async () => {
  await handleTurn("late", "condo in Irvine under 1M");
  await handleTurn("late", "Tustin");
  assert.equal(getSession("late").city, "Irvine");
});

test("each question is asked only once; 'any' skips it", async () => {
  const user = "skipper";
  assert.match(await handleTurn(user, "homes in Irvine"), /budget/i);
  assert.match(await handleTurn(user, "no limit"), /condo, townhome/i);
  assert.match(await handleTurn(user, "any"), /Found \d+ active listing/);
});

test("a follow-up refines the previous search", async () => {
  const user = "refine";
  await handleTurn(user, "condo in Irvine under 1.5M");
  const before = getSession(user).lastResults!.length;
  assert.ok(before > 0);

  await handleTurn(user, "with a pool");
  const session = getSession(user);
  assert.equal(session.city, "Irvine");
  assert.equal(session.pool, "True");
  for (const row of session.lastResults!) assert.equal(row.PoolPrivateYN, "1");
});

test("'more' shows the next page", async () => {
  const user = "pager";
  await handleTurn(user, "condo in Irvine under 2M");
  const page1 = getSession(user).lastResults!.map((r) => r.L_ListingID);
  assert.match(await handleTurn(user, "more"), /showing 6–/);
  const page2 = getSession(user).lastResults!.map((r) => r.L_ListingID);
  assert.equal(getSession(user).page, 2);
  assert.ok(page2.every((id) => !page1.includes(id)));
});

test("'start over' clears the session", async () => {
  const user = "reset";
  await handleTurn(user, "condo in Irvine under 1M");
  assert.match(await handleTurn(user, "start over"), /which city/i);
  assert.equal(getSession(user).maxPrice, undefined);
});

test("small talk after results doesn't re-run the search", async () => {
  const user = "chatty";
  await handleTurn(user, "condo in Irvine under 1M");
  assert.match(await handleTurn(user, "thanks"), /Current search/);
});

test("users don't share sessions", async () => {
  await handleTurn("alice", "condo in Irvine under 1M");
  await handleTurn("bob", "townhome in Tustin under 900k");
  assert.equal(getSession("alice").city, "Irvine");
  assert.equal(getSession("bob").city, "Tustin");
});
