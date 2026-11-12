/*
 * HUD FAIR MARKET RENTS (FMR) — West Michigan (Kent, Ottawa, Allegan, Muskegon)
 * ---------------------------------------------------------------------------
 * These are REAL numbers published by the U.S. Dept. of Housing and Urban
 * Development (HUD). Nothing here was estimated or made up.
 *
 * WHAT THEY ARE: HUD's estimate of a typical "40th percentile" monthly rent
 * INCLUDING essential utilities (gross rent) for a standard-quality unit.
 * They're a conservative, public starting point — not a market-rent opinion.
 * Delcie's own ZIP x bedroom rent table can replace these later.
 *
 * WHICH YEAR: FY2026 (effective October 1, 2025 – September 30, 2026).
 *   HUD has already published FY2027 FMRs (effective Oct 1, 2026, Federal
 *   Register doc. 2026-17891), but huduser.gov blocked automated downloads
 *   when this file was built, and HUD's official open-data service still
 *   carries FY2026. => UPDATE THIS FILE TO FY2027 (see `notes`).
 *
 * WHERE THEY CAME FROM (official HUD data service, owner "HUD.Official.Content"):
 *   ZIP-level Small Area FMRs:
 *     https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/HUD_PDR_Small_Area_Fair_Market_Rents/FeatureServer/1
 *   Metro / county FMRs:
 *     https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Fair_Market_Rents/FeatureServer/0
 *   HUD's human-readable FMR home page: https://www.huduser.gov/portal/datasets/fmr.html
 *   Both layers were last edited by HUD on Oct 1, 2025 (the FY2026 release).
 *   Cross-checks: metro 2BR $1,531 (Grand Rapids-Wyoming) and ZIP values for
 *   49503/49507 match third-party sites labeling them "FY2026", and match the
 *   3BR "rent anchors" in "Grand Rapids cash flow rentals.md".
 *
 * HOW TO READ IT:
 *   byZip["49507"][3]  = HUD Small Area FMR for a 3-bedroom in ZIP 49507.
 *   byCounty.Kent[2]   = HUD area-wide FMR for a 2-bedroom (fallback when a
 *                        ZIP isn't in byZip). Keys 0..4 = bedrooms (0 = studio).
 *   For 5+ bedrooms HUD's rule is: 4BR rent x 1.15 per extra bedroom.
 *
 * COVERAGE: 95 ZIPs = every ZIP HUD lists in the four HUD rent areas that
 * cover our counties. Some border ZIPs reach into neighboring counties
 * (e.g. 48809 Belding, 48838 Greenville are in the Grand Rapids HUD area but
 * outside our 4 counties) — harmless extras. `zipAreas` shows which HUD
 * area(s) each ZIP sits in; a ZIP in several areas has the same rents in each.
 */
var HUD_RENTS = {
  source: "U.S. HUD Office of Policy Development & Research — FY2026 Small Area Fair Market Rents (by ZIP) and FY2026 Fair Market Rents (by metro/county), via HUD's official ArcGIS open-data feature services",
  fiscalYear: 2026,
  effectiveDate: "2025-10-01",
  expiresDate: "2026-09-30",
  url: "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/HUD_PDR_Small_Area_Fair_Market_Rents/FeatureServer/1",
  countyUrl: "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Fair_Market_Rents/FeatureServer/0",
  hudHomePage: "https://www.huduser.gov/portal/datasets/fmr.html",
  retrievedOn: "2026-11-12",
  rentIncludesUtilities: true,

  notes: [
    "All values were downloaded directly from HUD's official data service on 2026-11-12. None were typed in by hand or estimated.",
    "These are FY2026 numbers. HUD's FY2027 FMRs (effective 2026-10-01) are published, but could not be downloaded automatically (huduser.gov blocks scripts). Replace with FY2027 when possible — HUD says FY2027 FMRs rose about 2% nationally on average, so FY2026 numbers likely run slightly low.",
    "FMRs are GROSS rents (rent + tenant utilities). If tenants pay their own utilities, the contract rent a landlord collects is usually somewhat lower.",
    "Allegan County is its own HUD area (code NCNTY26005N26005); HUD's table still lists ZIP-level rents for it, which are used here.",
    "Ottawa County = HUD's 'Holland-Grand Haven, MI HUD Metro FMR Area'. Kent County = 'Grand Rapids-Wyoming, MI HUD Metro FMR Area' (which also covers some neighboring-county ZIPs)."
  ],

  // HUD rent areas used below (code -> name)
  areas: {
    "METRO24340M24340": "Grand Rapids-Wyoming, MI HUD Metro FMR Area",
    "METRO24340M26100": "Holland-Grand Haven, MI HUD Metro FMR Area",
    "METRO34740M34740": "Muskegon-Norton Shores, MI MSA",
    "NCNTY26005N26005": "Allegan County, MI"
  },

  // ZIP-level Small Area FMRs (monthly $, by bedrooms 0-4). HUD rounds these to $10.
  byZip: {
    "48809": { 0: 1050, 1: 1090, 2: 1300, 3: 1700, 4: 1900 },
    "48815": { 0: 1050, 1: 1090, 2: 1300, 3: 1700, 4: 1860 },
    "48838": { 0: 1050, 1: 1090, 2: 1300, 3: 1700, 4: 1860 },
    "49010": { 0: 920, 1: 920, 2: 1210, 3: 1510, 4: 1680 },
    "49026": { 0: 770, 1: 800, 2: 1050, 3: 1380, 4: 1450 },
    "49055": { 0: 770, 1: 850, 2: 1110, 3: 1460, 4: 1530 },
    "49056": { 0: 770, 1: 770, 2: 1000, 3: 1280, 4: 1350 },
    "49070": { 0: 860, 1: 870, 2: 1140, 3: 1420, 4: 1580 },
    "49078": { 0: 1070, 1: 1080, 2: 1410, 3: 1770, 4: 1960 },
    "49080": { 0: 880, 1: 900, 2: 1170, 3: 1480, 4: 1650 },
    "49090": { 0: 770, 1: 820, 2: 1070, 3: 1400, 4: 1480 },
    "49301": { 0: 1850, 1: 1920, 2: 2300, 3: 2970, 4: 3290 },
    "49302": { 0: 1180, 1: 1230, 2: 1470, 3: 1900, 4: 2100 },
    "49303": { 0: 1050, 1: 1090, 2: 1300, 3: 1700, 4: 1860 },
    "49306": { 0: 1400, 1: 1450, 2: 1740, 3: 2240, 4: 2480 },
    "49315": { 0: 1340, 1: 1400, 2: 1680, 3: 2170, 4: 2400 },
    "49316": { 0: 1370, 1: 1420, 2: 1720, 3: 2220, 4: 2460 },
    "49318": { 0: 1080, 1: 1190, 2: 1520, 3: 1860, 4: 2060 },
    "49319": { 0: 1120, 1: 1160, 2: 1390, 3: 1800, 4: 1990 },
    "49321": { 0: 1080, 1: 1120, 2: 1340, 3: 1730, 4: 1920 },
    "49323": { 0: 1050, 1: 1090, 2: 1310, 3: 1700, 4: 1860 },
    "49325": { 0: 1050, 1: 1090, 2: 1300, 3: 1700, 4: 1860 },
    "49326": { 0: 1050, 1: 1090, 2: 1300, 3: 1700, 4: 1860 },
    "49327": { 0: 1050, 1: 1090, 2: 1300, 3: 1700, 4: 1860 },
    "49328": { 0: 770, 1: 770, 2: 1000, 3: 1280, 4: 1360 },
    "49330": { 0: 1220, 1: 1270, 2: 1520, 3: 1970, 4: 2170 },
    "49331": { 0: 1140, 1: 1190, 2: 1440, 3: 1850, 4: 2090 },
    "49333": { 0: 1190, 1: 1200, 2: 1570, 3: 2040, 4: 2370 },
    "49335": { 0: 1040, 1: 1050, 2: 1370, 3: 1720, 4: 1930 },
    "49341": { 0: 1340, 1: 1390, 2: 1670, 3: 2160, 4: 2390 },
    "49343": { 0: 1050, 1: 1090, 2: 1300, 3: 1700, 4: 1860 },
    "49344": { 0: 1130, 1: 1140, 2: 1490, 3: 1900, 4: 2160 },
    "49345": { 0: 1050, 1: 1090, 2: 1300, 3: 1700, 4: 1860 },
    "49347": { 0: 1050, 1: 1120, 2: 1330, 3: 1700, 4: 1860 },
    "49348": { 0: 1060, 1: 1090, 2: 1400, 3: 1760, 4: 1980 },
    "49351": { 0: 1230, 1: 1280, 2: 1530, 3: 1980, 4: 2190 },
    "49401": { 0: 1160, 1: 1470, 2: 1680, 3: 2130, 4: 2500 },
    "49403": { 0: 1050, 1: 1100, 2: 1340, 3: 1700, 4: 1890 },
    "49404": { 0: 920, 1: 1160, 2: 1330, 3: 1680, 4: 1960 },
    "49406": { 0: 790, 1: 800, 2: 1040, 3: 1310, 4: 1450 },
    "49408": { 0: 810, 1: 820, 2: 1070, 3: 1340, 4: 1490 },
    "49409": { 0: 1040, 1: 1310, 2: 1500, 3: 1900, 4: 2220 },
    "49412": { 0: 720, 1: 800, 2: 1040, 3: 1290, 4: 1380 },
    "49415": { 0: 980, 1: 1080, 2: 1410, 3: 1700, 4: 1880 },
    "49417": { 0: 1000, 1: 1270, 2: 1450, 3: 1840, 4: 2150 },
    "49418": { 0: 1210, 1: 1300, 2: 1550, 3: 2000, 4: 2230 },
    "49419": { 0: 1040, 1: 1050, 2: 1380, 3: 1720, 4: 1920 },
    "49422": { 0: 1050, 1: 1330, 2: 1520, 3: 1930, 4: 2260 },
    "49423": { 0: 1050, 1: 1240, 2: 1480, 3: 1870, 4: 2150 },
    "49424": { 0: 1030, 1: 1320, 2: 1500, 3: 1910, 4: 2230 },
    "49425": { 0: 720, 1: 800, 2: 1040, 3: 1270, 4: 1380 },
    "49426": { 0: 1100, 1: 1390, 2: 1590, 3: 2020, 4: 2360 },
    "49428": { 0: 1080, 1: 1370, 2: 1560, 3: 1980, 4: 2320 },
    "49429": { 0: 1050, 1: 1330, 2: 1520, 3: 1930, 4: 2260 },
    "49430": { 0: 880, 1: 1120, 2: 1280, 3: 1620, 4: 1890 },
    "49434": { 0: 1040, 1: 1270, 2: 1490, 3: 1880, 4: 2180 },
    "49435": { 0: 1050, 1: 1090, 2: 1300, 3: 1700, 4: 1860 },
    "49437": { 0: 720, 1: 800, 2: 1040, 3: 1270, 4: 1380 },
    "49440": { 0: 720, 1: 800, 2: 1040, 3: 1270, 4: 1380 },
    "49441": { 0: 920, 1: 1000, 2: 1310, 3: 1580, 4: 1730 },
    "49442": { 0: 810, 1: 880, 2: 1150, 3: 1390, 4: 1520 },
    "49443": { 0: 860, 1: 930, 2: 1220, 3: 1470, 4: 1610 },
    "49444": { 0: 900, 1: 980, 2: 1290, 3: 1550, 4: 1710 },
    "49445": { 0: 1020, 1: 1110, 2: 1460, 3: 1760, 4: 1930 },
    "49448": { 0: 860, 1: 1080, 2: 1230, 3: 1580, 4: 1800 },
    "49450": { 0: 970, 1: 980, 2: 1280, 3: 1600, 4: 1780 },
    "49451": { 0: 860, 1: 1080, 2: 1240, 3: 1580, 4: 1800 },
    "49453": { 0: 770, 1: 770, 2: 1000, 3: 1280, 4: 1380 },
    "49456": { 0: 1040, 1: 1310, 2: 1500, 3: 1900, 4: 2220 },
    "49457": { 0: 880, 1: 960, 2: 1260, 3: 1520, 4: 1670 },
    "49460": { 0: 1140, 1: 1460, 2: 1660, 3: 2110, 4: 2470 },
    "49461": { 0: 790, 1: 860, 2: 1130, 3: 1360, 4: 1500 },
    "49464": { 0: 940, 1: 1190, 2: 1360, 3: 1720, 4: 2010 },
    "49468": { 0: 1230, 1: 1280, 2: 1530, 3: 1980, 4: 2190 },
    "49501": { 0: 1230, 1: 1280, 2: 1530, 3: 1980, 4: 2190 },
    "49503": { 0: 1300, 1: 1340, 2: 1610, 3: 2080, 4: 2300 },
    "49504": { 0: 1150, 1: 1190, 2: 1430, 3: 1850, 4: 2040 },
    "49505": { 0: 1260, 1: 1310, 2: 1570, 3: 2030, 4: 2240 },
    "49506": { 0: 1370, 1: 1420, 2: 1700, 3: 2200, 4: 2430 },
    "49507": { 0: 1230, 1: 1280, 2: 1530, 3: 1980, 4: 2190 },
    "49508": { 0: 1250, 1: 1290, 2: 1550, 3: 2000, 4: 2220 },
    "49509": { 0: 1060, 1: 1100, 2: 1320, 3: 1710, 4: 1890 },
    "49510": { 0: 1230, 1: 1280, 2: 1530, 3: 1980, 4: 2190 },
    "49512": { 0: 1230, 1: 1280, 2: 1530, 3: 1980, 4: 2190 },
    "49514": { 0: 1230, 1: 1280, 2: 1530, 3: 1980, 4: 2190 },
    "49515": { 0: 1230, 1: 1280, 2: 1530, 3: 1980, 4: 2190 },
    "49516": { 0: 1230, 1: 1280, 2: 1530, 3: 1980, 4: 2190 },
    "49518": { 0: 1230, 1: 1280, 2: 1530, 3: 1980, 4: 2190 },
    "49519": { 0: 1200, 1: 1240, 2: 1490, 3: 1930, 4: 2130 },
    "49525": { 0: 1460, 1: 1510, 2: 1810, 3: 2340, 4: 2590 },
    "49534": { 0: 1180, 1: 1300, 2: 1530, 3: 1970, 4: 2210 },
    "49544": { 0: 1170, 1: 1210, 2: 1450, 3: 1870, 4: 2070 },
    "49546": { 0: 1340, 1: 1390, 2: 1670, 3: 2160, 4: 2390 },
    "49548": { 0: 1150, 1: 1190, 2: 1430, 3: 1850, 4: 2040 },
    "49588": { 0: 1230, 1: 1280, 2: 1530, 3: 1980, 4: 2190 },
  },

  // Area-wide FMRs used as a fallback when a ZIP is missing (monthly $, by bedrooms 0-4).
  byCounty: {
    Kent:     { 0: 1232, 1: 1278, 2: 1531, 3: 1980, 4: 2189 },  // Grand Rapids-Wyoming HUD Metro FMR Area
    Ottawa:   { 0: 1047, 1: 1333, 2: 1519, 3: 1930, 4: 2256 },  // Holland-Grand Haven HUD Metro FMR Area
    Allegan:  { 0: 959,  1: 966,  2: 1267, 3: 1583, 4: 1761 },  // Allegan County, MI
    Muskegon: { 0: 866,  1: 942,  2: 1236, 3: 1490, 4: 1636 }   // Muskegon-Norton Shores MSA
  },

  // Which HUD area(s) each ZIP belongs to (for reference / the "How we calculate" page).
  zipAreas: {
    "48809": ["METRO24340M24340"],
    "48815": ["METRO24340M24340"],
    "48838": ["METRO24340M24340"],
    "49010": ["NCNTY26005N26005"],
    "49026": ["NCNTY26005N26005"],
    "49055": ["NCNTY26005N26005"],
    "49056": ["NCNTY26005N26005"],
    "49070": ["NCNTY26005N26005"],
    "49078": ["NCNTY26005N26005"],
    "49080": ["NCNTY26005N26005"],
    "49090": ["NCNTY26005N26005"],
    "49301": ["METRO24340M24340"],
    "49302": ["METRO24340M24340"],
    "49303": ["METRO24340M24340", "METRO34740M34740"],
    "49306": ["METRO24340M24340"],
    "49315": ["METRO24340M24340", "METRO24340M26100", "NCNTY26005N26005"],
    "49316": ["METRO24340M24340", "NCNTY26005N26005"],
    "49318": ["METRO24340M24340", "METRO24340M26100", "METRO34740M34740"],
    "49319": ["METRO24340M24340"],
    "49321": ["METRO24340M24340"],
    "49323": ["METRO24340M24340", "METRO24340M26100", "NCNTY26005N26005"],
    "49325": ["METRO24340M24340"],
    "49326": ["METRO24340M24340"],
    "49327": ["METRO24340M24340", "METRO34740M34740"],
    "49328": ["NCNTY26005N26005"],
    "49330": ["METRO24340M24340", "METRO24340M26100", "METRO34740M34740"],
    "49331": ["METRO24340M24340"],
    "49333": ["METRO24340M24340", "NCNTY26005N26005"],
    "49335": ["NCNTY26005N26005"],
    "49341": ["METRO24340M24340"],
    "49343": ["METRO24340M24340"],
    "49344": ["NCNTY26005N26005"],
    "49345": ["METRO24340M24340", "METRO24340M26100"],
    "49347": ["METRO24340M24340"],
    "49348": ["METRO24340M24340", "NCNTY26005N26005"],
    "49351": ["METRO24340M24340"],
    "49401": ["METRO24340M26100"],
    "49403": ["METRO24340M24340", "METRO24340M26100", "METRO34740M34740"],
    "49404": ["METRO24340M26100", "METRO34740M34740"],
    "49406": ["NCNTY26005N26005"],
    "49408": ["NCNTY26005N26005"],
    "49409": ["METRO24340M26100"],
    "49412": ["METRO34740M34740"],
    "49415": ["METRO24340M26100", "METRO34740M34740"],
    "49417": ["METRO24340M26100"],
    "49418": ["METRO24340M24340", "METRO24340M26100"],
    "49419": ["NCNTY26005N26005"],
    "49422": ["METRO24340M26100"],
    "49423": ["METRO24340M26100", "NCNTY26005N26005"],
    "49424": ["METRO24340M26100"],
    "49425": ["METRO34740M34740"],
    "49426": ["METRO24340M26100", "NCNTY26005N26005"],
    "49428": ["METRO24340M26100"],
    "49429": ["METRO24340M26100"],
    "49430": ["METRO24340M26100"],
    "49434": ["METRO24340M26100", "NCNTY26005N26005"],
    "49435": ["METRO24340M24340", "METRO24340M26100"],
    "49437": ["METRO34740M34740"],
    "49440": ["METRO34740M34740"],
    "49441": ["METRO34740M34740"],
    "49442": ["METRO34740M34740"],
    "49443": ["METRO34740M34740"],
    "49444": ["METRO34740M34740"],
    "49445": ["METRO34740M34740"],
    "49448": ["METRO24340M26100", "METRO34740M34740"],
    "49450": ["NCNTY26005N26005"],
    "49451": ["METRO24340M26100", "METRO34740M34740"],
    "49453": ["NCNTY26005N26005"],
    "49456": ["METRO24340M26100", "METRO34740M34740"],
    "49457": ["METRO34740M34740"],
    "49460": ["METRO24340M26100"],
    "49461": ["METRO34740M34740"],
    "49464": ["METRO24340M26100", "NCNTY26005N26005"],
    "49468": ["METRO24340M24340"],
    "49501": ["METRO24340M24340"],
    "49503": ["METRO24340M24340"],
    "49504": ["METRO24340M24340"],
    "49505": ["METRO24340M24340"],
    "49506": ["METRO24340M24340"],
    "49507": ["METRO24340M24340"],
    "49508": ["METRO24340M24340"],
    "49509": ["METRO24340M24340"],
    "49510": ["METRO24340M24340"],
    "49512": ["METRO24340M24340"],
    "49514": ["METRO24340M24340"],
    "49515": ["METRO24340M24340"],
    "49516": ["METRO24340M24340"],
    "49518": ["METRO24340M24340"],
    "49519": ["METRO24340M24340"],
    "49525": ["METRO24340M24340"],
    "49534": ["METRO24340M24340", "METRO24340M26100"],
    "49544": ["METRO24340M24340", "METRO24340M26100"],
    "49546": ["METRO24340M24340"],
    "49548": ["METRO24340M24340"],
    "49588": ["METRO24340M24340"],
  }
};

if (typeof module !== "undefined") module.exports = HUD_RENTS;
