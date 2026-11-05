---
name: property-search
description: Use for ANY home or property search message — including short follow-ups in an ongoing search like "under 1.2M", "Irvine", "any", "with a pool", "more", "start over" — and for recent sales / sold comps in a city. Searches are multi-turn via converse.ts, which remembers the search itself. Always read this skill before searching; do not reuse older commands from earlier in the chat.
metadata: { "openclaw": { "emoji": "🏠", "requires": { "bins": ["node"] } } }
---

# Property Search

Use this skill when the user describes a home they want to find, for example
"3 bed condo in Irvine under $1.5M with a pool" or "townhome in Newport Beach with a view",
or asks what homes recently sold for in a city.

Do not use it for general real estate questions (mortgage advice, legal questions, etc.).

## Search active listings (multi-turn)

```bash
node {baseDir}/converse.ts "<the user's message, verbatim>"
```

Run this for EVERY message that is part of a home search, including short
follow-ups like "Under $1.2M", "Irvine", "any", "with a pool", "more", or "start over".
The script remembers the search between messages (city, budget, type, beds,
baths, sqft, pool, view) and decides what to do next:

- If the city, budget, or property type is missing, it prints one follow-up
  question (each asked only once). Send that question to the user as-is.
- Otherwise it searches active listings and prints up to 5 WhatsApp cards,
  cheapest first, with the total match count.
- A follow-up that adds a filter ("with a pool", "at least 3 beds",
  "under 900k") refines the previous search.
- "more" shows the next 5 results. "start over" / "new search" clears the search.

## One-shot search (no memory)

```bash
node {baseDir}/search.ts "<query>"
```

Same search without remembering anything. Only use it if the user explicitly
wants a one-off search that should not affect their current one.

## Recent sales (sold comps)

```bash
node {baseDir}/comps.ts "<City>" [months]
```

Use when the user asks about recent sales, sold prices, or comps in a city.
`months` defaults to 12. Prints the number of sales, the median sale price,
and the 5 most recent sales.

## Parse only (debugging)

```bash
node {baseDir}/parse.ts "<query>"
```

Prints just the filter JSON, without querying the database.

## Rules

- Pass the user's words to `converse.ts` exactly as written; do not rephrase, fix, or combine them with earlier messages (the script already remembers).
- To remove a filter (e.g. "actually no pool"), the user needs to say "start over" and search again; tell them so.
- Send the script's output as-is. Do not invent, add, or change listings, prices, or details.
- If the filters line shows something the user clearly didn't mean (for example a max price of 2 for "2 mil"), say so and suggest rephrasing (e.g. "under 2M").
- If there are no matches, say so and suggest loosening one filter.
