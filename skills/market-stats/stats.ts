import { getMarketStats, suggestCities } from "../../src/market.ts";
import { marketSummary, marketCompareLine } from "../../src/format.ts";
import { parsePropertyQuery } from "../property-search/parser.ts";
import { closePool } from "../../src/db.ts";

const USAGE = 'Usage: node stats.ts "<City or ZIP>" [--type condo|townhome|single family] [--months N]\n' +
  '       node stats.ts --compare "<City>" "<City>" [...] [--type ...]';

const args = process.argv.slice(2);
function takeOption(name: string) {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const [, value] = args.splice(i, 2);
  return value ?? null;
}

const typeWord = takeOption("--type");
const months = Number(takeOption("--months") ?? 12);
const compare = args[0] === "--compare" ? args.splice(0, 1).length > 0 : false;

// Reuses the search parser's type words ("condo" -> "Condominium").
const type = typeWord ? (await parsePropertyQuery(typeWord)).type : null;
if (args.length === 0 || (typeWord && !type) || !(months > 0)) {
  console.error(typeWord && !type ? `Unknown --type "${typeWord}". ${USAGE}` : USAGE);
  process.exit(1);
}

async function notFound(area: string) {
  const suggestions = await suggestCities(area);
  return `No ${type ? type + " " : ""}sales found for "${area}".` +
    (suggestions.length ? ` Did you mean: ${suggestions.join(", ")}?` : "");
}

try {
  if (compare) {
    const lines = [];
    for (const area of args) {
      const stats = await getMarketStats(area, type, months);
      lines.push(stats ? marketCompareLine(stats) : await notFound(area));
    }
    console.log(lines.join("\n"));
  } else {
    const area = args.join(" ");
    const stats = await getMarketStats(area, type, months);
    console.log(stats ? marketSummary(stats) : await notFound(area));
  }
} finally {
  await closePool();
}
