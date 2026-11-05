// Integration tests: these query the real idx_exchange database and check
// getMarketStats against the same numbers computed directly in SQL.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { getMarketStats, suggestCities, median } from "../src/market.ts";
import { marketSummary } from "../src/format.ts";
import { query, closePool } from "../src/db.ts";

after(closePool);

const RECENT = `PropertyType = 'Residential'
  AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND CloseDate <= CURDATE()`;

test("median of odd, even, and empty lists", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), null);
});

test("sales count and average price match SQL", async () => {
  const stats = (await getMarketStats("San Diego"))!;
  const [row] = await query<{ n: number; avgPrice: number }>(
    `SELECT COUNT(*) AS n, AVG(ClosePrice) AS avgPrice FROM california_sold WHERE City = 'San Diego' AND ${RECENT}`
  );
  assert.equal(stats.sales, row.n);
  assert.ok(Math.abs(stats.avgPrice - row.avgPrice) < 1);
});

test("monthly trend adds up to the total and stays within the data", async () => {
  const stats = (await getMarketStats("Irvine"))!;
  assert.equal(stats.trend.reduce((sum, m) => sum + m.sales, 0), stats.sales);
  for (const m of stats.trend) assert.ok(m.month <= stats.dataThrough.slice(0, 7));
});

test("future-dated rows are excluded", async () => {
  const stats = (await getMarketStats("San Diego"))!;
  const today = new Date().toISOString().slice(0, 10);
  assert.ok(stats.dataThrough <= today);
  assert.ok(stats.trend.every((m) => !m.month.startsWith("2028") && !m.month.startsWith("2072")));
});

test("first and last months are marked partial, and the change uses full months", async () => {
  const stats = (await getMarketStats("Los Angeles"))!;
  assert.equal(stats.trend[0].partial, true);                       // data starts 2026-03-18
  assert.equal(stats.trend[stats.trend.length - 1].partial, true);  // data ends mid-September
  const full = stats.trend.filter((m) => !m.partial);
  assert.equal(stats.trendChange!.from, full[0].month);
  assert.equal(stats.trendChange!.to, full[full.length - 1].month);
});

test("sale-to-list uses the median, so typo'd list prices don't skew it", async () => {
  const stats = (await getMarketStats("Los Angeles"))!;
  assert.ok(stats.saleToListPct! > 90 && stats.saleToListPct! < 110);
});

test("type filter only counts that property type", async () => {
  const all = (await getMarketStats("Irvine"))!;
  const condos = (await getMarketStats("Irvine", "Condominium"))!;
  const [row] = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM california_sold WHERE City = 'Irvine' AND PropertySubType = 'Condominium' AND ${RECENT}`
  );
  assert.equal(condos.sales, row.n);
  assert.ok(condos.sales < all.sales);
});

test("ZIP codes work", async () => {
  const stats = (await getMarketStats("92618"))!;
  assert.ok(stats.sales > 0);
  const [row] = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM california_sold WHERE PostalCode = '92618' AND ${RECENT}`);
  assert.equal(stats.sales, row.n);
});

test("months of supply = active listings / monthly sales pace", async () => {
  const stats = (await getMarketStats("Irvine"))!;
  const [row] = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM rets_property WHERE L_Status = 'Active' AND L_City = 'Irvine'`);
  assert.equal(stats.activeListings, row.n);
  const full = stats.trend.filter((m) => !m.partial);
  const pace = full.reduce((s, m) => s + m.sales, 0) / full.length;
  assert.ok(Math.abs(stats.monthsOfSupply! - row.n / pace) < 0.01);
  assert.ok(["seller's", "balanced", "buyer's"].includes(stats.market!));
});

test("unknown city returns null and suggests close matches", async () => {
  assert.equal(await getMarketStats("Irvin"), null);
  assert.ok((await suggestCities("Irvin")).includes("Irvine"));
});

test("SQL injection in the city is treated as text", async () => {
  assert.equal(await getMarketStats("Irvine' OR '1'='1"), null);
});

test("summary includes the deliverable's metrics", async () => {
  const text = marketSummary((await getMarketStats("Pasadena"))!);
  for (const label of ["Median sale price", "Days on market", "Sale-to-list", "Monthly trend"]) {
    assert.ok(text.includes(label), `missing ${label}`);
  }
});
