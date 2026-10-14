import { query } from "./db.ts";
import type { PropertyFilters } from "../skills/property-search/parser.ts";

// One row from searchActiveListings. mysql2 returns DECIMAL columns as strings.
export type ListingRow = {
  L_ListingID: string;
  L_DisplayId: string;
  L_Address: string;
  L_City: string;
  L_Zip: string;
  price: number;
  beds: number | null;
  baths: string | null;
  sqft: number | null;
  type: string | null;
  status: string;
  lat: string | null;
  lng: string | null;
  YearBuilt: number | null;
  AssociationFee: number | null;
  DaysOnMarket: number | null;
  PoolPrivateYN: string | null;
  ViewYN: string | null;
  FireplaceYN: string | null;
  PhotoCount: number | null;
  LA1_UserFirstName: string | null;
  LA1_UserLastName: string | null;
  LO1_OrganizationName: string | null;
};

// One row from getSoldComps.
export type SoldRow = {
  ListingKey: number;
  UnparsedAddress: string;
  City: string;
  CloseDate: string;
  ClosePrice: number;
  OriginalListPrice: number | null;
  ListPrice: number | null;
  DaysOnMarket: number | null;
  BedroomsTotal: number | null;
  BathroomsTotalInteger: number | null;
  LivingArea: number | null;
  PropertyType: string;
  PropertySubType: string | null;
  YearBuilt: number | null;
  ListAgentFullName: string | null;
  ListOfficeName: string | null;
  BuyerOfficeName: string | null;
};

// Builds the WHERE clause shared by the search and count queries.
function activeWhere(filters: PropertyFilters) {
  let where = `WHERE L_Status = 'Active'`;
  const params: any[] = [];

  if (filters.city)     { where += " AND L_City = ?";         params.push(filters.city); }
  if (filters.maxPrice) { where += " AND L_SystemPrice <= ?"; params.push(filters.maxPrice); }
  if (filters.beds)     { where += " AND L_Keyword2 >= ?";    params.push(filters.beds); }
  if (filters.baths)    { where += " AND LM_Dec_3 >= ?";      params.push(filters.baths); }
  if (filters.sqft)     { where += " AND LM_Int2_3 >= ?";     params.push(filters.sqft); }
  if (filters.type)     { where += " AND L_Type_ = ?";        params.push(filters.type); }
  // The parser outputs "True", but these columns store '1' (yes) or ''/NULL (no).
  if (filters.pool)     { where += " AND PoolPrivateYN = '1'"; }
  if (filters.hasView)  { where += " AND ViewYN = '1'"; }

  return { where, params };
}

export async function searchActiveListings(filters: PropertyFilters, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  const { where, params } = activeWhere(filters);
  const sql = `
    SELECT
      L_ListingID, L_DisplayId, L_Address, L_City, L_Zip,
      L_SystemPrice AS price, L_Keyword2 AS beds, LM_Dec_3 AS baths,
      LM_Int2_3 AS sqft, L_Type_ AS type, L_Status AS status,
      LMD_MP_Latitude AS lat, LMD_MP_Longitude AS lng,
      YearBuilt, AssociationFee, DaysOnMarket,
      PoolPrivateYN, ViewYN, FireplaceYN, PhotoCount,
      LA1_UserFirstName, LA1_UserLastName, LO1_OrganizationName
    FROM rets_property ${where}
    ORDER BY L_SystemPrice ASC LIMIT ? OFFSET ?
  `;
  return query<ListingRow>(sql, [...params, limit, offset]);
}

export async function countActiveListings(filters: PropertyFilters) {
  const { where, params } = activeWhere(filters);
  const rows = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM rets_property ${where}`, params);
  return rows[0].n;
}

export async function getSoldComps(city: string, months = 12) {
  // CloseDate is stored as 'YYYY-MM-DD' text; a few rows have impossible
  // future dates, so anything after today is excluded.
  const sql = `
    SELECT
      ListingKey, UnparsedAddress, City, CloseDate, ClosePrice,
      OriginalListPrice, ListPrice, DaysOnMarket,
      BedroomsTotal, BathroomsTotalInteger, LivingArea,
      PropertyType, PropertySubType, YearBuilt,
      ListAgentFullName, ListOfficeName, BuyerOfficeName
    FROM california_sold
    WHERE City = ?
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      AND CloseDate <= CURDATE()
      AND PropertyType = 'Residential'
    ORDER BY CloseDate DESC
    LIMIT 50
  `;
  return query<SoldRow>(sql, [city, months]);
}
