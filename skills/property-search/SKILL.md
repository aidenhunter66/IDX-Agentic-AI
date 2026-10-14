---
name: property-search
description: Use for ANY home or property search request (e.g. "3 bed condo in Irvine under 1.5M") and for recent sales / sold comps in a city. Searches active MLS listings (rets_property) or sold homes (california_sold) and returns formatted property cards. Always run this for property searches.
metadata: { "openclaw": { "emoji": "🏠", "requires": { "bins": ["node"] } } }
---

# Property Search

Use this skill when the user describes a home they want to find, for example
"3 bed condo in Irvine under $1.5M with a pool" or "townhome in Newport Beach with a view",
or asks what homes recently sold for in a city.

Do not use it for general real estate questions (mortgage advice, legal questions, etc.).

## Search active listings

```bash
node {baseDir}/search.ts "<the user's query, verbatim>"
```

Parses the query into filters (city, max price, min beds, min baths, min sqft,
property type, pool, view), queries active listings, and prints ready-to-send
WhatsApp cards, cheapest first (up to 5), plus the total match count.

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

- Pass the user's words to `search.ts` exactly as written; do not rephrase or fix them.
- Send the script's cards as-is. Do not invent, add, or change listings, prices, or details.
- If the filters line shows something the user clearly didn't mean (for example a max price of 2 for "2 mil"), say so and suggest rephrasing (e.g. "under 2M").
- If there are no matches, say so and suggest loosening one filter.
- If the script prints "No search filters found", ask the user what they're looking for.
