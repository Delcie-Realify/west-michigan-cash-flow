/*
 * RESO ADAPTER
 * ---------------------------------------------------------------------------
 * Turns MLS records (RESO Data Dictionary 2.x format — what MichRIC's data
 * feed sends) into the simple "listing" objects the website uses.
 *
 * Why this exists: the website never reads MLS field names directly. If the
 * MLS feed changes, or we switch from mock data to real data, only this file
 * needs to change.
 *
 * Usage:
 *   ResoAdapter.toListing(record)        -> one listing (or null if unusable)
 *   ResoAdapter.toListings(arrayOrOData) -> array of good listings; accepts a
 *                                           plain array OR a raw RESO Web API
 *                                           response like { "value": [ ... ] }
 *   ResoAdapter.lastWarnings             -> list of problems found by the last call
 *
 * Problems come in two kinds:
 *   - "skipped": the record can't be used (no price, 5+ units, unknown type...).
 *   - plain warnings: the record is usable but something is missing or odd
 *     (no map location, no tax amount...). It is still shown.
 */
var ResoAdapter = (function () {
  "use strict";

  var COUNTIES = ["Kent", "Ottawa", "Allegan", "Muskegon"];

  // How often an HOA fee is billed -> how many times per year.
  var FEE_PER_YEAR = {
    monthly: 12, bimonthly: 6, quarterly: 4, semiannually: 2, semiannual: 2,
    annually: 1, annual: 1, yearly: 1, weekly: 52, daily: 365
  };

  var UNIT_COUNT_BY_TYPE = { duplex: 2, triplex: 3, fourplex: 4 };

  // ---------- small helpers ----------
  function isBlank(v) { return v === undefined || v === null || v === ""; }

  function num(v) {
    if (isBlank(v)) return null;
    var n = typeof v === "number" ? v : parseFloat(String(v).replace(/[$,\s]/g, ""));
    return isFinite(n) ? n : null;
  }

  function str(v) { return isBlank(v) ? "" : String(v).trim(); }

  // Lowercase and strip spaces/punctuation so "Single Family Residence",
  // "SingleFamilyResidence" and "single-family" all compare the same.
  function key(v) { return str(v).toLowerCase().replace(/[^a-z0-9]/g, ""); }

  // RESO multi-select values sometimes come as arrays or comma lists.
  function first(v) {
    if (Array.isArray(v)) return v.length ? v[0] : null;
    if (typeof v === "string" && v.indexOf(",") > -1) return v.split(",")[0];
    return v;
  }

  // ---------- property type ----------
  // Returns "single_family" | "condo" | "townhouse" | "duplex" | "triplex" | "fourplex" | null
  function mapPropertyType(rec) {
    var sub = key(first(rec.PropertySubType));
    var units = num(rec.NumberOfUnitsTotal);
    if (/^(singlefamily|singlefamilyresidence|singlefamilyhome|detached|house|residential)$/.test(sub)) return "single_family";
    if (/^(condominium|condo|apartment|stockcooperative|coop)$/.test(sub)) return "condo";
    if (/^(townhouse|townhome|rowhouse|attached)$/.test(sub)) return "townhouse";
    if (/^(duplex|twofamily|2unit|2units)$/.test(sub)) return "duplex";
    if (/^(triplex|threefamily|3unit|3units)$/.test(sub)) return "triplex";
    if (/^(quadruplex|fourplex|quadplex|fourfamily|4unit|4units)$/.test(sub)) return "fourplex";
    // Generic "multi family" records: decide by unit count.
    if (/multifamily|multiunit|residentialincome|income/.test(sub) || (!sub && key(rec.PropertyType) === "residentialincome")) {
      if (units === 2) return "duplex";
      if (units === 3) return "triplex";
      if (units === 4) return "fourplex";
      return null;
    }
    if (!sub && units === 1) return "single_family";
    return null;
  }

  // ---------- HOA ----------
  function hoaMonthly(rec, warn) {
    var total = 0;
    [["AssociationFee", "AssociationFeeFrequency"], ["AssociationFee2", "AssociationFee2Frequency"]].forEach(function (pair) {
      var fee = num(rec[pair[0]]);
      if (!fee) return;
      var freq = key(rec[pair[1]]);
      var perYear = FEE_PER_YEAR[freq];
      if (!perYear) {
        if (freq === "onetime") return; // one-time fees aren't a monthly cost
        warn(pair[0] + " has unknown frequency \"" + str(rec[pair[1]]) + "\"; assumed monthly");
        perYear = 12;
      }
      total += fee * perYear / 12;
    });
    return Math.round(total * 100) / 100;
  }

  // ---------- baths ----------
  // Prefer full + half (half = 0.5). Fall back to RESO totals.
  function bathsOf(full, half, totalInt, decimal) {
    if (full !== null || half !== null) return (full || 0) + 0.5 * (half || 0);
    if (decimal !== null) return decimal;
    return totalInt;
  }

  // ---------- units ----------
  function buildUnits(rec, propertyType, unitCount, beds, baths, sqft, warn) {
    var units = [];
    var types = rec.UnitTypes;
    if (types && !Array.isArray(types) && Array.isArray(types.value)) types = types.value;

    if (Array.isArray(types) && types.length) {
      types.forEach(function (t) {
        var howMany = num(t.UnitTypeUnitsTotal) || 1;
        for (var i = 0; i < howMany; i++) {
          units.push({
            beds: num(t.UnitTypeBedsTotal),
            baths: num(t.UnitTypeBathsTotal),
            sqft: null, // RESO UnitTypes has no per-unit square footage
            currentRent: num(t.UnitTypeActualRent)
          });
        }
      });
    } else if (unitCount === 1) {
      units.push({ beds: beds, baths: baths, sqft: sqft, currentRent: null });
    }

    if (unitCount === 1) {
      // Single-unit homes: one unit = the whole house (fill gaps from the house totals).
      var u = units[0] || {};
      return [{
        beds: u.beds !== null && u.beds !== undefined ? u.beds : beds,
        baths: u.baths !== null && u.baths !== undefined ? u.baths : baths,
        sqft: sqft,
        currentRent: u.currentRent !== undefined ? u.currentRent : null
      }];
    }

    if (units.length !== unitCount) {
      if (units.length) warn("unit details list " + units.length + " unit(s) but building has " + unitCount + "; unit details rebuilt from building totals");
      else warn("no per-unit details; beds/baths split evenly across " + unitCount + " units");
      units = [];
      var b = beds || 0, ba = baths || 0;
      for (var k = 0; k < unitCount; k++) {
        // Spread leftover bedrooms onto the first units.
        var ub = Math.floor(b / unitCount) + (k < b % unitCount ? 1 : 0);
        units.push({ beds: ub, baths: Math.max(1, Math.round((ba / unitCount) * 2) / 2), sqft: null, currentRent: null });
      }
    }
    units.forEach(function (x, i) {
      if (x.beds === null) warn("unit " + (i + 1) + " is missing bedrooms");
      if (x.baths === null) warn("unit " + (i + 1) + " is missing bathrooms");
    });
    return units;
  }

  // ---------- photos ----------
  function photosOf(rec) {
    var media = rec.Media;
    if (media && !Array.isArray(media) && Array.isArray(media.value)) media = media.value;
    if (!Array.isArray(media)) return [];
    return media
      .filter(function (m) {
        if (!m || !m.MediaURL) return false;
        var cat = key(m.MediaCategory);
        return !cat || cat === "photo" || cat === "photos" || cat === "image";
      })
      .sort(function (a, b) { return (num(a.Order) || 0) - (num(b.Order) || 0); })
      .map(function (m) { return m.MediaURL; });
  }

  function normCounty(v) {
    var c = str(v).replace(/\s+county$/i, "");
    for (var i = 0; i < COUNTIES.length; i++) if (COUNTIES[i].toLowerCase() === c.toLowerCase()) return COUNTIES[i];
    return c;
  }

  function addressOf(rec) {
    var parts = [str(rec.StreetNumber), str(rec.StreetDirPrefix), str(rec.StreetName), str(rec.StreetSuffix), str(rec.StreetDirSuffix)]
      .filter(Boolean).join(" ");
    if (parts && str(rec.UnitNumber) && parts.indexOf(str(rec.UnitNumber)) === -1) parts += " Unit " + str(rec.UnitNumber);
    if (parts) return parts;
    // Fallback: first piece of the one-line address ("123 Main St, City, MI 49503")
    return str(rec.UnparsedAddress).split(",")[0];
  }

  // ---------- main conversion ----------
  // Returns { listing, warnings, skipped }
  function convert(rec) {
    var warnings = [];
    var skipped = null;
    var id = rec && str(rec.ListingKey || rec.ListingId);
    var label = id || "(no ListingKey)";
    function warn(msg) { warnings.push(label + ": " + msg); }
    function fail(msg) { if (!skipped) skipped = label + ": skipped — " + msg; }

    if (!rec || typeof rec !== "object") return { listing: null, warnings: [], skipped: "(record): skipped — not an object" };
    if (!id) fail("missing ListingKey");

    var propertyType = mapPropertyType(rec);
    if (!propertyType) fail("unsupported property type \"" + str(first(rec.PropertySubType)) + "\" (units: " + str(rec.NumberOfUnitsTotal) + ")");

    var unitCount = UNIT_COUNT_BY_TYPE[propertyType] || 1;
    var unitsField = num(rec.NumberOfUnitsTotal);
    if (unitsField !== null && unitsField !== unitCount && propertyType) {
      if (unitsField > 4) fail(unitsField + " units (only 1-4 supported)");
      else warn("NumberOfUnitsTotal is " + unitsField + " but type is " + propertyType + "; using " + unitCount);
    }

    var price = num(rec.ListPrice);
    if (!price || price <= 0) fail("missing or invalid ListPrice");

    var zip = str(rec.PostalCode).slice(0, 5);
    if (!/^\d{5}$/.test(zip)) fail("missing or invalid PostalCode");

    var address = addressOf(rec);
    if (!address) fail("missing street address");

    var city = str(rec.City);
    if (!city) warn("missing City");

    var county = normCounty(rec.CountyOrParish);
    if (COUNTIES.indexOf(county) === -1) warn("county \"" + county + "\" is outside Kent/Ottawa/Allegan/Muskegon");

    var status = str(rec.StandardStatus) || str(rec.MlsStatus);
    if (status !== "Active") warn("status is \"" + status + "\", not Active");

    var lat = num(rec.Latitude), lon = num(rec.Longitude);
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) {
      warn("missing or invalid map location");
      lat = null; lon = null;
    }

    var beds = num(rec.BedroomsTotal);
    var baths = bathsOf(num(rec.BathroomsFull), num(rec.BathroomsHalf), num(rec.BathroomsTotalInteger), num(rec.BathroomsTotalDecimal));
    var sqft = num(rec.LivingArea);
    if (beds === null) warn("missing BedroomsTotal");
    if (baths === null) warn("missing bathrooms");

    var sellerTax = num(rec.TaxAnnualAmount);
    if (sellerTax === null) warn("missing TaxAnnualAmount");

    if (skipped) return { listing: null, warnings: warnings, skipped: skipped };

    var units = buildUnits(rec, propertyType, unitCount, beds, baths, sqft, warn);

    // Some feeds only give a building total rent; spread it if no unit rents are known.
    var totalRent = num(rec.TotalActualRent);
    var anyUnitRent = units.some(function (u) { return u.currentRent !== null; });
    if (totalRent && !anyUnitRent && unitCount > 1) {
      warn("only a building total rent was given; split evenly across units");
      units.forEach(function (u) { u.currentRent = Math.round(totalRent / unitCount); });
    }

    var hoa = hoaMonthly(rec, warn);

    var listing = {
      id: id,
      mlsNumber: str(rec.ListingId) || id,
      status: status,
      address: address,
      city: city,
      county: county,
      state: str(rec.StateOrProvince) || "MI",
      zip: zip,
      lat: lat,
      lon: lon,
      price: price,
      propertyType: propertyType,
      unitCount: unitCount,
      units: units,
      beds: beds,
      baths: baths,
      sqft: sqft,
      yearBuilt: num(rec.YearBuilt),
      lotAcres: num(rec.LotSizeAcres),
      sellerTaxAnnual: sellerTax,
      taxYear: num(rec.TaxYear),
      hoaMonthly: hoa,
      photos: photosOf(rec),
      remarks: str(rec.PublicRemarks),
      listOffice: str(rec.ListOfficeName),
      listAgent: str(rec.ListAgentFullName),
      daysOnMarket: num(rec.DaysOnMarket),
      onMarketDate: str(rec.OnMarketDate) || null,
      updatedAt: str(rec.ModificationTimestamp) || null,
      isMock: rec.X_IsMock === true || /^MOCK/.test(id)
    };
    if (!listing.listOffice) warn("missing ListOfficeName (required for MLS attribution)");
    return { listing: listing, warnings: warnings, skipped: null };
  }

  var api = {
    lastWarnings: [],

    // Convert one record. Returns null if it can't be used (reason in lastWarnings).
    toListing: function (rec) {
      var r = convert(rec);
      api.lastWarnings = r.skipped ? r.warnings.concat([r.skipped]) : r.warnings;
      return r.listing;
    },

    // Convert many. Accepts an array, or a RESO Web API response { value: [...] }.
    toListings: function (input) {
      var list = Array.isArray(input) ? input : (input && Array.isArray(input.value) ? input.value : []);
      var out = [], warnings = [];
      list.forEach(function (rec) {
        var r = convert(rec);
        warnings = warnings.concat(r.warnings);
        if (r.skipped) warnings.push(r.skipped);
        if (r.listing) out.push(r.listing);
      });
      api.lastWarnings = warnings;
      return out;
    },

    // Exposed for tests / other tools.
    mapPropertyType: mapPropertyType,
    COUNTIES: COUNTIES
  };
  return api;
})();

if (typeof module !== "undefined") module.exports = ResoAdapter;
