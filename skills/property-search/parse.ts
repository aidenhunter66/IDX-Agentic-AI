import { parsePropertyQuery } from "./parser.ts";

const query = process.argv.slice(2).join(" ");
if (!query) {
  console.error('Usage: node parse.ts "<query>"');
  process.exit(1);
}
console.log(JSON.stringify(await parsePropertyQuery(query), null, 2));
