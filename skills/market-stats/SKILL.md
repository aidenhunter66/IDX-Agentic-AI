---
name: market-stats
description: Use for housing MARKET questions about a California city or ZIP — median/average prices, price per sqft, days on market, list-to-close / sale-to-list ratio, inventory, price trends, "is now a good time to buy in X?", "are prices rising in X?", or comparing markets between cities. Data comes from sold transactions (california_sold). Not for finding specific homes for sale (use property-search).
metadata: { "openclaw": { "emoji": "📊", "requires": { "bins": ["node"] } } }
---

# Market Stats

Answers market questions with numbers from recent sold homes.

## One city or ZIP

```bash
node {baseDir}/stats.ts "<City or 5-digit ZIP>" [--type condo|townhome|single family]
```

Prints a WhatsApp-ready summary: sales count, median and average sale price,
median price/sqft, days on market, sale-to-list ratio and % sold over asking,
active listings and months of supply, a seller's/balanced/buyer's market label,
and a monthly trend with the change between the first and last full months.

Add `--type` only if the user asked about one kind of home (e.g. "condo prices in Irvine").

## Compare cities

```bash
node {baseDir}/stats.ts --compare "<City>" "<City>" [...]
```

One line per city. Use for "is Irvine or Tustin cheaper?" style questions.

## Rules

- Send the script's numbers as-is; never invent or estimate numbers it didn't print.
- After the summary, add 1–2 sentences answering the user's actual question using
  those numbers (e.g. "Prices rose 3% from April to August and homes sell in about
  2 weeks at ~100% of asking, so it's competitive for buyers").
- For "is now a good time to buy?": describe the conditions (market label, months
  of supply, sale-to-list, trend direction). Don't give a yes/no financial
  recommendation; personal timing depends on their finances.
- The data only covers sales from March to mid-September 2026, so there is no
  year-over-year comparison. If asked for one, say so. Months marked * are partial.
- If the script says no sales were found and suggests cities, ask which one they meant.
- A "Small sample" note means few sales; mention that the numbers are less reliable.
