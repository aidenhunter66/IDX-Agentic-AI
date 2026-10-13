import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePropertyQuery } from "../skills/property-search/parser.ts";

test("handbook example", async () => {
  const result = await parsePropertyQuery(
    "Show me 3-bedroom condos in Irvine under $1.5M with a pool"
  );
  assert.deepEqual(result, {
    city: "Irvine", maxPrice: 1500000, beds: 3, baths: null,
    sqft: null, type: "Condominium", pool: "True", hasView: null,
  });
});

test("price written as '2 mil'", async () => {
  const result = await parsePropertyQuery("2 bed condo in Los Angeles under 2 mil");
  assert.equal(result.maxPrice, 2000000);   // known limitation: parser returns 2 (space before "mil")
});

test("baths with a decimal (2.5 bath)", async () => {
  const result = await parsePropertyQuery("2 bed 2.5 bath condo in San Jose");
  assert.equal(result.baths, 2.5);
});

test("number of beds", async () => {
  const result = await parsePropertyQuery("10 bathroom 20 bedroom in Hong kong under 500M");
  assert.equal(result.beds, 20);
});

test("Has a view", async () => {
  const result = await parsePropertyQuery("1 bed 1 bath townhome in long beach with a view");
  assert.equal(result.hasView, "True");
});

test("'apartment' is not a recognized type", async () => {
  const result = await parsePropertyQuery("1 bed apartment in Long Beach");
  assert.equal(result.type, null);   // known limitation: only condo/townhome/single family/land
});

test("price written as '3M'", async () => {
  const result = await parsePropertyQuery("2 bed 1 bath single family under 3M");
  assert.equal(result.maxPrice, 3000000);
});

test("type test --> land", async () => {
  const result = await parsePropertyQuery("1000 sqft land in Ventura under 50M");
  assert.equal(result.type, "UnimprovedLand");
});

test("how many square feet", async () => {
  const result = await parsePropertyQuery("2 bed 1 bath in san Jose with 800 sqft");
  assert.equal(result.sqft, 800);
});

test("no pool mentioned -> null", async () => {
  const result = await parsePropertyQuery("6 bedroom 4 bath in Hollywood under 100M");
  assert.equal(result.pool, null);
});
