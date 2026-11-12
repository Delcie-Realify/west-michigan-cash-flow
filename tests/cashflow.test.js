/*
 * Tests for js/cashflow.js  (run:  sh tests/run-tests.sh)
 *
 * The expected numbers below were worked out BY HAND (with a calculator, separately from
 * the engine) and written into the comments. Each test checks the engine agrees within $1
 * (or 0.0001 for ratios).
 *
 * The HUD rents here are a small MADE-UP fixture, not real HUD numbers - so these tests
 * don't depend on data/hud-rents.js.
 */
var HUD_FIXTURE = {
  source: "TEST FIXTURE (not real data)",
  byZip: {
    "49507": { 0: 1100, 1: 1250, 2: 1550, 3: 1980, 4: 2200 },
    "49509": { 0: 1000, 1: 1150, 2: 1400, 3: 1710, 4: 1950 },
    "49444": { 0: 950, 1: 1100, 2: 1300, 3: 1650, 4: 1850 }
  },
  byCounty: {
    Kent: { 0: 1000, 1: 1150, 2: 1400, 3: 1800, 4: 2000 },
    Ottawa: { 0: 1050, 1: 1200, 2: 1450, 3: 1850, 4: 2050 }
  }
};

// ---------------- tiny test helpers ----------------
var passed = 0, failed = 0, currentTest = "";
function test(name, fn) {
  currentTest = name;
  var before = failed;
  try { fn(); } catch (e) { failed++; print("  FAIL  " + name + " -> threw " + e + (e.stack ? "\n" + e.stack : "")); return; }
  print((failed === before ? "  ok    " : "  FAIL  ") + name);
}
function check(cond, msg) {
  if (cond) { passed++; } else { failed++; print("  FAIL  [" + currentTest + "] " + msg); }
}
function near(actual, expected, tol, label) {
  check(typeof actual === "number" && Math.abs(actual - expected) <= tol,
    label + ": expected " + expected + " (+/-" + tol + "), got " + actual);
}
function hasWarning(r, text) {
  return r.warnings.some(function (w) { return w.toLowerCase().indexOf(text.toLowerCase()) !== -1; });
}

// ---------------- sample listings (hypothetical) ----------------
function sfr() {
  return { id: "T-SFR", city: "Grand Rapids", county: "Kent", zip: "49507", price: 160000,
    propertyType: "single_family", unitCount: 1, units: [{ beds: 3, baths: 1, sqft: 1100, currentRent: null }],
    beds: 3, yearBuilt: 1955, hoaMonthly: 0, sellerTaxAnnual: 2100, taxYear: 2025 };
}
function duplex() {
  return { id: "T-DUP", city: "Wyoming", county: "Kent", zip: "49509", price: 240000,
    propertyType: "duplex", unitCount: 2,
    units: [{ beds: 2, baths: 1, sqft: 850, currentRent: 1300 }, { beds: 2, baths: 1, sqft: 850, currentRent: null }],
    beds: 4, yearBuilt: 1925, hoaMonthly: 0 };
}
function condo() {
  return { id: "T-CONDO", city: "Holland", county: "Ottawa", zip: "49423", price: 180000,
    propertyType: "condo", unitCount: 1, units: [{ beds: 2, baths: 1, sqft: 950, currentRent: null }],
    beds: 2, yearBuilt: 2001, hoaMonthly: 250 };
}
function fourplex() {
  var u = function () { return { beds: 1, baths: 1, sqft: 600, currentRent: null }; };
  return { id: "T-4PLEX", city: "Muskegon Heights", county: "Muskegon", zip: "49444", price: 200000,
    propertyType: "fourplex", unitCount: 4, units: [u(), u(), u(), u()],
    beds: 4, yearBuilt: 1950, hoaMonthly: 0 };
}

print("Realify cash-flow engine tests");

// ---------------- setup checks ----------------
test("defaults come from data/assumptions.js", function () {
  check(CashFlow.DEFAULTS.downPaymentPct === ASSUMPTIONS.downPaymentPct, "down payment");
  check(CashFlow.DEFAULTS.interestRate === ASSUMPTIONS.interestRate, "rate");
  check(CashFlow.DEFAULTS.minPerDoor === 200 && CashFlow.DEFAULTS.minCashOnCash === 0.08, "thresholds");
  check(CashFlow.DEFAULTS.managementPct === 0, "self-managed by default");
  check(CashFlow.PRESETS["default"].vacancyPct === 0.05, "default preset = assumptions");
  check(CashFlow.PRESETS.conservative.vacancyPct === 0.08 && CashFlow.PRESETS.conservative.managementPct === 0.09, "conservative preset");
  check(CashFlow.PRESETS.aggressive.downPaymentPct === 0.20, "aggressive preset");
});

test("loan payment formula: $100,000 at 6% for 30 years = $599.55", function () {
  // Textbook value: 100000 * 0.005 / (1 - 1.005^-360) = 599.55
  near(CashFlow.monthlyPayment(100000, 0.06, 30), 599.55, 0.01, "payment");
  near(CashFlow.monthlyPayment(120000, 0, 30), 333.33, 0.01, "0% rate payment");
});

// ---------------- WORKED EXAMPLE 1: single-family, Grand Rapids ----------------
/*
 * $160,000 3-bed house, ZIP 49507, City of Grand Rapids (51.1249 rental mills). Default assumptions.
 *   Rent (HUD fixture 49507, 3BR)              1,980.00
 *   Vacancy 5%                                     99.00  -> collected rent 1,881.00
 *   Repairs 5% / capex 5%                          99.00 / 99.00
 *   Management (self)                               0.00
 *   Tax: 160,000 x 0.5 x 51.1249 / 1000 = 4,089.99/yr  -> 340.83/mo
 *   Insurance: 600 + 0.0045 x 160,000 = 1,320/yr       -> 110.00/mo
 *   Other fees ($10/unit)                          10.00
 *   Operating expenses = 99+99+340.83+110+10 =    658.83
 *   NOI = 1,881 - 658.83 =                      1,222.17
 *   Loan 120,000 @ 7.875%, 30 yr:  P&I =          870.08
 *   Cash flow = 1,222.17 - 870.08 =               352.08 / month  (per door 352.08)
 *   Cash in = 40,000 down + 4,800 closing =    44,800
 *   Cash-on-cash = 352.08 x 12 / 44,800 =        9.43%   -> passes both tests -> grade B
 *   DSCR = 1,222.17 / 870.08 = 1.4047; cap rate = 14,666.01 / 160,000 = 9.17%
 */
test("worked example 1: single-family house (Grand Rapids)", function () {
  var r = CashFlow.analyze(sfr(), HUD_FIXTURE);
  check(r.rent.units[0].source === "HUD SAFMR", "rent source should be HUD SAFMR, got " + r.rent.units[0].source);
  near(r.monthly.grossRent, 1980, 0.01, "gross rent");
  near(r.monthly.vacancy, 99, 0.01, "vacancy");
  near(r.monthly.propertyTax, 340.83, 1, "property tax");
  near(r.tax.investorAnnual, 4089.99, 1, "annual tax");
  check(r.tax.millage === 51.1249, "millage " + r.tax.millage);
  check(r.tax.sellerAnnual === 2100, "seller tax kept for comparison");
  near(r.monthly.insurance, 110, 0.01, "insurance");
  near(r.monthly.operatingExpenses, 658.83, 1, "operating expenses");
  near(r.monthly.noi, 1222.17, 1, "NOI");
  near(r.loan.monthlyPI, 870.08, 1, "P&I");
  near(r.monthly.cashFlow, 352.08, 1, "cash flow");
  near(r.perDoor, 352.08, 1, "per door");
  near(r.cash.totalCashNeeded, 44800, 1, "cash needed");
  near(r.cashOnCash, 0.0943, 0.0001, "cash-on-cash");
  near(r.dscr, 1.4047, 0.0001, "DSCR");
  near(r.capRate, 0.09166, 0.0001, "cap rate");
  near(r.annual.cashFlow, 352.08 * 12, 12, "annual cash flow");
  check(r.passes.perDoor && r.passes.cashOnCash && r.passes.overall, "should pass both tests");
  check(r.grade === "B", "grade should be B, got " + r.grade);
  check(hasWarning(r, "before 1978"), "1955 house should get the lead-paint warning");
  check(r.tax.explanation.indexOf("51.1249") !== -1, "tax explanation mentions the millage");
});

// ---------------- WORKED EXAMPLE 2: duplex, Wyoming ----------------
/*
 * $240,000 duplex, ZIP 49509, City of Wyoming (Wyoming PS: 58.6915 rental mills), built 1925.
 *   Unit 1: current lease 1,300 ; Unit 2: HUD fixture 49509 2BR 1,400   -> gross 2,700.00
 *   Vacancy 5% 135.00 -> collected 2,565.00 ; repairs 135.00 ; capex 135.00
 *   Tax: 240,000 x 0.5 x 58.6915 / 1000 = 7,042.98/yr -> 586.92/mo
 *   Insurance: 600 + 1,080 + 300 (1 extra unit) = 1,980/yr -> 165.00/mo
 *   Owner-paid water/sewer 2 x 70 = 140.00 ; other fees 2 x 10 = 20.00
 *   Operating expenses = 135+135+586.92+165+140+20 = 1,181.92
 *   NOI = 2,565 - 1,181.92 = 1,383.09
 *   Loan 180,000 @ 7.875%: P&I = 1,305.12
 *   Cash flow = 77.96 / month -> per door 38.98
 *   Cash in = 60,000 + 7,200 = 67,200 ; cash-on-cash = 935.52 / 67,200 = 1.39%
 *   Positive but CoC < 4% -> grade D ; DSCR = 1.0597
 */
test("worked example 2: duplex (Wyoming), one current lease + one HUD rent", function () {
  var r = CashFlow.analyze(duplex(), HUD_FIXTURE);
  check(r.rent.units[0].source === "current lease" && r.rent.units[0].rent === 1300, "unit 1 uses current lease");
  check(r.rent.units[1].source === "HUD SAFMR" && r.rent.units[1].rent === 1400, "unit 2 uses HUD");
  near(r.rent.total, 2700, 0.01, "total rent");
  check(r.tax.millage === 58.6915, "Wyoming millage, got " + r.tax.millage);
  near(r.monthly.propertyTax, 586.92, 1, "property tax");
  near(r.monthly.insurance, 165, 0.01, "insurance");
  near(r.monthly.utilities, 140, 0.01, "utilities");
  near(r.monthly.otherExpenses, 20, 0.01, "other");
  near(r.monthly.noi, 1383.09, 1, "NOI");
  near(r.loan.monthlyPI, 1305.12, 1, "P&I");
  near(r.monthly.cashFlow, 77.96, 1, "cash flow");
  near(r.perDoor, 38.98, 1, "per door");
  near(r.cashOnCash, 0.01392, 0.0001, "cash-on-cash");
  near(r.dscr, 1.0597, 0.0001, "DSCR");
  check(!r.passes.perDoor && !r.passes.cashOnCash && !r.passes.overall, "fails both tests");
  check(r.grade === "D", "grade should be D, got " + r.grade);
  check(hasWarning(r, "pre-1940"), "1925 building should warn about higher reserves");
});

// ---------------- WORKED EXAMPLE 3: condo with HOA, Holland ----------------
/*
 * $180,000 2-bed condo, Holland (Ottawa; Holland PS 59.9411 mills), HOA $250/mo.
 * ZIP 49423 is NOT in the fixture -> falls back to Ottawa County 2BR = 1,450.
 *   Gross 1,450.00 ; vacancy 72.50 -> collected 1,377.50 ; repairs 72.50 ; capex 72.50
 *   Tax: 180,000 x 0.5 x 59.9411 / 1000 = 5,394.70/yr -> 449.56/mo
 *   Insurance (condo HO-6 = 40% of formula): (600 + 810) x 0.4 = 564/yr -> 47.00/mo
 *   HOA 250.00 ; utilities 0 ; other 10.00
 *   Operating expenses = 72.5+72.5+449.56+47+250+10 = 901.56
 *   NOI = 1,377.50 - 901.56 = 475.94
 *   Loan 135,000: P&I = 978.84
 *   Cash flow = -502.90 / month ; cash in 45,000 + 5,400 = 50,400 ; CoC = -11.97% -> grade F
 */
test("worked example 3: condo with HOA (Holland), county rent fallback", function () {
  var r = CashFlow.analyze(condo(), HUD_FIXTURE);
  check(r.rent.units[0].source === "HUD county FMR" && r.rent.units[0].rent === 1450, "county FMR fallback");
  check(r.tax.millage === 59.9411, "Holland (Ottawa) millage, got " + r.tax.millage);
  near(r.monthly.propertyTax, 449.56, 1, "property tax");
  near(r.monthly.insurance, 47, 0.01, "condo insurance");
  near(r.monthly.hoa, 250, 0.01, "HOA");
  near(r.monthly.noi, 475.94, 1, "NOI");
  near(r.loan.monthlyPI, 978.84, 1, "P&I");
  near(r.monthly.cashFlow, -502.90, 1, "cash flow");
  near(r.cashOnCash, -0.11974, 0.0001, "cash-on-cash");
  check(r.grade === "F", "grade should be F, got " + r.grade);
  check(hasWarning(r, "rental caps"), "condo should warn about HOA rental restrictions");
  check(hasWarning(r, "County average"), "should warn that ZIP rent wasn't available");
});

// ---------------- EDGE: all cash (100% down) ----------------
/*
 * Same house as example 1, paid in cash: no loan, so cash flow = NOI = 1,222.17.
 * Cash in = 160,000 + 4,800 = 164,800 ; CoC = 14,666.01 / 164,800 = 8.90% -> passes -> B (under 12%)
 */
test("edge: all-cash purchase (100% down)", function () {
  var r = CashFlow.analyze(sfr(), HUD_FIXTURE, { downPaymentPct: 1 });
  near(r.loan.amount, 0, 0.01, "loan");
  near(r.loan.monthlyPI, 0, 0.01, "P&I");
  near(r.monthly.cashFlow, 1222.17, 1, "cash flow");
  near(r.cashOnCash, 0.08899, 0.0001, "cash-on-cash");
  check(r.dscr === null, "DSCR should be null with no loan");
  check(r.grade === "B", "grade B, got " + r.grade);
});

// ---------------- EDGE: professional management on ----------------
/*
 * Example 1 with a 9% manager + 0.75-month leasing fee spread over a 2-year tenancy:
 *   management = 9% x 1,881 collected = 169.29 ; leasing = 1,980 x 0.75 / 24 = 61.88
 *   cash flow = 352.08 - 169.29 - 61.88 = 120.92 -> fails $200/door
 */
test("edge: professional management toggle", function () {
  var a = CashFlow.withProManagement({}, true);
  var r = CashFlow.analyze(sfr(), HUD_FIXTURE, a);
  near(r.monthly.management, 169.29, 0.01, "management");
  near(r.monthly.leasing, 61.875, 0.01, "leasing");
  near(r.monthly.cashFlow, 120.92, 1, "cash flow");
  check(!r.passes.perDoor, "should fail per-door test");
  var off = CashFlow.withProManagement(a, false);
  check(off.managementPct === 0 && off.leasingFeeMonths === 0, "toggle off");
});

// ---------------- EDGE: 4 units ----------------
/*
 * $200,000 fourplex, Muskegon Heights (61.0182 mills), 4 x 1BR at HUD fixture 1,100.
 *   Gross 4,400 ; vacancy 220 -> 4,180 ; repairs 220 ; capex 220
 *   Tax 200,000 x 0.5 x 61.0182 / 1000 = 6,101.82/yr -> 508.49/mo
 *   Insurance 600 + 900 + 3 x 300 = 2,400/yr -> 200.00 ; water/sewer 4 x 70 = 280 ; other 40
 *   Opex 1,468.49 ; NOI 2,711.52 ; loan 150,000 P&I 1,087.60
 *   Cash flow 1,623.91 -> per door 405.98 ; cash in 56,000 ; CoC 34.80% -> grade A
 */
test("edge: fourplex (4 units)", function () {
  var r = CashFlow.analyze(fourplex(), HUD_FIXTURE);
  check(r.rent.units.length === 4, "4 units");
  near(r.monthly.grossRent, 4400, 0.01, "gross");
  near(r.monthly.utilities, 280, 0.01, "utilities");
  near(r.monthly.insurance, 200, 0.01, "insurance");
  near(r.monthly.noi, 2711.52, 1, "NOI");
  near(r.loan.monthlyPI, 1087.60, 1, "P&I");
  near(r.monthly.cashFlow, 1623.91, 1, "cash flow");
  near(r.perDoor, 405.98, 1, "per door");
  near(r.cashOnCash, 0.34798, 0.0001, "cash-on-cash");
  check(r.grade === "A", "grade A, got " + r.grade);
});

// ---------------- EDGE: missing rent data ----------------
test("edge: missing rent data (no lease, ZIP and county unknown)", function () {
  var l = sfr(); l.zip = "99999"; l.county = "Nowhere"; l.city = "Nowhere";
  var r = CashFlow.analyze(l, HUD_FIXTURE);
  check(r.rent.total === 0, "rent should be 0");
  check(r.rent.units[0].source === "missing", "source missing");
  check(hasWarning(r, "NO RENT DATA"), "missing-rent warning");
  check(hasWarning(r, "not in our table"), "unknown-city tax warning");
  check(r.tax.millage === MILLAGE.defaultMills, "default millage used");
  check(r.grade === "F", "grade F");
  check(r.grm === null, "GRM null with no rent");
  var r2 = CashFlow.analyze(sfr(), null);   // no rent table at all (HUD_RENTS not loaded in tests)
  check(r2.rent.total === 0 && hasWarning(r2, "NO RENT DATA"), "no rent table at all");
});

// ---------------- EDGE: other lookups and warnings ----------------
test("edge: aliases, county fallback, big bedrooms, odd data", function () {
  var l = sfr(); l.city = "Byron Center";
  check(CashFlow.analyze(l, HUD_FIXTURE).tax.millage === 48.5896, "Byron Center -> Byron Township");
  l.city = "Somewhere Twp";
  var r = CashFlow.analyze(l, HUD_FIXTURE);
  check(r.tax.millage === MILLAGE.countyFallback.Kent.mills && r.tax.verified === false, "Kent fallback");
  var h = sfr(); h.city = "Holland"; h.county = "Allegan";
  check(CashFlow.analyze(h, HUD_FIXTURE).tax.millage === 61.5389, "Holland Allegan part");
  var big = sfr(); big.units[0].beds = 6;   // 4BR 2,200 x (1 + 0.15 x 2) = 2,860
  var rb = CashFlow.analyze(big, HUD_FIXTURE);
  check(rb.rent.total === 2860, "6BR extrapolation, got " + rb.rent.total);
  var odd = sfr(); odd.price = 15000; odd.yearBuilt = 2099;
  var ro = CashFlow.analyze(odd, HUD_FIXTURE);
  check(hasWarning(ro, "unusually low") && hasWarning(ro, "looks wrong"), "price/year anomaly warnings");
  var lowDown = CashFlow.analyze(duplex(), HUD_FIXTURE, CashFlow.PRESETS.aggressive);
  check(hasWarning(lowDown, "25% down"), "2-4 unit 20% down warning");
  var override = CashFlow.analyze(sfr(), HUD_FIXTURE, { millageOverride: 40 });
  near(override.tax.investorAnnual, 3200, 0.01, "millage override");
  var noUnits = sfr(); delete noUnits.units;
  check(CashFlow.analyze(noUnits, HUD_FIXTURE).rent.total === 1980, "units built from beds when missing");
});

test("presets order deals sensibly", function () {
  var c = CashFlow.analyze(sfr(), HUD_FIXTURE, CashFlow.PRESETS.conservative).monthly.cashFlow;
  var d = CashFlow.analyze(sfr(), HUD_FIXTURE, CashFlow.PRESETS["default"]).monthly.cashFlow;
  check(c < d, "conservative should show less cash flow than default");
  var ag = CashFlow.analyze(sfr(), HUD_FIXTURE, CashFlow.PRESETS.aggressive);
  check(ag.cash.totalCashNeeded < 44800, "aggressive needs less cash");
  check(CashFlow.DEFAULTS.vacancyPct === 0.05, "presets must not change DEFAULTS");
});

test("analyzeAll sorts best-first by cash-on-cash", function () {
  var res = CashFlow.analyzeAll([condo(), sfr(), duplex(), fourplex()], HUD_FIXTURE);
  check(res.map(function (r) { return r.listingId; }).join(",") === "T-4PLEX,T-SFR,T-DUP,T-CONDO", "order: " + res.map(function (r) { return r.listingId; }).join(","));
  check(res[0].listing.id === "T-4PLEX", "results carry their listing");
});

print("");
print(passed + " checks passed, " + failed + " failed");
if (failed > 0) throw new Error(failed + " test check(s) failed");
