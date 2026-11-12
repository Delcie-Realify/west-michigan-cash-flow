/*
 * Realify Rent Estimator
 * ----------------------
 * Estimates monthly market rent for each unit of a listing by blending two methods:
 *
 *   1. BASELINE  - a rent table by ZIP code and bedroom count, adjusted for the
 *                  property's size, baths, garage, laundry, condition and type.
 *   2. COMPS     - recently leased rentals nearby with the same bedroom count,
 *                  each adjusted to match the subject property (appraisal-style),
 *                  then averaged with more weight on closer, newer, more similar comps.
 *
 * The more good comps we have, the more the estimate leans on comps instead of the table.
 * Every number in SETTINGS is a starting assumption - tune it as you learn the market.
 */
var RentEstimator = (function () {
  "use strict";

  const SETTINGS = {
    // What a "typical" rental in the baseline table looks like, by bedroom count.
    typical: {
      0: { baths: 1, sqft: 450 },
      1: { baths: 1, sqft: 650 },
      2: { baths: 1, sqft: 900 },
      3: { baths: 1, sqft: 1200 },
      4: { baths: 1.5, sqft: 1500 },
      5: { baths: 2, sqft: 1800 },
    },
    typicalFeatures: { garage: false, laundry: true, condition: "average", propertyType: "single_family" },

    adjustments: {
      fullBath: 75,          // $/month per full bath above/below the comparison
      halfBath: 35,          // $/month per half bath
      garage: 50,            // $/month for a garage
      laundry: 40,           // $/month for in-unit laundry or hookups
      extraBedroom: 200,     // $/month per bedroom beyond the largest column in the table
      sizeElasticity: 0.30,  // 10% more square feet => 3% more rent
      sizeCapPct: 0.15,      // size can move rent at most +/-15%
      condition: { updated: 0.05, average: 0, dated: -0.05, needs_work: -0.12 },
      propertyType: { single_family: 1.0, condo: 0.95, duplex_unit: 0.93, multi_unit: 0.90 },
    },

    comps: {
      passes: [
        { miles: 1, months: 12 },  // first look: tight radius, last 12 months
        { miles: 2, months: 18 },  // if fewer than 3 found: widen
      ],
      minGood: 3,
      outlierPct: 0.20,            // drop comps >20% from the median (only when 5+ comps)
      minForOutlierTrim: 5,
    },

    // How much weight the comps get vs. the baseline, by number of comps.
    compWeight: function (n) { return n >= 3 ? 0.75 : n === 2 ? 0.5 : n === 1 ? 0.3 : 0; },

    rangePct: { High: 0.05, Medium: 0.08, Low: 0.12 },
    roundTo: 25,
  };

  const CONDITION_LABELS = { updated: "Updated", average: "Average", dated: "Dated", needs_work: "Needs work" };
  const TYPE_LABELS = { single_family: "Single-family", condo: "Condo", duplex_unit: "Duplex unit", multi_unit: "3-4 unit building" };

  // ---------- helpers ----------
  function roundTo(x, step) { return Math.round(x / step) * step; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function bathParts(b) { const full = Math.floor(b); return { full: full, half: b - full >= 0.5 ? 1 : 0 }; }

  function milesBetween(a, b) {
    if (a.lat == null || b.lat == null) return null;
    const R = 3958.8, toRad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * toRad, dLon = (b.lon - a.lon) * toRad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function monthsBetween(isoDate, asOf) {
    return (new Date(asOf) - new Date(isoDate)) / (1000 * 60 * 60 * 24 * 30.44);
  }

  function median(xs) {
    const s = xs.slice().sort((a, b) => a - b), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function coefficientOfVariation(xs) {
    if (xs.length < 2) return null;
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
    return Math.sqrt(variance) / mean;
  }

  // ---------- the core adjustment: turn a reference rent into the subject's rent ----------
  // `ref` is the property the rent came from (a comp, or the "typical" table property).
  // `subj` is the unit we are estimating. Returns the adjusted rent and each step taken.
  function adjust(baseRent, ref, subj) {
    const a = SETTINGS.adjustments;
    const steps = [];
    let rent = baseRent;

    function add(label, amount) {
      if (Math.abs(amount) >= 1) { steps.push({ label: label, amount: amount }); rent += amount; }
    }

    // Percentage adjustments first
    const typeRatio = (a.propertyType[subj.propertyType] || 1) / (a.propertyType[ref.propertyType] || 1);
    add("Type: " + TYPE_LABELS[subj.propertyType] + " vs " + TYPE_LABELS[ref.propertyType], rent * (typeRatio - 1));

    const condRatio = (1 + (a.condition[subj.condition] || 0)) / (1 + (a.condition[ref.condition] || 0));
    add("Condition: " + CONDITION_LABELS[subj.condition] + " vs " + CONDITION_LABELS[ref.condition], rent * (condRatio - 1));

    if (subj.sqft && ref.sqft) {
      const pct = clamp(a.sizeElasticity * (subj.sqft / ref.sqft - 1), -a.sizeCapPct, a.sizeCapPct);
      add("Size: " + subj.sqft + " vs " + ref.sqft + " sq ft", rent * pct);
    }

    // Then dollar adjustments
    const sb = bathParts(subj.baths), rb = bathParts(ref.baths);
    add("Baths: " + subj.baths + " vs " + ref.baths, (sb.full - rb.full) * a.fullBath + (sb.half - rb.half) * a.halfBath);
    add(subj.garage ? "Has garage (comparison doesn't)" : "No garage (comparison has one)", ((subj.garage ? 1 : 0) - (ref.garage ? 1 : 0)) * a.garage);
    add(subj.laundry ? "Has in-unit laundry (comparison doesn't)" : "No in-unit laundry (comparison has it)", ((subj.laundry ? 1 : 0) - (ref.laundry ? 1 : 0)) * a.laundry);

    const grossAdjPct = steps.reduce((s, x) => s + Math.abs(x.amount), 0) / baseRent;
    return { rent: rent, steps: steps, grossAdjPct: grossAdjPct };
  }

  // ---------- Method 1: baseline table ----------
  function baseline(unit, location, table) {
    let row = table.byZip[location.zip];
    let source = "ZIP " + location.zip + " table";
    const zipFound = !!row;
    if (!row) { row = table.citywide; source = "Citywide table (no data for ZIP " + location.zip + ")"; }

    const maxBeds = Math.max.apply(null, Object.keys(row).map(Number));
    let base;
    if (row[unit.beds] != null) {
      base = row[unit.beds];
    } else {
      base = row[maxBeds] + (unit.beds - maxBeds) * SETTINGS.adjustments.extraBedroom;
      source += " + $" + SETTINGS.adjustments.extraBedroom + "/extra bedroom";
    }

    const typ = SETTINGS.typical[Math.min(unit.beds, 5)];
    const ref = Object.assign({ beds: unit.beds, baths: typ.baths, sqft: typ.sqft }, SETTINGS.typicalFeatures);
    const adj = adjust(base, ref, unit);
    return { base: base, source: source, zipFound: zipFound, rent: adj.rent, steps: adj.steps };
  }

  // ---------- Method 2: leased comps ----------
  function findComps(unit, location, comps, asOf) {
    const passes = SETTINGS.comps.passes;
    let found = [];
    for (let p = 0; p < passes.length; p++) {
      found = [];
      comps.forEach(function (c) {
        if (c.beds !== unit.beds) return;
        const miles = milesBetween(location, c);
        const months = monthsBetween(c.leasedDate, asOf);
        const sameZipNoCoords = miles == null && c.zip === location.zip;
        if ((sameZipNoCoords || (miles != null && miles <= passes[p].miles)) && months >= 0 && months <= passes[p].months) {
          found.push({ comp: c, miles: miles, months: months });
        }
      });
      if (found.length >= SETTINGS.comps.minGood) return { found: found, widened: p > 0 };
    }
    return { found: found, widened: true };
  }

  function compEstimate(unit, location, comps, asOf) {
    const search = findComps(unit, location, comps, asOf);
    let used = search.found.map(function (f) {
      const adj = adjust(f.comp.rent, f.comp, unit);
      const recencyW = f.months <= 6 ? 1 : Math.max(0.5, 1 - (f.months - 6) / 24);
      const distanceW = f.miles == null ? 0.5 : 1 / (1 + f.miles);
      const similarityW = 1 / (1 + 3 * adj.grossAdjPct);
      return {
        comp: f.comp, miles: f.miles, months: f.months,
        adjustedRent: adj.rent, steps: adj.steps,
        weight: recencyW * distanceW * similarityW, excluded: false,
      };
    });

    if (used.length >= SETTINGS.comps.minForOutlierTrim) {
      const med = median(used.map(u => u.adjustedRent));
      used.forEach(function (u) { if (Math.abs(u.adjustedRent / med - 1) > SETTINGS.comps.outlierPct) u.excluded = true; });
    }

    const kept = used.filter(u => !u.excluded);
    const totalW = kept.reduce((s, u) => s + u.weight, 0);
    const rent = kept.length ? kept.reduce((s, u) => s + u.weight * u.adjustedRent, 0) / totalW : null;
    kept.forEach(u => { u.share = u.weight / totalW; });
    return { rent: rent, count: kept.length, all: used, widened: search.widened, cv: coefficientOfVariation(kept.map(u => u.adjustedRent)) };
  }

  // ---------- Blend the two methods ----------
  function estimateUnit(unit, location, data, asOf) {
    const base = baseline(unit, location, data.rentTable);
    const comp = compEstimate(unit, location, data.comps, asOf);
    const w = SETTINGS.compWeight(comp.count);
    const raw = comp.count ? w * comp.rent + (1 - w) * base.rent : base.rent;

    let confidence;
    if (comp.count >= 3 && comp.cv != null && comp.cv <= 0.08) confidence = "High";
    else if ((comp.count >= 3 && comp.cv != null && comp.cv <= 0.15) || comp.count === 2) confidence = "Medium";
    else confidence = "Low";

    const notes = [];
    if (!base.zipFound) notes.push("No baseline rents for this ZIP yet - used the citywide average.");
    if (comp.count === 0) notes.push("No leased comps found - estimate is the baseline table only. Look up comps manually.");
    else if (comp.count < 3) notes.push("Only " + comp.count + " comp(s) found - consider adding more manually.");
    if (comp.widened && comp.count > 0) notes.push("Search widened to 2 miles / 18 months to find comps.");
    if (comp.count && Math.abs(comp.rent / base.rent - 1) > 0.15) {
      notes.push("Comps and the baseline table disagree by " + Math.round(Math.abs(comp.rent / base.rent - 1) * 100) + "% - the table for this ZIP may need updating.");
    }

    const r = SETTINGS.rangePct[confidence];
    return {
      unit: unit,
      estimate: roundTo(raw, SETTINGS.roundTo),
      low: roundTo(raw * (1 - r), SETTINGS.roundTo),
      high: roundTo(raw * (1 + r), SETTINGS.roundTo),
      confidence: confidence,
      compWeight: w,
      baseline: base,
      comps: comp,
      notes: notes,
    };
  }

  const CONF_RANK = { Low: 0, Medium: 1, High: 2 };

  function estimateListing(listing, data, asOf) {
    const location = { zip: listing.zip, lat: listing.lat, lon: listing.lon };
    const units = listing.units.map(u => estimateUnit(u, location, data, asOf));
    const sum = key => units.reduce((s, u) => s + u[key], 0);
    const monthly = sum("estimate");
    const confidence = units.reduce((lo, u) => CONF_RANK[u.confidence] < CONF_RANK[lo] ? u.confidence : lo, "High");
    const inPlace = listing.currentRents ? listing.currentRents.reduce((a, b) => a + b, 0) : null;
    return {
      listing: listing,
      units: units,
      monthly: monthly,
      low: sum("low"),
      high: sum("high"),
      confidence: confidence,
      inPlaceRent: inPlace,
      rentToPrice: monthly / listing.price, // the "1% rule" check: 0.01 = 1%
    };
  }

  return { SETTINGS: SETTINGS, estimateListing: estimateListing, estimateUnit: estimateUnit, TYPE_LABELS: TYPE_LABELS, CONDITION_LABELS: CONDITION_LABELS };
})();

if (typeof module !== "undefined") module.exports = RentEstimator;
