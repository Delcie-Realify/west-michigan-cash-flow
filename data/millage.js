/*
 * MICHIGAN PROPERTY TAX RATES ("MILLAGE") FOR RENTAL PROPERTIES
 * ==============================================================
 * What this file is:
 *   The tax rate a rental owner (investor) pays in each city or township we cover.
 *   The website uses it to estimate the investor's property tax, which is usually MUCH
 *   higher than the tax shown on the listing (the seller usually lives there).
 *
 * Plain-English background:
 *   - A "mill" is $1 of tax per $1,000 of taxable value.
 *   - Rentals pay the NON-HOMESTEAD rate. It is about 18 mills higher than an owner-occupant
 *     pays, because rentals don't get Michigan's Principal Residence Exemption (PRE).
 *   - After a sale, taxable value "uncaps" to about half of market value.
 *   - So the website estimates:  investor tax per year = price x 0.5 x mills / 1000.
 *     Example: $200,000 house in Grand Rapids -> 200,000 x 0.5 x 51.1249 / 1000 = $5,112/yr.
 *
 * Where these numbers come from:
 *   2025 millage tables compiled by Transnation Title from 2025 county and township records
 *   (downloaded Nov 12, 2026). Each table says "estimate only; all information should be verified."
 *     Kent:     https://transnationtitle.com/wp-content/uploads/pdfs/millage_rates/2025/KENT-2025.PDF
 *     Ottawa:   https://transnationtitle.com/wp-content/uploads/pdfs/millage_rates/2025/OTTAWA-2025.PDF
 *     Allegan:  https://transnationtitle.com/wp-content/uploads/pdfs/millage_rates/2025/ALLEGAN-2025.PDF
 *     Muskegon: https://transnationtitle.com/wp-content/uploads/pdfs/millage_rates/2025/MUSKEGON-2025.PDF
 *   The Grand Rapids figure (51.1249) also matches the Realify research report.
 *   2026 tables were not found yet - when the counties publish 2026 rates, update `mills` below.
 *
 * What "verified" means here:
 *   verified: true  -> copied straight from the 2025 table above for that city + school district.
 *   verified: false -> an estimate (for example the county fallbacks). Treat with caution.
 *
 * IMPORTANT LIMITS (tell clients):
 *   - Rates differ by SCHOOL DISTRICT inside the same city. We list the main district; the
 *     `otherDistricts` notes show the range. Always check the parcel's actual tax bill/district.
 *   - The website matches by the listing's MAILING city. A "Grand Rapids" mailing address can
 *     actually be in Grand Rapids Township, Plainfield Township, etc. Confirm on the parcel.
 *   - Village taxes (small villages) and special assessments are NOT included.
 *
 * HOW TO EDIT: change a `mills` number, or copy a line to add a new city. Keep the commas.
 */
var MILLAGE = {
  taxYear: 2025,
  sevRatio: 0.5,             // taxable value after sale is about 50% of price (Michigan SEV rule)
  source: "Transnation Title 2025 county millage tables (from county & township records)",
  retrieved: "2026-11-12",

  // ---------- Cities and townships ----------
  // mills = TOTAL NON-HOMESTEAD (rental) millage.  homesteadMills = what an owner-occupant pays (for comparison).
  jurisdictions: {
    // ===== KENT COUNTY =====
    "Grand Rapids":       { county: "Kent", mills: 51.1249, homesteadMills: 33.1249, schoolDistrict: "Grand Rapids PS", verified: true,
                            otherDistricts: "Godwin Hts 52.39, Kenowa Hills 51.94, Kentwood 52.81, Grandville 53.68, Caledonia 54.27, Forest Hills 54.31" },
    "Wyoming":            { county: "Kent", mills: 58.6915, homesteadMills: 40.6915, schoolDistrict: "Wyoming PS", verified: true,
                            otherDistricts: "Grand Rapids PS 56.43, Godwin Hts 57.70, Kentwood 58.12, Grandville 58.98, Byron 60.54, Kelloggsville 60.89, Godfrey-Lee 68.99" },
    "Kentwood":           { county: "Kent", mills: 57.2228, homesteadMills: 39.2228, schoolDistrict: "Kentwood PS", verified: true,
                            otherDistricts: "Caledonia 58.69, Forest Hills about 58.72, Kelloggsville 59.99" },
    "Walker":             { county: "Kent", mills: 45.5054, homesteadMills: 27.5054, schoolDistrict: "Kenowa Hills", verified: true,
                            otherDistricts: "Grandville 47.24, Comstock Park 51.73" },
    "Grandville":         { county: "Kent", mills: 58.4496, homesteadMills: 40.4496, schoolDistrict: "Grandville PS", verified: true,
                            otherDistricts: "Wyoming PS 58.16" },
    "East Grand Rapids":  { county: "Kent", mills: 65.4995, homesteadMills: 47.4995, schoolDistrict: "East Grand Rapids PS", verified: true },
    "Rockford":           { county: "Kent", mills: 60.2638, homesteadMills: 42.2638, schoolDistrict: "Rockford PS", verified: true },
    "Lowell":             { county: "Kent", mills: 61.7660, homesteadMills: 44.0208, schoolDistrict: "Lowell Area Schools", verified: true },
    "Cedar Springs":      { county: "Kent", mills: 61.5428, homesteadMills: 44.2153, schoolDistrict: "Cedar Springs PS", verified: true },
    "Byron Township":     { county: "Kent", mills: 48.5896, homesteadMills: 30.5896, schoolDistrict: "Byron Center PS", verified: true,
                            otherDistricts: "Grandville 47.03, Kentwood 46.16" },
    "Gaines Township":    { county: "Kent", mills: 48.3808, homesteadMills: 30.3808, schoolDistrict: "Byron Center PS", verified: true,
                            otherDistricts: "Caledonia 47.42, Kentwood 45.96" },
    "Caledonia Township": { county: "Kent", mills: 47.8122, homesteadMills: 29.8122, schoolDistrict: "Caledonia", verified: true },
    "Plainfield Township":{ county: "Kent", mills: 50.4003, homesteadMills: 32.4003, schoolDistrict: "Northview", verified: true,
                            otherDistricts: "Kenowa Hills 46.95, Rockford 50.64, Comstock Park 53.18" },
    "Alpine Township":    { county: "Kent", mills: 47.5884, homesteadMills: 29.5884, schoolDistrict: "Kenowa Hills", verified: true,
                            otherDistricts: "Sparta 51.07, Comstock Park 53.81" },
    "Ada Township":       { county: "Kent", mills: 49.4954, homesteadMills: 31.4954, schoolDistrict: "Forest Hills", verified: true },
    "Grand Rapids Township": { county: "Kent", mills: 46.6560, homesteadMills: 28.6560, schoolDistrict: "Forest Hills", verified: true,
                            otherDistricts: "Northview 47.74, East Grand Rapids 51.41" },

    // ===== OTTAWA COUNTY =====
    "Holland":            { county: "Ottawa", mills: 59.9411, homesteadMills: 41.9411, schoolDistrict: "Holland PS", verified: true,
                            otherDistricts: "Zeeland PS 61.20. (Part of Holland is in Allegan County - see the next line.)" },
    "Zeeland":            { county: "Ottawa", mills: 55.8592, homesteadMills: 37.8592, schoolDistrict: "Zeeland PS", verified: true },
    "Grand Haven":        { county: "Ottawa", mills: 52.0702, homesteadMills: 34.0702, schoolDistrict: "Grand Haven Area PS", verified: true },
    "Hudsonville":        { county: "Ottawa", mills: 54.9045, homesteadMills: 36.9045, schoolDistrict: "Hudsonville PS", verified: true },
    "Ferrysburg":         { county: "Ottawa", mills: 47.5769, homesteadMills: 29.5769, schoolDistrict: "Grand Haven Area PS", verified: true },
    "Coopersville":       { county: "Ottawa", mills: 58.2525, homesteadMills: 40.4217, schoolDistrict: "Coopersville", verified: true },
    "Georgetown Township":{ county: "Ottawa", mills: 46.4349, homesteadMills: 28.4349, schoolDistrict: "Jenison PS", verified: true,
                            otherDistricts: "Hudsonville 45.92, Grandville 45.05" },
    "Allendale Township": { county: "Ottawa", mills: 50.4271, homesteadMills: 32.4271, schoolDistrict: "Allendale PS", verified: true },
    "Jamestown Township": { county: "Ottawa", mills: 47.9568, homesteadMills: 29.9568, schoolDistrict: "Hudsonville PS", verified: true },
    "Holland Township":   { county: "Ottawa", mills: 49.8015, homesteadMills: 31.8015, schoolDistrict: "West Ottawa PS", verified: true,
                            otherDistricts: "Holland PS 49.98, Zeeland 51.24" },
    "Park Township":      { county: "Ottawa", mills: 48.0353, homesteadMills: 30.0353, schoolDistrict: "West Ottawa PS", verified: true,
                            otherDistricts: "Holland PS 48.22" },
    "Zeeland Township":   { county: "Ottawa", mills: 50.3440, homesteadMills: 32.3440, schoolDistrict: "Zeeland PS", verified: true },
    "Blendon Township":   { county: "Ottawa", mills: 46.6926, homesteadMills: 28.6926, schoolDistrict: "Hudsonville PS", verified: true },
    "Spring Lake Township": { county: "Ottawa", mills: 46.9956, homesteadMills: 28.9956, schoolDistrict: "Spring Lake PS", verified: true,
                            otherDistricts: "Inside Spring Lake Village 57.36" },
    "Grand Haven Township": { county: "Ottawa", mills: 43.3377, homesteadMills: 25.3377, schoolDistrict: "Grand Haven Area PS", verified: true },

    // ===== ALLEGAN COUNTY =====
    "Allegan":            { county: "Allegan", mills: 62.9825, homesteadMills: 44.0789, schoolDistrict: "Allegan PS", verified: true },
    "Otsego":             { county: "Allegan", mills: 61.8254, homesteadMills: 43.8254, schoolDistrict: "Otsego PS", verified: true },
    "Plainwell":          { county: "Allegan", mills: 63.5422, homesteadMills: 45.5422, schoolDistrict: "Plainwell", verified: true },
    "Wayland":            { county: "Allegan", mills: 61.8340, homesteadMills: 43.8340, schoolDistrict: "Wayland Union", verified: true },
    "Saugatuck":          { county: "Allegan", mills: 58.7109, homesteadMills: 40.7109, schoolDistrict: "Saugatuck PS", verified: true },
    "Douglas":            { county: "Allegan", mills: 58.5525, homesteadMills: 40.5525, schoolDistrict: "Saugatuck PS", verified: true },
    "Fennville":          { county: "Allegan", mills: 58.8900, homesteadMills: 40.8900, schoolDistrict: "Fennville", verified: true },
    "Holland (Allegan County part)": { county: "Allegan", mills: 61.5389, homesteadMills: 43.5389, schoolDistrict: "Holland PS", verified: true,
                            otherDistricts: "Hamilton 58.21" },

    // ===== MUSKEGON COUNTY =====
    "Muskegon":           { county: "Muskegon", mills: 60.7984, homesteadMills: 42.7984, schoolDistrict: "Muskegon PS", verified: true,
                            otherDistricts: "Reeths-Puffer 60.76, Orchard View 61.20" },
    "Muskegon Heights":   { county: "Muskegon", mills: 61.0182, homesteadMills: 43.5327, schoolDistrict: "Muskegon Heights", verified: true,
                            otherDistricts: "Mona Shores 69.05" },
    "Norton Shores":      { county: "Muskegon", mills: 57.2562, homesteadMills: 39.2562, schoolDistrict: "Mona Shores", verified: true,
                            otherDistricts: "Grand Haven 52.16, Muskegon PS 59.48" },
    "Roosevelt Park":     { county: "Muskegon", mills: 63.7944, homesteadMills: 45.7944, schoolDistrict: "Mona Shores", verified: true },
    "North Muskegon":     { county: "Muskegon", mills: 61.0992, homesteadMills: 43.0992, schoolDistrict: "North Muskegon", verified: true },
    "Whitehall":          { county: "Muskegon", mills: 49.1791, homesteadMills: 41.6816, schoolDistrict: "Whitehall", verified: true },
    "Montague":           { county: "Muskegon", mills: 66.4706, homesteadMills: 48.4706, schoolDistrict: "Montague", verified: true },
    "Muskegon Township":  { county: "Muskegon", mills: 57.2834, schoolDistrict: "Muskegon PS", verified: true,
                            otherDistricts: "Orchard View 56.38, Reeths-Puffer 55.94" },
    "Fruitport Township": { county: "Muskegon", mills: 50.2441, homesteadMills: 32.2441, schoolDistrict: "Fruitport", verified: true,
                            otherDistricts: "Mona Shores 50.86" }
  },

  // ---------- Mailing names that are not the tax jurisdiction ----------
  // Many mailing "cities" are really unincorporated areas inside a township.
  // Left side = what a listing might say; right side = the jurisdiction name above.
  aliases: {
    "Byron Center": "Byron Township",
    "Jenison": "Georgetown Township",
    "Allendale": "Allendale Township",
    "Jamestown": "Jamestown Township",
    "Comstock Park": "Plainfield Township",
    "Ada": "Ada Township",
    "Caledonia": "Caledonia Township",   // the Village of Caledonia adds ~7.9 mills on top (not included)
    "Spring Lake": "Spring Lake Township",
    "Fruitport": "Fruitport Township",
    "Wyoming Twp": "Wyoming"
  },

  // ---------- County fallbacks (used when we don't recognize the city) ----------
  // NOT verified: these are rounded "middle-to-high" values from the 2025 tables above,
  // chosen to lean conservative (a little high) so we don't understate costs.
  countyFallback: {
    Kent:     { mills: 54.0, verified: false, note: "Estimate. Kent 2025 rental rates run ~45 (townships) to ~65 (East GR); cities mostly 51-61." },
    Ottawa:   { mills: 52.0, verified: false, note: "Estimate. Ottawa 2025 rental rates run ~43 (townships) to ~61 (Holland/Zeeland PS); cities mostly 52-60." },
    Allegan:  { mills: 56.0, verified: false, note: "Estimate. Allegan 2025 rental rates run ~42 (townships) to ~64 (cities)." },
    Muskegon: { mills: 58.0, verified: false, note: "Estimate. Muskegon 2025 rental rates run ~44 (townships) to ~69 (Muskegon Hts/Mona Shores)." }
  },

  // Used only if both the city and the county are unknown. NOT verified.
  defaultMills: 55.0
};

if (typeof module !== "undefined") module.exports = MILLAGE;
