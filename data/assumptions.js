/*
 * REALIFY DEFAULT ASSUMPTIONS  (Delcie: this is the file to edit!)
 * =================================================================
 * Every number the website uses to judge a deal starts here. Visitors can change most of
 * them on the site, but these are the starting values everyone sees.
 *
 * How to edit safely:
 *   - Change only the number after the colon. Keep the comma at the end of the line.
 *   - Percentages are written as decimals: 0.25 = 25%, 0.05 = 5%, 0.07875 = 7.875%.
 *   - Dollar amounts are plain numbers with no $ or commas: 1500, not $1,500.
 *   - After editing, open the website and check a listing still shows numbers.
 *
 * Last reviewed: November 12, 2026.
 */
var ASSUMPTIONS = {
  asOf: "2026-11-12",

  // ---------------- LOAN ----------------
  // Share of the price paid in cash up front. 25% is the usual minimum for investment
  // loans, and REQUIRED for 2-4 unit buildings on conventional investor loans.
  // Source: The Mortgage Reports, investment property rates (Nov 2026).
  downPaymentPct: 0.25,

  // Yearly interest rate on a 30-year fixed investment-property loan.
  // How we got 7.875%: Freddie Mac's weekly survey (PMMS) showed the 30-year average at
  // 7.18% on Nov 5, 2026 (freddiemac.com/pmms; reported by AP/WCAX and RISMedia, Nov 5, 2026).
  // Investment-property loans price about 0.5-1.0 point higher than that
  // (The Mortgage Reports: 7.73-8.23% even with 40% down). 7.18% + ~0.7 = 7.875%,
  // the same figure as the Realify research report (Appendix B, 25% down).
  // This is NOT a lender quote - replace it with a real quote when you have one.
  interestRate: 0.07875,

  termYears: 30,               // length of the loan in years

  // Closing costs (title, lender fees, prepaid items) as a share of price.
  // 3% matches the Realify research report (Appendix B).
  closingCostPct: 0.03,

  // Lender "points" (prepaid interest), as a share of the LOAN amount. 0 = none.
  loanPointsPct: 0,

  // Mortgage insurance (PMI) - only charged if the down payment is under 20%.
  // Yearly cost as a share of the loan. Rough industry estimate - not verified for investors.
  pmiAnnualPct: 0.0075,

  // Extra cash set aside at purchase for fix-ups, as a share of price. 0 = none.
  // (If a listing has its own rehab estimate, that is used instead.)
  rehabReservePct: 0,

  // ---------------- RESERVES (share of GROSS rent) ----------------
  // Delcie's chosen defaults: 5% / 5% / 5%.
  // For context: practitioners often use ~8% vacancy and 6-15% capital reserves for older
  // homes (Evernest; rentalrealestate.com - see the research report). The "Conservative"
  // preset uses 8/8/8.
  vacancyPct: 0.05,            // rent lost to empty months and unpaid rent
  repairsPct: 0.05,            // everyday repairs (leaky faucet, broken window)
  capexPct: 0.05,              // big-ticket replacements saved up over time (roof, furnace, water heater)

  // ---------------- MANAGEMENT ----------------
  // Default = SELF-MANAGED (0%). The site has a switch for professional management.
  managementPct: 0,            // share of COLLECTED rent paid to a manager
  leasingFeeMonths: 0,         // months of rent paid to a manager each time a new tenant signs

  // Values used when the "professional management" switch is ON.
  // 9%: a Grand Rapids manager advertises 9% of rent (Thumbtack, via research report);
  // typical range 8-10%.
  proManagementPct: 0.09,
  // Leasing fee: about 3/4 of one month's rent per new tenant. Common industry range is
  // 50-100% of a month's rent - NOT verified for West Michigan; confirm with local managers.
  proLeasingFeeMonths: 0.75,
  // How long a typical tenant stays. The leasing fee is spread over this many years.
  // Estimate - not verified.
  averageTenancyYears: 2,

  // ---------------- INSURANCE (landlord policy, per year) ----------------
  // Michigan landlord insurance runs roughly $1,000-$3,700 a year (rentalrealestate.com,
  // Policygenius, Hippo - via research report). Our formula reproduces the research
  // report's figures: $1,500 for a $200k house, ~$2,475 for a $350k duplex, ~$3,750 for a
  // $500k fourplex:
  //     yearly insurance = baseAnnual + pctOfPrice x price + perExtraUnitAnnual x (units - 1)
  // Condos only need an "HO-6" policy (the HOA insures the building), so condos/townhomes
  // pay condoFactor x the formula (estimate - not verified).
  // To use ONE fixed number for every property instead, put it in insuranceAnnual (e.g. 1800).
  insuranceAnnual: null,
  insurance: {
    baseAnnual: 600,
    pctOfPrice: 0.0045,
    perExtraUnitAnnual: 300,
    condoFactor: 0.4
  },

  // ---------------- UTILITIES THE OWNER PAYS (per unit, per month) ----------------
  // Single-family/condo: tenant usually pays everything -> $0.
  // 2-4 units in Grand Rapids: owner often pays water/sewer (shared meter). The city projects
  // a typical household bill of just over $215 per quarter for 2026 (WGVU, Nov 17, 2025)
  // -> about $70 per unit per month. Trash/common-area electric not included.
  ownerPaidUtilitiesPerUnitMonthly: {
    single_family: 0,
    condo: 0,
    townhouse: 0,
    duplex: 70,
    triplex: 70,
    fourplex: 70
  },

  // ---------------- OTHER COSTS ----------------
  // Rental registration / certification / inspection fees, per unit per month.
  // Wyoming charges $175/unit and Kentwood $80/unit for inspections (research report);
  // $10/month (~$120/yr) is a rough average - estimate, confirm city by city.
  otherPerUnitMonthly: 10,

  // HOA dues come from each listing (hoaMonthly). Nothing to set here.

  // ---------------- PROPERTY TAX ----------------
  // Investor tax = price x sevRatio x rental millage / 1000. Millage comes from data/millage.js.
  sevRatio: 0.5,               // Michigan: taxable value uncaps to ~50% of price after a sale
  millageOverride: null,       // put a number here (e.g. 52) to force one rate everywhere

  // ---------------- PASS / FAIL RULES ----------------
  // A listing "passes" only if it meets BOTH of these (Delcie's rule).
  minPerDoor: 200,             // at least $200 cash flow per unit per month
  minCashOnCash: 0.08          // at least 8% yearly return on the cash invested
};

if (typeof module !== "undefined") module.exports = ASSUMPTIONS;
