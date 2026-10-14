import { parsePropertyQuery } from "./parser.ts";
import { searchActiveListings, countActiveListings } from "../../src/listings.ts";
import { listingCard } from "../../src/format.ts";
import { closePool } from "../../src/db.ts";

const LIMIT = 5;

const query = process.argv.slice(2).join(" ");
if (!query) {
  console.error('Usage: node search.ts "<query>"');
  process.exit(1);
}

try {
  const filters = await parsePropertyQuery(query);

  if (Object.values(filters).every((v) => v === null)) {
    console.log("No search filters found. Try something like: 3 bed condo in Irvine under 1.5M with a pool");
  } else {
    const [rows, total] = await Promise.all([
      searchActiveListings(filters, 1, LIMIT),
      countActiveListings(filters),
    ]);

    console.log(`Filters: ${JSON.stringify(filters)}`);
    if (total === 0) {
      console.log("No active listings match these filters.");
    } else {
      console.log(`Found ${total} active listing${total === 1 ? "" : "s"} (showing ${rows.length}, cheapest first):\n`);
      console.log(rows.map((row, i) => listingCard(row, i + 1)).join("\n\n"));
    }
  }
} finally {
  await closePool();
}
