/*
 * Realify Cash-Flow Engine
 * ========================
 * Takes one listing and answers: "If an investor buys this, what's left each month?"
 *
 * The math, in plain English (all monthly):
 *   1. RENT       - each unit's rent: the current lease if the listing has one, otherwise
 *                   HUD Fair Market Rent for the ZIP code + bedroom count, otherwise the
 *                   county-wide HUD rent.
 *   2. VACANCY    - knock off a % of gross rent for empty months. This happens FIRST, so the
 *                   manager's % is charged only on rent actually collected.
 *   3. EXPENSES   - repairs and capital reserves (% of gross rent), management (% of collected
 *                   rent), leasing fee (spread out monthly), property tax (Michigan rental rate),
 *                   insurance, HOA, owner-paid utilities, other fees.
 *   4. NOI        - "net operating income" = rent - vacancy - expenses (before the mortgage).
 *   5. MORTGAGE   - standard fixed-rate loan payment (principal + interest), plus PMI if under 20% down.
 *   6. CASH FLOW  - NOI - mortgage.  Per door = cash flow / number of units.
 *   7. CASH-ON-CASH - yearly cash flow / all the cash the investor puts in
 *                   (down payment + closing costs + points + rehab money).
 *
 * Michigan property tax (the big local surprise):
 *   investor yearly tax = price x 0.5 x rental (non-homestead) millage / 1000
 *   because (a) taxable value "uncaps" to ~half of market value after a sale and (b) a rental
 *   loses the Principal Residence Exemption (~18 extra school mills). The tax on the listing
 *   is what the SELLER pays and is usually far lower.
 *
 * Grade (letter shown on each listing):
 *   A = passes both of Delcie's tests AND cash-on-cash >= 12% AND >= $300/door/month
 *   B = passes both tests (>= $200/door/month AND >= 8% cash-on-cash, by default)
 *   C = positive cash flow and cash-on-cash >= 4%, but misses at least one test
 *   D = breaks even or small positive (cash flow >= $0) with cash-on-cash under 4%
 *   F = loses money every month
 * (The cutoffs live in GRADE_CUTOFFS below.)
 *
 * Needs (loaded before this file): data/assumptions.js (ASSUMPTIONS), data/millage.js (MILLAGE),
 * data/hud-rents.js (HUD_RENTS). Works without them, using built-in fallbacks + warnings.
 */
var CashFlow = (function () {
  "use strict";

  var G = (typeof globalThis !== "undefined") ? globalThis : this;

  // ---------- grade cutoffs ----------
  var GRADE_CUTOFFS = {
    A: { minCashOnCash: 0.12, minPerDoor: 300 },   // plus must pass both tests
    C: { minCashOnCash: 0.04 },                    // positive cash flow, at least 4% CoC
    D: { minCashFlow: 0 }                          // at least break-even
  };

  // HUD rule: rents for 5+ bedrooms = 4-bedroom rent + 15% for each extra bedroom.
  var HUD_EXTRA_BEDROOM_PCT = 0.15;

  // Used only if data/assumptions.js isn't loaded (kept identical to that file's values).
  var BUILT_IN = {
    asOf: "2026-11-12",
    downPaymentPct: 0.25, interestRate: 0.07875, termYears: 30, closingCostPct: 0.03,
    loanPointsPct: 0, pmiAnnualPct: 0.0075, rehabReservePct: 0,
    vacancyPct: 0.05, repairsPct: 0.05, capexPct: 0.05,
    managementPct: 0, leasingFeeMonths: 0, proManagementPct: 0.09, proLeasingFeeMonths: 0.75,
    averageTenancyYears: 2,
    insuranceAnnual: null,
    insurance: { baseAnnual: 600, pctOfPrice: 0.0045, perExtraUnitAnnual: 300, condoFactor: 0.4 },
    ownerPaidUtilitiesPerUnitMonthly: { single_family: 0, condo: 0, townhouse: 0, duplex: 70, triplex: 70, fourplex: 70 },
    otherPerUnitMonthly: 10,
    sevRatio: 0.5, millageOverride: null,
    minPerDoor: 200, minCashOnCash: 0.08
  };

  // ---------- small helpers ----------
  function isObj(x) { return x !== null && typeof x === "object" && !Array.isArray(x); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function merge(base, over) {            // deep merge: values in `over` win
    var out = clone(base);
    if (!isObj(over)) return out;
    Object.keys(over).forEach(function (k) {
      if (over[k] === undefined) return;
      out[k] = (isObj(out[k]) && isObj(over[k])) ? merge(out[k], over[k]) : (isObj(over[k]) ? clone(over[k]) : over[k]);
    });
    return out;
  }
  function num(x) { return typeof x === "number" && isFinite(x) ? x : null; }
  function money(x) { return "$" + Math.round(x).toLocaleString("en-US"); }
  function pct(x, d) { return (x * 100).toFixed(d == null ? 1 : d) + "%"; }
  function norm(s) { return String(s || "").trim().toLowerCase().replace(/^(city of|charter township of|township of)\s+/, "").replace(/\s+(twp\.?|charter twp\.?)$/, " township"); }

  var DEFAULTS = merge(BUILT_IN, (typeof G.ASSUMPTIONS !== "undefined") ? G.ASSUMPTIONS : null);

  // ---------- presets ----------
  // Conservative: for cautious buyers / older homes. Higher rate cushion (+0.5%), 8/8/8 reserves,
  //               professional management ON (9% + leasing fee), 25% more insurance.
  // Default:      exactly data/assumptions.js (Delcie's defaults: 25% down, 5/5/5, self-managed).
  // Aggressive:   experienced hands-on investor. 20% down, lighter reserves (4/4/4), self-managed.
  //               NOTE: 2-4 unit conventional investor loans still need 25% down - the engine warns.
  //               20% down usually gets a HIGHER rate in real life; we keep the default rate.
  var PRESETS = {
    conservative: merge(DEFAULTS, {
      interestRate: DEFAULTS.interestRate + 0.005,
      vacancyPct: 0.08, repairsPct: 0.08, capexPct: 0.08,
      managementPct: DEFAULTS.proManagementPct, leasingFeeMonths: DEFAULTS.proLeasingFeeMonths,
      insurance: { baseAnnual: DEFAULTS.insurance.baseAnnual * 1.25, pctOfPrice: DEFAULTS.insurance.pctOfPrice * 1.25,
                   perExtraUnitAnnual: DEFAULTS.insurance.perExtraUnitAnnual * 1.25 }
    }),
    "default": merge(DEFAULTS, {}),
    aggressive: merge(DEFAULTS, {
      downPaymentPct: 0.20,
      vacancyPct: 0.04, repairsPct: 0.04, capexPct: 0.04,
      managementPct: 0, leasingFeeMonths: 0
    })
  };
  PRESETS.conservative.presetName = "conservative";
  PRESETS["default"].presetName = "default";
  PRESETS.aggressive.presetName = "aggressive";

  // Turn professional management on/off on any assumptions object (returns a copy).
  function withProManagement(assumptions, on) {
    var a = merge(DEFAULTS, assumptions);
    a.managementPct = on ? a.proManagementPct : 0;
    a.leasingFeeMonths = on ? a.proLeasingFeeMonths : 0;
    return a;
  }

  // ---------- loan math ----------
  // Standard fixed-rate payment: P = L * r / (1 - (1 + r)^-n), r = monthly rate, n = months.
  function monthlyPayment(loanAmount, annualRate, termYears) {
    if (!(loanAmount > 0)) return 0;
    var n = termYears * 12, r = annualRate / 12;
    if (r === 0) return loanAmount / n;
    return loanAmount * r / (1 - Math.pow(1 + r, -n));
  }

  // ---------- rent ----------
  function hudRent(row, beds) {
    if (!row) return null;
    var b = Math.max(0, Math.round(beds));
    if (num(Number(row[b])) != null && Number(row[b]) > 0) return { rent: Number(row[b]), extrapolated: false };
    if (b > 4 && Number(row[4]) > 0) return { rent: Math.round(Number(row[4]) * (1 + HUD_EXTRA_BEDROOM_PCT * (b - 4))), extrapolated: true };
    return null;
  }

  function unitsOf(listing) {
    var count = Math.max(1, Math.round(listing.unitCount || (listing.units ? listing.units.length : 1) || 1));
    var units = (listing.units && listing.units.length) ? listing.units.slice() : [];
    if (!units.length) {
      var beds = num(listing.beds) != null ? Math.round(listing.beds / count) : null;
      for (var i = 0; i < count; i++) units.push({ beds: beds, baths: null, sqft: null, currentRent: null });
    }
    return units;
  }

  function estimateRent(listing, rentData) {
    rentData = rentData || (typeof G.HUD_RENTS !== "undefined" ? G.HUD_RENTS : null);
    var warnings = [];
    var zipRow = rentData && rentData.byZip ? rentData.byZip[String(listing.zip || "")] : null;
    var countyRow = rentData && rentData.byCounty ? rentData.byCounty[listing.county] : null;
    var units = unitsOf(listing).map(function (u, i) {
      var label = "Unit " + (i + 1);
      var beds = num(u.beds);
      if (beds == null) {
        beds = 2;
        warnings.push(label + ": bedroom count missing - assumed 2 bedrooms for the rent estimate.");
      }
      var market = hudRent(zipRow, beds), marketSource = "HUD SAFMR";
      if (!market) { market = hudRent(countyRow, beds); marketSource = "HUD county FMR"; }
      if (market && market.extrapolated) warnings.push(label + ": " + beds + " bedrooms - HUD rent estimated as the 4-bedroom rent + 15% per extra bedroom.");
      var out = { beds: beds, rent: 0, source: null, marketRent: market ? market.rent : null, marketSource: market ? marketSource : null };
      var lease = num(u.currentRent);
      if (lease != null && lease > 0) {
        out.rent = lease; out.source = "current lease";
        if (market && Math.abs(lease / market.rent - 1) > 0.2) {
          warnings.push(label + ": current lease " + money(lease) + " is " + (lease > market.rent ? "above" : "below") +
            " the HUD rent of " + money(market.rent) + " by " + Math.round(Math.abs(lease / market.rent - 1) * 100) + "% - read the actual lease.");
        }
      } else if (market) {
        out.rent = market.rent; out.source = marketSource;
        if (marketSource === "HUD county FMR") warnings.push(label + ": no ZIP-level HUD rent for " + (listing.zip || "this ZIP") + " - used the " + (listing.county || "") + " County average.");
      } else {
        out.source = "missing";
        warnings.push(label + ": NO RENT DATA (no current lease and no HUD rent for this ZIP or county). Rent counted as $0 - enter a rent to analyze.");
      }
      return out;
    });
    var total = units.reduce(function (s, u) { return s + u.rent; }, 0);
    return { units: units, total: total, warnings: warnings };
  }

  // ---------- Michigan property tax ----------
  function findMillage(listing, a) {
    var M = (typeof G.MILLAGE !== "undefined") ? G.MILLAGE : null;
    if (num(a.millageOverride) != null) return { mills: a.millageOverride, jurisdiction: "Custom rate (entered by you)", verified: null, fallback: false };
    if (M && M.jurisdictions) {
      var J = M.jurisdictions, keys = Object.keys(J), city = norm(listing.city);
      var aliasTarget = null;
      Object.keys(M.aliases || {}).forEach(function (k) { if (norm(k) === city) aliasTarget = M.aliases[k]; });
      var candidates = [listing.city + " (" + listing.county + " County part)", aliasTarget, listing.city, listing.city + " Township"];
      for (var c = 0; c < candidates.length; c++) {
        if (!candidates[c]) continue;
        for (var k = 0; k < keys.length; k++) {
          var j = J[keys[k]];
          if (norm(keys[k]) === norm(candidates[c]) && (!listing.county || !j.county || j.county === listing.county)) {
            return { mills: j.mills, jurisdiction: keys[k] + " (" + j.county + " County, " + j.schoolDistrict + " schools)", verified: j.verified, fallback: false };
          }
        }
      }
      var cf = M.countyFallback && M.countyFallback[listing.county];
      if (cf) return { mills: cf.mills, jurisdiction: listing.county + " County average (city not in our table)", verified: false, fallback: true };
      if (num(M.defaultMills) != null) return { mills: M.defaultMills, jurisdiction: "West Michigan default (city and county not recognized)", verified: false, fallback: true };
    }
    return { mills: 55, jurisdiction: "Built-in default (millage table not loaded)", verified: false, fallback: true };
  }

  function insuranceAnnual(listing, a, unitCount) {
    if (num(a.insuranceAnnual) != null) return a.insuranceAnnual;
    var p = a.insurance;
    var est = p.baseAnnual + p.pctOfPrice * listing.price + p.perExtraUnitAnnual * (unitCount - 1);
    if (listing.propertyType === "condo" || listing.propertyType === "townhouse") est *= p.condoFactor;
    return est;
  }

  // ---------- main analysis ----------
  function analyze(listing, rentData, assumptions) {
    var a = merge(DEFAULTS, assumptions);
    var warnings = [];
    var price = num(listing.price) || 0;
    var rent = estimateRent(listing, rentData);
    var unitCount = rent.units.length;
    warnings = warnings.concat(rent.warnings);

    // --- money in ---
    var grossRent = rent.total;
    var vacancy = grossRent * a.vacancyPct;
    var effectiveRent = grossRent - vacancy;

    // --- operating expenses (everything except vacancy and the mortgage) ---
    var repairs = grossRent * a.repairsPct;
    var capex = grossRent * a.capexPct;
    var management = effectiveRent * a.managementPct;
    var leasing = (a.leasingFeeMonths > 0 && a.averageTenancyYears > 0) ? grossRent * a.leasingFeeMonths / (a.averageTenancyYears * 12) : 0;

    var ml = findMillage(listing, a);
    var investorTaxAnnual = price * a.sevRatio * ml.mills / 1000;
    var propertyTax = investorTaxAnnual / 12;
    var insurance = insuranceAnnual(listing, a, unitCount) / 12;
    var hoa = num(listing.hoaMonthly) || 0;
    var utilPerUnit = (a.ownerPaidUtilitiesPerUnitMonthly || {})[listing.propertyType];
    var utilities = (num(utilPerUnit) || 0) * unitCount;
    var otherExpenses = (num(a.otherPerUnitMonthly) || 0) * unitCount;
    var operatingExpenses = repairs + capex + management + leasing + propertyTax + insurance + hoa + utilities + otherExpenses;
    var noi = effectiveRent - operatingExpenses;

    // --- loan ---
    var downPct = Math.min(1, Math.max(0, a.downPaymentPct));
    var downPayment = price * downPct;
    var loanAmount = price - downPayment;
    var pi = monthlyPayment(loanAmount, a.interestRate, a.termYears);
    var pmi = (loanAmount > 0 && downPct < 0.2) ? loanAmount * a.pmiAnnualPct / 12 : 0;
    var totalCosts = vacancy + operatingExpenses + pi + pmi;
    var cashFlow = grossRent - totalCosts;     // same as noi - pi - pmi

    // --- cash invested ---
    var closingCosts = price * a.closingCostPct + loanAmount * (a.loanPointsPct || 0);
    var rehabReserve = num(listing.rehabEstimate) != null ? listing.rehabEstimate : price * (a.rehabReservePct || 0);
    var totalCashNeeded = downPayment + closingCosts + rehabReserve;

    var monthly = {
      grossRent: grossRent, vacancy: vacancy, effectiveRent: effectiveRent,
      repairs: repairs, capex: capex, management: management, leasing: leasing,
      propertyTax: propertyTax, insurance: insurance, hoa: hoa, utilities: utilities, otherExpenses: otherExpenses,
      operatingExpenses: operatingExpenses, noi: noi,
      principalAndInterest: pi, pmi: pmi, totalCosts: totalCosts, cashFlow: cashFlow
    };
    var annual = {};
    Object.keys(monthly).forEach(function (k) { annual[k] = monthly[k] * 12; });

    var perDoor = cashFlow / unitCount;
    var cashOnCash = totalCashNeeded > 0 ? annual.cashFlow / totalCashNeeded : 0;
    var debtService = (pi + pmi) * 12;
    var dscr = debtService > 0 ? annual.noi / debtService : null;   // null = no loan (all cash)
    var capRate = price > 0 ? annual.noi / price : 0;
    var grm = annual.grossRent > 0 ? price / annual.grossRent : null;
    var onePercentRatio = price > 0 ? grossRent / price : 0;

    // --- pass / fail + grade ---
    var passes = { perDoor: perDoor >= a.minPerDoor, cashOnCash: cashOnCash >= a.minCashOnCash };
    passes.overall = passes.perDoor && passes.cashOnCash;
    var grade;
    if (passes.overall && cashOnCash >= GRADE_CUTOFFS.A.minCashOnCash && perDoor >= GRADE_CUTOFFS.A.minPerDoor) grade = "A";
    else if (passes.overall) grade = "B";
    else if (cashFlow > 0 && cashOnCash >= GRADE_CUTOFFS.C.minCashOnCash) grade = "C";
    else if (cashFlow >= GRADE_CUTOFFS.D.minCashFlow) grade = "D";
    else grade = "F";

    // --- tax explanation ---
    var seller = num(listing.sellerTaxAnnual);
    var explanation = "Estimated investor tax: " + money(price) + " price x 50% (taxable value resets after a sale) x " +
      ml.mills.toFixed(4) + " rental mills / 1,000 = " + money(investorTaxAnnual) + " a year (" + money(propertyTax) + "/month). " +
      "Rate used: " + ml.jurisdiction + ", " + (ml.verified ? "from the 2025 county millage table" : "an ESTIMATE - confirm on the parcel") + ". " +
      "Rentals pay the non-homestead rate (about 18 mills more than an owner-occupant). " +
      (seller != null ? "The listing shows the seller paying " + money(seller) + (listing.taxYear ? " (" + listing.taxYear + ")" : "") +
        "; that usually reflects a homestead exemption and a capped value, so don't use it. " : "") +
      "Rates vary by school district and the mailing city may differ from the tax jurisdiction - check the parcel.";
    if (ml.fallback) warnings.push("Tax rate for \"" + (listing.city || "unknown city") + "\" not in our table - used " + ml.jurisdiction + " (" + ml.mills + " mills). Confirm with the assessor.");

    // --- other warnings ---
    var yr = num(listing.yearBuilt), thisYear = Number(String(a.asOf || "2026").slice(0, 4));
    if (yr != null && (yr < 1800 || yr > thisYear + 1)) warnings.push("Year built (" + yr + ") looks wrong - check the listing.");
    else if (yr != null && yr < 1940) warnings.push("Built in " + yr + " (pre-1940): older systems - consider repairs and capital reserves of 8-10% or more each (try the Conservative preset). Also check for lead paint, knob-and-tube wiring and the sewer line.");
    else if (yr != null && yr < 1978) warnings.push("Built before 1978: lead-paint rules may apply (Grand Rapids Chapter 12). Budget for lead-safe work.");
    if (yr == null) warnings.push("Year built is missing - the age of the roof, furnace and plumbing drives repair costs.");
    if (!(price > 0)) warnings.push("Price is missing or zero - results are not meaningful.");
    else if (price < 30000) warnings.push("Price (" + money(price) + ") is unusually low - check for a typo, a land contract, or a property that needs major work.");
    else if (price / unitCount > 1000000) warnings.push("Price per unit is unusually high - check the listing.");
    if (listing.propertyType === "condo" || listing.propertyType === "townhouse") {
      warnings.push("Condo/townhome: many associations limit or ban rentals (rental caps, minimum lease terms, owner-occupancy rules). Get the bylaws and rules before making an offer.");
      if (!(hoa > 0)) warnings.push("HOA dues show as $0 for a condo/townhome - confirm the actual dues.");
    }
    if (listing.unitCount && listing.units && listing.units.length && listing.units.length !== listing.unitCount) {
      warnings.push("Listing says " + listing.unitCount + " units but has details for " + listing.units.length + " - used the unit details.");
    }
    if (unitCount >= 2 && downPct > 0 && downPct < 0.25) warnings.push("Conventional investor loans on 2-4 units usually require at least 25% down.");
    if (pmi > 0) warnings.push("Down payment under 20% - mortgage insurance (PMI) added, and investor loans with this little down may be hard to find.");
    if (grossRent > 0 && dscr != null && dscr < 1) warnings.push("Rent doesn't cover the mortgage after expenses (DSCR " + dscr.toFixed(2) + ").");

    return {
      listingId: listing.id,
      listing: listing,
      rent: { units: rent.units, total: rent.total },
      monthly: monthly,
      annual: annual,
      perDoor: perDoor,
      cashOnCash: cashOnCash,
      capRate: capRate,
      dscr: dscr,
      grm: grm,
      onePercentRatio: onePercentRatio,
      cash: { downPayment: downPayment, closingCosts: closingCosts, rehabReserve: rehabReserve, totalCashNeeded: totalCashNeeded },
      loan: { amount: loanAmount, rate: a.interestRate, termYears: a.termYears, monthlyPI: pi },
      tax: { investorAnnual: investorTaxAnnual, sellerAnnual: seller, millage: ml.mills, jurisdiction: ml.jurisdiction,
             verified: ml.verified, explanation: explanation },
      passes: passes,
      grade: grade,
      warnings: warnings,
      assumptions: a
    };
  }

  // Analyze many listings; best deals first (highest cash-on-cash, ties -> highest $/door).
  function analyzeAll(listings, rentData, assumptions) {
    return (listings || []).map(function (l) { return analyze(l, rentData, assumptions); })
      .sort(function (x, y) { return (y.cashOnCash - x.cashOnCash) || (y.perDoor - x.perDoor); });
  }

  return {
    DEFAULTS: DEFAULTS,
    PRESETS: PRESETS,
    GRADE_CUTOFFS: GRADE_CUTOFFS,
    estimateRent: estimateRent,
    analyze: analyze,
    analyzeAll: analyzeAll,
    withProManagement: withProManagement,
    monthlyPayment: monthlyPayment,
    findMillage: findMillage,
    formatMoney: money,
    formatPct: pct
  };
})();

if (typeof module !== "undefined") module.exports = CashFlow;
