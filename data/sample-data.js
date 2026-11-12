/*
 * SAMPLE DATA - ALL HYPOTHETICAL.
 * Addresses, rents, listings and comps below are made up for testing the formula.
 * Rent numbers are placeholders - replace the rent table with real figures from
 * your market knowledge (or HUD/rent-survey data) before relying on any estimate.
 * When MLS access is approved, `comps` and `listings` will come from the MLS feed.
 */
var SAMPLE_DATA = {
  asOf: "2026-11-12",

  // Baseline monthly rent for a typical single-family rental, by ZIP and bedrooms.
  // "Typical" = the sizes/baths in RentEstimator.SETTINGS.typical, average condition, no garage.
  rentTable: {
    citywide: { 0: 900, 1: 1075, 2: 1325, 3: 1650, 4: 1925 },
    byZip: {
      "49503": { 1: 1150, 2: 1425, 3: 1750, 4: 2050 },
      "49504": { 1: 1050, 2: 1300, 3: 1600, 4: 1875 },
      "49505": { 1: 1075, 2: 1350, 3: 1675, 4: 1950 },
      "49506": { 1: 1200, 2: 1500, 3: 1900, 4: 2250 },
      "49507": { 1: 950, 2: 1175, 3: 1450, 4: 1700 },
      "49508": { 1: 1100, 2: 1375, 3: 1700, 4: 1975 },
      "49548": { 1: 1000, 2: 1250, 3: 1550, 4: 1800 },
    },
  },

  // Recently leased rentals (from MLS lease listings, or entered manually).
  comps: [
    { id: "C01", address: "101 Sample St SE", zip: "49507", lat: 42.932, lon: -85.655, beds: 3, baths: 1, sqft: 1050, garage: false, laundry: true, condition: "average", propertyType: "single_family", rent: 1450, leasedDate: "2026-08-15", source: "MLS lease" },
    { id: "C02", address: "214 Example Ave SE", zip: "49507", lat: 42.927, lon: -85.646, beds: 3, baths: 1, sqft: 1200, garage: true, laundry: true, condition: "updated", propertyType: "single_family", rent: 1650, leasedDate: "2026-06-01", source: "MLS lease" },
    { id: "C03", address: "330 Placeholder Dr SE", zip: "49507", lat: 42.935, lon: -85.660, beds: 3, baths: 1.5, sqft: 1150, garage: false, laundry: true, condition: "average", propertyType: "single_family", rent: 1525, leasedDate: "2026-03-10", source: "Manual" },
    { id: "C04", address: "45 Testing Ct SE", zip: "49507", lat: 42.925, lon: -85.652, beds: 3, baths: 1, sqft: 1000, garage: false, laundry: true, condition: "dated", propertyType: "single_family", rent: 1350, leasedDate: "2026-09-20", source: "MLS lease" },
    { id: "C05", address: "512 Sample St NW", zip: "49504", lat: 42.978, lon: -85.700, beds: 3, baths: 1.5, sqft: 1300, garage: true, laundry: true, condition: "average", propertyType: "single_family", rent: 1650, leasedDate: "2026-07-12", source: "MLS lease" },
    { id: "C06", address: "77 Example Ave NW", zip: "49504", lat: 42.972, lon: -85.712, beds: 3, baths: 1, sqft: 1250, garage: false, laundry: true, condition: "updated", propertyType: "single_family", rent: 1625, leasedDate: "2026-04-02", source: "MLS lease" },
    { id: "C07", address: "903 Placeholder Dr NW", zip: "49504", lat: 42.980, lon: -85.708, beds: 3, baths: 2, sqft: 1450, garage: true, laundry: true, condition: "updated", propertyType: "single_family", rent: 1825, leasedDate: "2026-10-01", source: "Manual" },
    { id: "C08", address: "18 Sample St SE", zip: "49506", lat: 42.948, lon: -85.612, beds: 3, baths: 2, sqft: 1550, garage: true, laundry: true, condition: "updated", propertyType: "single_family", rent: 2100, leasedDate: "2026-05-15", source: "MLS lease" },
    { id: "C09", address: "260 Example Ave SE", zip: "49506", lat: 42.941, lon: -85.620, beds: 3, baths: 1.5, sqft: 1500, garage: true, laundry: true, condition: "average", propertyType: "single_family", rent: 1925, leasedDate: "2026-08-01", source: "MLS lease" },
    { id: "C10", address: "411 Placeholder Dr SE", zip: "49506", lat: 42.950, lon: -85.605, beds: 3, baths: 2, sqft: 1700, garage: true, laundry: true, condition: "updated", propertyType: "single_family", rent: 2200, leasedDate: "2026-02-20", source: "MLS lease" },
    { id: "C11", address: "620 Testing Ct SE (Unit A)", zip: "49507", lat: 42.931, lon: -85.648, beds: 2, baths: 1, sqft: 850, garage: false, laundry: true, condition: "average", propertyType: "duplex_unit", rent: 1125, leasedDate: "2026-07-01", source: "MLS lease" },
    { id: "C12", address: "88 Sample St SE (Lower)", zip: "49507", lat: 42.928, lon: -85.657, beds: 2, baths: 1, sqft: 800, garage: false, laundry: true, condition: "dated", propertyType: "duplex_unit", rent: 1050, leasedDate: "2026-09-05", source: "Manual" },
    { id: "C13", address: "140 Example Ave SE (Upper)", zip: "49507", lat: 42.936, lon: -85.645, beds: 2, baths: 1, sqft: 900, garage: false, laundry: true, condition: "updated", propertyType: "duplex_unit", rent: 1250, leasedDate: "2026-05-20", source: "MLS lease" },
    { id: "C14", address: "3301 Placeholder Dr SW", zip: "49548", lat: 42.872, lon: -85.660, beds: 4, baths: 2, sqft: 1650, garage: true, laundry: true, condition: "average", propertyType: "single_family", rent: 1850, leasedDate: "2026-06-15", source: "MLS lease" },
    { id: "C15", address: "2945 Testing Ct SW", zip: "49548", lat: 42.866, lon: -85.672, beds: 4, baths: 1.5, sqft: 1800, garage: true, laundry: true, condition: "average", propertyType: "single_family", rent: 1900, leasedDate: "2025-12-01", source: "MLS lease" },
    { id: "C16", address: "1720 Sample St NE #4", zip: "49505", lat: 43.003, lon: -85.630, beds: 2, baths: 1, sqft: 850, garage: false, laundry: true, condition: "updated", propertyType: "condo", rent: 1375, leasedDate: "2026-08-10", source: "MLS lease" },
    { id: "C17", address: "1855 Example Ave NE #12", zip: "49505", lat: 42.996, lon: -85.640, beds: 2, baths: 1, sqft: 950, garage: false, laundry: true, condition: "average", propertyType: "condo", rent: 1350, leasedDate: "2026-01-15", source: "Manual" },
    { id: "C18", address: "55 Placeholder Dr NE #2", zip: "49503", lat: 42.960, lon: -85.663, beds: 1, baths: 1, sqft: 600, garage: false, laundry: false, condition: "average", propertyType: "multi_unit", rent: 1050, leasedDate: "2026-07-20", source: "MLS lease" },
    { id: "C19", address: "210 Testing Ct NE #1", zip: "49503", lat: 42.955, lon: -85.657, beds: 1, baths: 1, sqft: 700, garage: false, laundry: true, condition: "updated", propertyType: "multi_unit", rent: 1200, leasedDate: "2026-09-01", source: "MLS lease" },
    { id: "C20", address: "38 Sample St NE #3", zip: "49503", lat: 42.962, lon: -85.668, beds: 1, baths: 1, sqft: 650, garage: false, laundry: false, condition: "dated", propertyType: "multi_unit", rent: 975, leasedDate: "2026-04-15", source: "MLS lease" },
    { id: "C21", address: "402 Example Ave NE #4", zip: "49503", lat: 42.957, lon: -85.655, beds: 1, baths: 1, sqft: 625, garage: false, laundry: true, condition: "average", propertyType: "multi_unit", rent: 1075, leasedDate: "2026-10-10", source: "Manual" },
  ],

  // For-sale listings to evaluate. Every listing has a `units` array (1 entry for a house).
  listings: [
    { id: "L1", address: "1200 Demo St SE", zip: "49507", lat: 42.930, lon: -85.652, price: 165000,
      units: [{ beds: 3, baths: 1, sqft: 1100, garage: false, laundry: true, condition: "average", propertyType: "single_family" }] },
    { id: "L2", address: "845 Demo Ave NW", zip: "49504", lat: 42.976, lon: -85.705, price: 219900,
      units: [{ beds: 3, baths: 1.5, sqft: 1350, garage: true, laundry: true, condition: "updated", propertyType: "single_family" }] },
    { id: "L3", address: "2300 Demo Dr SE", zip: "49506", lat: 42.945, lon: -85.614, price: 365000,
      units: [{ beds: 3, baths: 2, sqft: 1600, garage: true, laundry: true, condition: "updated", propertyType: "single_family" }] },
    { id: "L4", address: "715 Demo Ct SE (Duplex)", zip: "49507", lat: 42.933, lon: -85.650, price: 239900, currentRents: [1100, 1150],
      units: [
        { beds: 2, baths: 1, sqft: 850, garage: false, laundry: true, condition: "average", propertyType: "duplex_unit" },
        { beds: 2, baths: 1, sqft: 850, garage: false, laundry: true, condition: "average", propertyType: "duplex_unit" },
      ] },
    { id: "L5", address: "3100 Demo St SW", zip: "49548", lat: 42.869, lon: -85.666, price: 254900,
      units: [{ beds: 4, baths: 2, sqft: 1700, garage: true, laundry: true, condition: "average", propertyType: "single_family" }] },
    { id: "L6", address: "1800 Demo Ave NE #7", zip: "49505", lat: 43.000, lon: -85.635, price: 189900,
      units: [{ beds: 2, baths: 1, sqft: 900, garage: false, laundry: true, condition: "updated", propertyType: "condo" }] },
    { id: "L7", address: "60 Demo Dr NE (4-unit)", zip: "49503", lat: 42.959, lon: -85.661, price: 425000, currentRents: [1000, 1050, 975, 1100],
      units: [
        { beds: 1, baths: 1, sqft: 650, garage: false, laundry: false, condition: "dated", propertyType: "multi_unit" },
        { beds: 1, baths: 1, sqft: 650, garage: false, laundry: false, condition: "dated", propertyType: "multi_unit" },
        { beds: 1, baths: 1, sqft: 650, garage: false, laundry: false, condition: "dated", propertyType: "multi_unit" },
        { beds: 1, baths: 1, sqft: 650, garage: false, laundry: false, condition: "dated", propertyType: "multi_unit" },
      ] },
    { id: "L8", address: "4400 Demo Ct NE", zip: "49525", lat: 43.020, lon: -85.600, price: 209900,
      units: [{ beds: 3, baths: 1, sqft: 1150, garage: true, laundry: true, condition: "average", propertyType: "single_family" }] },
  ],
};

if (typeof module !== "undefined") module.exports = SAMPLE_DATA;
