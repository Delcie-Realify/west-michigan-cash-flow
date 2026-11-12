/*
 * SITE SETTINGS — the one file Delcie edits.
 * --------------------------------------------
 * Everything in square brackets [like this] is a placeholder. Replace it with the
 * real text (keep the quote marks around it). Leave a setting as "" to hide it.
 *
 * Most important:
 *   LEAD_FORM_URL — paste your Google Apps Script "Web app URL" here
 *   (see lead-form/SETUP.md). While it is empty, the contact forms on the site
 *   show a friendly "form not connected yet" note instead of sending.
 */
var SITE_CONFIG = {
  // Paste the Web app URL between the quotes, e.g. "https://script.google.com/macros/s/AKfy.../exec"
  LEAD_FORM_URL: "",

  // How the form talks to Google:
  //   "cors"    (recommended) — the site reads Google's reply, so visitors see a real
  //             error message if something is misconfigured.
  //   "no-cors" — fire-and-forget. Always "succeeds" in the browser, even when the
  //             script is broken, so only use it if "cors" ever stops working.
  LEAD_FORM_MODE: "cors",

  agentName: "Delcie Mortimore",
  brokerage: "Realify Properties",
  agentTitle: "[Delcie's title, e.g. REALTOR®]",
  phone: "[phone]",
  email: "[email]",
  licenseLine: "[Michigan real estate license # — fill in]",
  officeAddress: "[Realify Properties office address]",
  brokerageUrl: "https://realifyproperties.com/",

  // MLS / IDX disclaimer. MUST be replaced with MichRIC's exact required wording before
  // real MLS listings are shown on this site.
  mlsDisclaimer:
    "[PLACEHOLDER — finalize with MichRIC's required IDX wording] Listing information is " +
    "deemed reliable but not guaranteed and should be independently verified. Listings " +
    "courtesy of the listing office shown on each property, via MichRIC. Data last updated [date].",

  // While this is true, every page says the listings are hypothetical sample data.
  usingMockData: true
};
if (typeof module !== "undefined") module.exports = SITE_CONFIG;
