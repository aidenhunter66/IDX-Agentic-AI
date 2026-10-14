// Integration tests: these query the real idx_exchange database.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { searchActiveListings, countActiveListings, getSoldComps } from "../src/listings.ts";
import { parsePropertyQuery } from "../skills/property-search/parser.ts";
import { closePool } from "../src/db.ts";

after(closePool);

test("handbook query returns matching Irvine condos", async () => {
  const filters = await parsePropertyQuery("Show me 3-bedroom condos in Irvine under $1.5M with a pool");
  const rows = await searchActiveListings(filters);
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.equal(row.L_City, "Irvine");
    assert.equal(row.type, "Condominium");
    assert.ok(row.price <= 1500000);
    assert.ok(row.beds! >= 3);
    assert.equal(row.PoolPrivateYN, "1");
  }
});

test("pool filter matches rows (database stores '1', not 'True')", async () => {
  const filters = await parsePropertyQuery("condo in Irvine with a pool");
  assert.ok(await countActiveListings(filters) > 0);
});

test("view filter only returns listings with a view", async () => {
  const rows = await searchActiveListings(await parsePropertyQuery("townhome in Newport Beach with a view"));
  assert.ok(rows.length > 0);
  for (const row of rows) assert.equal(row.ViewYN, "1");
});

test("results are sorted cheapest first", async () => {
  const rows = await searchActiveListings(await parsePropertyQuery("condo in Irvine"));
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].price <= rows[i].price);
});

test("limit and page work", async () => {
  const filters = await parsePropertyQuery("condo in Irvine");
  const page1 = await searchActiveListings(filters, 1, 3);
  const page2 = await searchActiveListings(filters, 2, 3);
  assert.equal(page1.length, 3);
  assert.notEqual(page1[0].L_ListingID, page2[0].L_ListingID);
});

test("impossible search returns no rows", async () => {
  const rows = await searchActiveListings(await parsePropertyQuery("5 bed in Irvine under 100k"));
  assert.equal(rows.length, 0);
});

test("SQL injection in the city is treated as text", async () => {
  const filters = await parsePropertyQuery("condo");
  filters.city = "Irvine' OR '1'='1";
  assert.equal(await countActiveListings(filters), 0);
});

test("sold comps are recent, residential, and never in the future", async () => {
  const rows = await getSoldComps("Irvine", 12);
  assert.ok(rows.length > 0);
  const today = new Date().toISOString().slice(0, 10);
  for (const row of rows) {
    assert.equal(row.City, "Irvine");
    assert.equal(row.PropertyType, "Residential");
    assert.ok(row.CloseDate <= today);
  }
});
