import { parsePropertyQuery, type PropertyFilters } from "../skills/property-search/parser.ts";
import { searchActiveListings, countActiveListings } from "./listings.ts";
import { listingCard } from "./format.ts";
import { getSession, updateSession, clearSession, type UserSession } from "./session.ts";

const PAGE_SIZE = 5;

const RESET = /\b(start over|new search|reset|clear( my)? search)\b/i;
const MORE = /^\s*(show )?(more|next( page| 5)?)\s*[.!]?\s*$/i;

// Follow-up questions, asked in order, each at most once. A reply that
// doesn't answer one (e.g. "any") just moves on to the next.
const QUESTIONS: { field: keyof PropertyFilters; text: string }[] = [
  { field: "city", text: "Which city are you looking in?" },
  { field: "maxPrice", text: "What is your budget? (e.g. under 1.2M, or \"no limit\")" },
  { field: "type", text: "Any preference — condo, townhome, or single family? (or say \"any\")" },
];

const SKIP = /^\s*(any|anything|no preference|no limit|doesn'?t matter|none|skip|whatever)\b/i;

// The parser needs context words ("in Irvine", "under 1.2M"), but a reply to
// a question is often bare ("Irvine", "1.2M"). Read it against that question.
export function parsePendingAnswer(field: string | undefined, message: string): { city?: string; maxPrice?: number } {
  const text = message.trim().replace(/[.!?]+$/, "");
  if (!field || SKIP.test(text)) return {};
  if (field === "city" && /^[A-Za-z][A-Za-z\s]{1,30}$/.test(text)) {
    return { city: text.replace(/\b[a-z]/g, (c) => c.toUpperCase()) };
  }
  if (field === "maxPrice") {
    const m = text.match(/^\$?([\d,.]+)\s*(k|m|mil|million)?$/i);
    if (m) {
      const unit = m[2]?.toLowerCase();
      const scale = unit === "k" ? 1000 : unit ? 1_000_000 : 1;
      return { maxPrice: Number(m[1].replace(/,/g, "")) * scale };
    }
  }
  return {};
}

export function toFilters(session: UserSession): PropertyFilters {
  return {
    city: session.city ?? null,
    maxPrice: session.maxPrice ?? null,
    beds: session.beds ?? null,
    baths: session.baths ?? null,
    sqft: session.sqft ?? null,
    type: session.type ?? null,
    pool: session.pool ?? null,
    hasView: session.hasView ?? null,
  };
}

export function nextQuestion(session: UserSession) {
  return QUESTIONS.find((q) => session[q.field] == null && !session.asked.includes(q.field)) ?? null;
}

// Plain-English summary of the active filters, e.g. "Irvine · under $1,200,000 · 3+ bd".
export function describeFilters(f: PropertyFilters) {
  return [
    f.city,
    f.maxPrice ? `under $${f.maxPrice.toLocaleString("en-US")}` : null,
    f.beds ? `${f.beds}+ bd` : null,
    f.baths ? `${f.baths}+ ba` : null,
    f.sqft ? `${f.sqft.toLocaleString("en-US")}+ sqft` : null,
    f.type?.replace(/([a-z])([A-Z])/g, "$1 $2"),
    f.pool ? "pool" : null,
    f.hasView ? "view" : null,
  ].filter(Boolean).join(" · ") || "no filters";
}

async function showResults(userId: string, session: UserSession, page: number) {
  const filters = toFilters(session);
  const [rows, total] = await Promise.all([
    searchActiveListings(filters, page, PAGE_SIZE),
    countActiveListings(filters),
  ]);

  const header = `Searching: ${describeFilters(filters)}`;
  if (total === 0) {
    updateSession(userId, { ...session, page: 1, lastResults: [] });
    return `${header}\nNo active listings match. Try loosening one filter, or say "start over".`;
  }
  if (rows.length === 0) {
    return `${header}\nThat's all ${total} listings. Add a filter to refine, or say "start over".`;
  }

  updateSession(userId, { ...session, page, lastResults: rows });
  const from = (page - 1) * PAGE_SIZE + 1;
  const hasMore = from + rows.length - 1 < total;
  return [
    header,
    `Found ${total} active listing${total === 1 ? "" : "s"} (showing ${from}–${from + rows.length - 1}, cheapest first):\n`,
    rows.map((row, i) => listingCard(row, from + i)).join("\n\n"),
    `\n${hasMore ? `Reply "more" for the next ${PAGE_SIZE}, add` : "Add"} a filter to refine (e.g. "with a pool"), or say "start over".`,
  ].join("\n");
}

// Handles one user message and returns the reply to send back.
export async function handleTurn(userId: string, message: string): Promise<string> {
  if (RESET.test(message)) clearSession(userId);
  let session = getSession(userId);

  if (MORE.test(message) && session.lastResults?.length) {
    return showResults(userId, session, session.page + 1);
  }

  const parsed = Object.fromEntries(Object.entries(await parsePropertyQuery(message)).filter(([, v]) => v !== null));
  // A bare reply ("Irvine", "1.2M") only counts if the message had no other filters ("condo").
  const updates = Object.keys(parsed).length ? parsed : parsePendingAnswer(session.pending, message);
  let asked = session.asked;
  // The question wasn't answered or skipped: allow it to be asked again.
  if (session.pending && !(session.pending in updates) && !SKIP.test(message)) {
    asked = asked.filter((f) => f !== session.pending);
  }
  session = { ...session, ...updates, asked, pending: undefined, conversationStep: session.conversationStep + 1 };

  const question = nextQuestion(session);
  if (question) {
    updateSession(userId, { ...session, asked: [...session.asked, question.field], pending: question.field });
    return question.text;
  }

  // Nothing new (e.g. "thanks") after results were already shown: don't re-run the search.
  if (Object.keys(updates).length === 0 && session.lastResults) {
    updateSession(userId, session);
    return `Current search: ${describeFilters(toFilters(session))}\nReply "more", add a filter to refine, or say "start over".`;
  }

  return showResults(userId, session, 1);
}
