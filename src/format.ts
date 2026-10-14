import type { ListingRow, SoldRow } from "./listings.ts";

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
    `MLS# ${row.L_DisplayId}`,
  ].filter(Boolean).join("\n");
}

export function soldCard(row: SoldRow, index: number) {
  return [
    `*${index}. ${row.UnparsedAddress}*`,
    `Sold ${money(row.ClosePrice)} on ${row.CloseDate} (listed ${money(row.ListPrice)})`,
    `${num(row.BedroomsTotal)} bd / ${num(row.BathroomsTotalInteger)} ba · ${row.LivingArea ? Math.round(row.LivingArea).toLocaleString("en-US") : "?"} sqft · ${num(row.DaysOnMarket)} days on market`,
  ].join("\n");
}
