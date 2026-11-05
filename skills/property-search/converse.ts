import { handleTurn } from "../../src/conversation.ts";
import { closePool } from "../../src/db.ts";

const args = process.argv.slice(2);
let userId = "default";
if (args[0] === "--user") {
  userId = args[1];
  args.splice(0, 2);
}

const message = args.join(" ");
if (!message || !userId) {
  console.error('Usage: node converse.ts [--user <id>] "<message>"');
  process.exit(1);
}

try {
  console.log(await handleTurn(userId, message));
} finally {
  await closePool();
}
