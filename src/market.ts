import { query } from "./db.ts";

// One sale used for market stats.
type SaleRow = {
  CloseDate: string;
  ClosePrice: number;
  ListPrice: number | null;
  LivingArea: number | null;
  DaysOnMarket: number | null;
};

export type MonthStats = {
  month: string;          // "2026-04"
  sales: number;
  medianPrice: number;
  medianPpsf: number | null;
  medianDom: number | null;
  partial: boolean;       // month only partly covered by the data
};

export type MarketStats = {
  area: string;
  type: string | null;
  months: number;
  sales: number;
  dataThrough: string;    // last real CloseDate in the table
  medianPrice: number;
  avgPrice: number;
  medianPpsf: number | null;
  medianDom: number | null;
  avgDom: number | null;
  saleToListPct: number | null;   // median ClosePrice / ListPrice
  overAskingPct: number | null;   // share of sales that closed above list
  activeListings: number;
  monthsOfSupply: number | null;
  market: "seller's" | "balanced" | "buyer's" | null;
  trend: MonthStats[];
  trendChange: { from: string; to: string; pricePct: number; domFrom: number | null; domTo: number | null } | null;
};

export function median(values: number[]) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

// A 5-digit area is a ZIP code, anything else a city.
const isZip = (area: string) => /^\d{5}$/.test(area.trim());

// The table only covers part of 2026, and a few rows have impossible future
// close dates, so the real coverage is looked up instead of assumed.
async function dataRange() {
  const [row] = await query<{ first: string; last: string }>(
    `SELECT MIN(CloseDate) AS first, MAX(CloseDate) AS last FROM california_sold WHERE CloseDate <= CURDATE()`
  );
  return row;
}

function isPartialMonth(month: string, first: string, last: string) {
  if (month === first.slice(0, 7) && !first.endsWith("-01")) return true;
  if (month === last.slice(0, 7)) {
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return Number(last.slice(8, 10)) < lastDay;
  }
  return false;
}

// Months of supply: how long current inventory would last at the recent sales pace.
// Under 3 is a seller's market, over 6 a buyer's market.
function marketType(monthsOfSupply: number | null, saleToListPct: number | null) {
  if (monthsOfSupply == null) return null;
  if (monthsOfSupply < 3 || (monthsOfSupply < 4 && (saleToListPct ?? 0) >= 100)) return "seller's";
  if (monthsOfSupply > 6) return "buyer's";
  return "balanced";
}

export async function getMarketStats(area: string, type: string | null = null, months = 12): Promise<MarketStats | null> {
  area = area.trim();
  const { first, last } = await dataRange();

  let where = `WHERE ${isZip(area) ? "PostalCode" : "City"} = ?
    AND PropertyType = 'Residential'
    AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    AND CloseDate <= CURDATE()`;
  const params: any[] = [area, months];
  if (type) { where += " AND PropertySubType = ?"; params.push(type); }

  // Aggregated in code: MySQL has no MEDIAN, and medians keep the handful of
  // typo'd prices (e.g. close price 200,000x list) from skewing the numbers.
  const rows = await query<SaleRow>(
    `SELECT CloseDate, ClosePrice, ListPrice, LivingArea, DaysOnMarket FROM california_sold ${where}`,
    params
  );
  if (rows.length === 0) return null;

  const ppsf = (r: SaleRow) => (r.LivingArea ? r.ClosePrice / r.LivingArea : null);
  const ratios = rows.filter((r) => r.ListPrice).map((r) => r.ClosePrice / r.ListPrice!);

  const byMonth = new Map<string, SaleRow[]>();
  for (const r of rows) {
    const m = r.CloseDate.slice(0, 7);
    byMonth.set(m, [...(byMonth.get(m) ?? []), r]);
  }
  const trend: MonthStats[] = [...byMonth.keys()].sort().map((month) => {
    const sales = byMonth.get(month)!;
    return {
      month,
      sales: sales.length,
      medianPrice: median(sales.map((r) => r.ClosePrice))!,
      medianPpsf: median(sales.map(ppsf).filter((v): v is number => v != null)),
      medianDom: median(sales.map((r) => r.DaysOnMarket).filter((v): v is number => v != null)),
      partial: isPartialMonth(month, first, last),
    };
  });

  // Trend change compares the first and last full months only.
  const full = trend.filter((m) => !m.partial);
  const trendChange = full.length >= 2 ? {
    from: full[0].month,
    to: full[full.length - 1].month,
    pricePct: (full[full.length - 1].medianPrice / full[0].medianPrice - 1) * 100,
    domFrom: full[0].medianDom,
    domTo: full[full.length - 1].medianDom,
  } : null;

  // Inventory: active listings now vs. the average full-month sales pace.
  let activeSql = `SELECT COUNT(*) AS n FROM rets_property WHERE L_Status = 'Active' AND ${isZip(area) ? "L_Zip" : "L_City"} = ?`;
  const activeParams: any[] = [area];
  if (type) { activeSql += " AND L_Type_ = ?"; activeParams.push(type); }
  const [{ n: activeListings }] = await query<{ n: number }>(activeSql, activeParams);
  const pace = avg(full.map((m) => m.sales));
  const monthsOfSupply = pace ? activeListings / pace : null;

  const saleToListPct = ratios.length ? median(ratios)! * 100 : null;
  return {
    area,
    type,
    months,
    sales: rows.length,
    dataThrough: last,
    medianPrice: median(rows.map((r) => r.ClosePrice))!,
    avgPrice: avg(rows.map((r) => r.ClosePrice))!,
    medianPpsf: median(rows.map(ppsf).filter((v): v is number => v != null)),
    medianDom: median(rows.map((r) => r.DaysOnMarket).filter((v): v is number => v != null)),
    avgDom: avg(rows.map((r) => r.DaysOnMarket).filter((v): v is number => v != null)),
    saleToListPct,
    overAskingPct: ratios.length ? (ratios.filter((x) => x > 1).length / ratios.length) * 100 : null,
    activeListings,
    monthsOfSupply,
    market: marketType(monthsOfSupply, saleToListPct),
    trend,
    trendChange,
  };
}

// Close spellings for an unknown city, e.g. "Irvin" -> "Irvine".
export async function suggestCities(area: string) {
  const rows = await query<{ City: string }>(
    `SELECT City FROM california_sold WHERE City LIKE ? GROUP BY City ORDER BY COUNT(*) DESC LIMIT 5`,
    [`%${area.trim().slice(0, 4)}%`]
  );
  return rows.map((r) => r.City);
}
