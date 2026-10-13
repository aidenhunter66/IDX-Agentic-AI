---
name: property-search
description: Use for ANY home or property search request (e.g. "3 bed condo in Irvine under 1.5M"). Parses the request into a structured filter object (city, price, beds, baths, sqft, property type, pool, view). Always run this first for property searches.
metadata: { "openclaw": { "emoji": "🏠", "requires": { "bins": ["node"] } } }
---

# Property Search

Use this skill when the user describes a home they want to find, for example
"3 bed condo in Irvine under $1.5M with a pool" or "townhome in Newport Beach with a view".

Do not use it for general real estate questions (market trends, mortgage advice, etc.).

Database search is not connected yet. For a property search, run this skill and
reply with the filter object; do not say you lack a database skill or ask
clarifying questions first.

## How to run

```bash
node {baseDir}/parse.ts "<the user's query, verbatim>"
```

## Output

The script prints JSON. Any filter the user didn't mention is `null`.

| Key | Meaning | Example |
|---|---|---|
| city | City name | "Irvine" |
| maxPrice | Max price in dollars | 1500000 |
| beds | Min bedrooms | 3 |
| baths | Min bathrooms | 2.5 |
| sqft | Min square feet | 1800 |
| type | Property type | "Condominium" |
| pool | Wants a pool | "True" |
| hasView | Wants a view | "True" |

## Rules

- Pass the user's words to the script exactly as written; do not rephrase or fix them.
- Reply with the JSON filter object, then one short sentence summarizing what you understood.
- Do not add filters the user didn't ask for, and do not guess values the script returned as null.
- If every value is null, tell the user you couldn't find any search filters and ask them to rephrase.
