import type { ListingRow, SoldRow } from "./listings.ts";
import type { MarketStats } from "./market.ts";

const money = (n: number | null) => (n == null ? "?" : "$" + Math.round(n).toLocaleString("en-US"));
const num = (n: number | string | null) => (n == null || n === "" ? "?" : String(Number(n)));

// WhatsApp formatting: *bold*, plain lines, no tables or headers.
export function listingCard(row: ListingRow, index: number) {
  const features = [
    row.type,
    row.PoolPrivateYN === "1" ? "Pool" : null,
    row.ViewYN === "1" ? "View" : null,
    row.AssociationFee ? `HOA ${money(row.AssociationFee)}/mo` : null,
  ].filter(Boolean);

  return [
    `*${index}. ${row.L_Address}, ${row.L_City} ${row.L_Zip}*`,
    `${money(row.price)} · ${num(row.beds)} bd / ${num(row.baths)} ba · ${row.sqft ? row.sqft.toLocaleString("en-US") : "?"} sqft`,
    features.length ? features.join(" · ") : null,
    `MLS# ${row.L_DisplayId} · ${row.PhotoCount ?? 0} photos`,
  ].filter(Boolean).join("\n");
}

export function soldCard(row: SoldRow, index: number) {
  return [
    `*${index}. ${row.UnparsedAddress}*`,
    `Sold ${money(row.ClosePrice)} on ${row.CloseDate} (listed ${money(row.ListPrice)})`,
    `${num(row.BedroomsTotal)} bd / ${num(row.BathroomsTotalInteger)} ba · ${row.LivingArea ? Math.round(row.LivingArea).toLocaleString("en-US") : "?"} sqft · ${num(row.DaysOnMarket)} days on market`,
  ].join("\n");
}

const pct = (n: number | null, digits = 1) => (n == null ? "?" : `${n.toFixed(digits)}%`);
const shortMoney = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`);
const monthName = (m: string) =>
  new Date(`${m}-15`).toLocaleString("en-US", { month: "short", year: "numeric" });
const typeLabel = (type: string | null) => (type ? type.replace(/([a-z])([A-Z])/g, "$1 $2") + " " : "");

export function marketSummary(s: MarketStats) {
  const lines = [
    `*${s.area} ${typeLabel(s.type)}market* (${s.sales.toLocaleString("en-US")} sales, data through ${s.dataThrough})`,
    `Median sale price: ${money(s.medianPrice)} (avg ${money(s.avgPrice)})`,
    `Median price/sqft: ${money(s.medianPpsf)}`,
    `Days on market: ${num(s.medianDom)} median (avg ${s.avgDom == null ? "?" : s.avgDom.toFixed(0)})`,
    `Sale-to-list: ${pct(s.saleToListPct)} of asking (median) · ${pct(s.overAskingPct, 0)} sold over asking`,
    `Active listings: ${s.activeListings.toLocaleString("en-US")}` +
      (s.monthsOfSupply == null ? "" : ` · ~${s.monthsOfSupply.toFixed(1)} months of supply`),
    s.market ? `Market: *${s.market} market*` : null,
    s.sales < 30 ? `_Small sample (${s.sales} sales), treat with caution._` : null,
    "",
    "*Monthly trend* (median price · sales · median DOM)",
    ...s.trend.map((m) =>
      `${monthName(m.month)}${m.partial ? "*" : ""}: ${shortMoney(m.medianPrice)} · ${m.sales} · ${num(m.medianDom)}`),
  ];
  if (s.trend.some((m) => m.partial)) lines.push("_* partial month_");
  if (s.trendChange) {
    const c = s.trendChange;
    lines.push(`${monthName(c.from)} → ${monthName(c.to)}: median price ${c.pricePct >= 0 ? "+" : ""}${c.pricePct.toFixed(1)}%, DOM ${num(c.domFrom)} → ${num(c.domTo)}`);
  }
  return lines.filter((l) => l !== null).join("\n");
}

export function marketCompareLine(s: MarketStats) {
  return `*${s.area}*: ${money(s.medianPrice)} median · ${money(s.medianPpsf)}/sqft · ${num(s.medianDom)} DOM · ${pct(s.saleToListPct)} of asking · ${s.sales.toLocaleString("en-US")} sales` +
    (s.market ? ` · ${s.market}` : "");
}
