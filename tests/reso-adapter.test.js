/*
 * Tests for js/reso-adapter.js, data/mock-listings.js and data/hud-rents.js
 * Run from the project folder (JavaScriptCore ships with every Mac):
 *   /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc \
 *     data/hud-rents.js data/mock-listings.js js/reso-adapter.js tests/reso-adapter.test.js
 */
(function () {
  var passed = 0, failed = 0;
  function check(cond, msg) {
    if (cond) passed++;
    else { failed++; print("FAIL: " + msg); }
  }
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function isStr(v) { return typeof v === "string"; }

  var TYPES = ["single_family", "condo", "townhouse", "duplex", "triplex", "fourplex"];
  var UNITS_FOR = { single_family: 1, condo: 1, townhouse: 1, duplex: 2, triplex: 3, fourplex: 4 };
  var KEYS = ["id", "mlsNumber", "status", "address", "city", "county", "state", "zip", "lat", "lon",
    "price", "propertyType", "unitCount", "units", "beds", "baths", "sqft", "yearBuilt", "lotAcres",
    "sellerTaxAnnual", "taxYear", "hoaMonthly", "photos", "remarks", "listOffice", "listAgent",
    "daysOnMarket", "onMarketDate", "updatedAt", "isMock"];

  // ---- 1. All mock records convert with zero warnings ----
  check(MOCK_RESO_PROPERTIES.length >= 38 && MOCK_RESO_PROPERTIES.length <= 42, "about 40 mock records (got " + MOCK_RESO_PROPERTIES.length + ")");
  var listings = ResoAdapter.toListings(MOCK_RESO_PROPERTIES);
  check(listings.length === MOCK_RESO_PROPERTIES.length, "all mock records converted (" + listings.length + ")");
  check(ResoAdapter.lastWarnings.length === 0, "zero warnings: " + ResoAdapter.lastWarnings.join(" | "));

  // ---- 2. Shape matches the contract ----
  var ids = {};
  listings.forEach(function (l) {
    var tag = l.id + " ";
    KEYS.forEach(function (k) { check(k in l, tag + "has key " + k); });
    check(Object.keys(l).length === KEYS.length, tag + "no extra keys");
    check(!ids[l.id], tag + "unique id"); ids[l.id] = true;
    check(l.status === "Active", tag + "status Active");
    check(TYPES.indexOf(l.propertyType) > -1, tag + "valid propertyType");
    check(l.unitCount === UNITS_FOR[l.propertyType], tag + "unitCount matches type");
    check(Array.isArray(l.units) && l.units.length === l.unitCount, tag + "units length === unitCount");
    l.units.forEach(function (u, i) {
      check(isNum(u.beds) && isNum(u.baths), tag + "unit " + i + " beds/baths numeric");
      check(u.sqft === null || isNum(u.sqft), tag + "unit " + i + " sqft number|null");
      check(u.currentRent === null || isNum(u.currentRent), tag + "unit " + i + " currentRent number|null");
      check(Object.keys(u).length === 4, tag + "unit " + i + " has exactly 4 keys");
    });
    check(isNum(l.price) && l.price > 0, tag + "price");
    check(isNum(l.lat) && isNum(l.lon) && l.lat > 42.3 && l.lat < 43.6 && l.lon > -86.6 && l.lon < -85.2, tag + "lat/lon in West Michigan");
    check(/^\d{5}$/.test(l.zip) && l.state === "MI", tag + "zip/state");
    check(ResoAdapter.COUNTIES.indexOf(l.county) > -1, tag + "county in the 4");
    check(isNum(l.sellerTaxAnnual) && isNum(l.taxYear), tag + "tax fields");
    check(isNum(l.hoaMonthly) && l.hoaMonthly >= 0, tag + "hoaMonthly number");
    if (l.propertyType === "condo" || l.propertyType === "townhouse") check(l.hoaMonthly > 0, tag + "condo/townhouse has HOA");
    check(Array.isArray(l.photos), tag + "photos array");
    check(isStr(l.listOffice) && l.listOffice.length > 0, tag + "listOffice present");
    check(l.isMock === true, tag + "isMock true");
    check(isStr(l.onMarketDate) && isStr(l.updatedAt), tag + "dates");
  });

  // ---- 3. Mix looks right ----
  var count = {};
  listings.forEach(function (l) { count[l.propertyType] = (count[l.propertyType] || 0) + 1; });
  var multi = (count.duplex || 0) + (count.triplex || 0) + (count.fourplex || 0);
  check(multi >= 12 && (count.single_family || 0) >= 15 && ((count.condo || 0) + (count.townhouse || 0)) >= 4, "property-type mix " + JSON.stringify(count));
  ResoAdapter.COUNTIES.forEach(function (c) {
    check(listings.some(function (l) { return l.county === c; }), "has listings in " + c);
  });

  // ---- 4. Every ZIP has HUD rent data ----
  check(HUD_RENTS.fiscalYear >= 2026 && isStr(HUD_RENTS.url) && isStr(HUD_RENTS.effectiveDate), "HUD metadata present");
  ResoAdapter.COUNTIES.forEach(function (c) {
    var r = HUD_RENTS.byCounty[c];
    check(r && [0, 1, 2, 3, 4].every(function (b) { return isNum(r[b]) && r[b] > 0; }), "county fallback rents for " + c);
  });
  Object.keys(HUD_RENTS.byZip).forEach(function (z) {
    var r = HUD_RENTS.byZip[z];
    check([0, 1, 2, 3, 4].every(function (b) { return isNum(r[b]) && r[b] > 0; }), "HUD byZip " + z + " has 0-4 BR");
  });
  var zipMissing = [];
  listings.forEach(function (l) { if (!HUD_RENTS.byZip[l.zip]) zipMissing.push(l.zip); });
  check(zipMissing.length === 0, "every mock ZIP has a HUD Small Area FMR (missing: " + zipMissing.join(",") + ")");

  // ---- 5. Spot checks on specific conversions ----
  function byId(id) { return listings.filter(function (l) { return l.id === id; })[0]; }
  var gh = listings.filter(function (l) { return l.city === "Grand Haven" && l.propertyType === "condo"; })[0];
  check(gh && gh.hoaMonthly === 350, "quarterly HOA $1,050 -> $350/month (got " + (gh && gh.hoaMonthly) + ")");
  var th = listings.filter(function (l) { return l.propertyType === "townhouse"; })[0];
  check(th && th.baths % 1 === 0.5, "half bath counted as 0.5");
  var quad = listings.filter(function (l) { return l.propertyType === "fourplex" && l.units.some(function (u) { return u.currentRent === null; }); })[0];
  check(!!quad, "a fourplex with a vacant unit keeps currentRent null");

  // ---- 6. Works on a RESO Web API-style response and handles bad records ----
  var odata = { "@odata.context": "https://example.invalid/odata/$metadata#Property", value: [
    MOCK_RESO_PROPERTIES[0],
    { ListingKey: "X1", ListPrice: 300000, PostalCode: "49503", StreetNumber: "1", StreetName: "Test St", PropertySubType: "Apartment", NumberOfUnitsTotal: 12 },
    { ListingKey: "X2", ListPrice: null, PostalCode: "49503", UnparsedAddress: "2 Test St, Grand Rapids, MI 49503", PropertySubType: "Duplex" },
    { ListingKey: "X3", StandardStatus: "Active", ListPrice: "189,000", PostalCode: "49504-1234", UnparsedAddress: "3 Test St, Grand Rapids, MI 49504",
      City: "Grand Rapids", CountyOrParish: "Kent County", PropertyType: "Residential Income", PropertySubType: "Multi Family", NumberOfUnitsTotal: 2,
      BedroomsTotal: 5, BathroomsTotalInteger: 2, Latitude: 42.97, Longitude: -85.70, TaxAnnualAmount: 2500, ListOfficeName: "Test Office", TotalActualRent: 2400,
      Media: [{ MediaKey: "b", MediaURL: "https://example.invalid/2.jpg", Order: 2 }, { MediaKey: "a", MediaURL: "https://example.invalid/1.jpg", Order: 1 }] }
  ]};
  var mixed = ResoAdapter.toListings(odata);
  check(mixed.length === 2, "OData { value } accepted; 12-unit and no-price records skipped (kept " + mixed.length + ")");
  check(ResoAdapter.lastWarnings.some(function (w) { return /X1: skipped/.test(w); }), "warning for 12-unit record");
  check(ResoAdapter.lastWarnings.some(function (w) { return /X2: skipped .*ListPrice/.test(w); }), "warning for missing price");
  var x3 = mixed[1];
  check(x3 && x3.propertyType === "duplex" && x3.units.length === 2 && x3.price === 189000 && x3.zip === "49504" && x3.county === "Kent", "generic multi-family mapped to duplex, price/zip/county cleaned");
  check(x3 && x3.units[0].beds + x3.units[1].beds === 5 && x3.units[0].currentRent === 1200, "units rebuilt from totals; total rent split");
  check(x3 && x3.photos[0] === "https://example.invalid/1.jpg" && x3.isMock === false, "photos sorted by Order; real record isMock false");
  check(ResoAdapter.toListing({ ListingKey: "X4" }) === null && ResoAdapter.lastWarnings.length > 0, "toListing returns null + warnings on bad record");
  check(ResoAdapter.toListings(null).length === 0, "toListings(null) -> []");

  print("reso-adapter tests: " + passed + " passed, " + failed + " failed");
  if (failed) throw new Error(failed + " test(s) failed");
})();
