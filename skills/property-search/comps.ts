import { getSoldComps } from "../../src/listings.ts";
import { soldCard } from "../../src/format.ts";
import { closePool } from "../../src/db.ts";

const LIMIT = 5;

const [city, monthsArg] = process.argv.slice(2);
if (!city) {
  console.error('Usage: node comps.ts "<city>" [months]');
  process.exit(1);
}
const months = Number(monthsArg ?? 12);

try {
  const rows = await getSoldComps(city, months);
  if (rows.length === 0) {
    console.log(`No residential sales found in ${city} in the last ${months} months.`);
  } else {
    const median = [...rows].map((r) => r.ClosePrice).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
    console.log(`${rows.length} recent sales in ${city} (last ${months} months, max 50). Median sale: $${Math.round(median).toLocaleString("en-US")}`);
    console.log(`Most recent ${Math.min(LIMIT, rows.length)}:\n`);
    console.log(rows.slice(0, LIMIT).map((row, i) => soldCard(row, i + 1)).join("\n\n"));
  }
} finally {
  await closePool();
}
