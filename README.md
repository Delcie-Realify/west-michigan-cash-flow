# West Michigan Cash-Flow Rentals — Realify Properties

A Realify Properties website for real estate investors. It screens rental listings in Kent, Ottawa, Allegan and Muskegon counties and shows the ones that cash flow — at least **$200 per door per month** and **8% cash-on-cash** — with a full, editable calculator for every property.

**Status:** In development. All listings on the site are **fictional sample data** in MLS (RESO) format, until MichRIC data access is approved. Rents (HUD Fair Market Rents) and property-tax rates (2025 county millage) are real.

## Pages
| Page | What it shows |
|---|---|
| `index.html` | Listings with filters, sorting, Default/Aggressive presets |
| `property.html` | One property: editable calculator, monthly breakdown, Michigan tax explanation, contact form |
| `method.html` | "How we calculate" — plain-English methodology |
| `about.html` | About Delcie / Realify, contact form |

## Where things live
| File | What it does |
|---|---|
| `assets/config.js` | **Site settings Delcie edits** — contact info, lead-form URL, MLS disclaimer |
| `data/assumptions.js` | **Default calculator assumptions** — rate, down payment, reserves, insurance, etc. |
| `data/millage.js` | Non-homestead property-tax rates by city/township |
| `data/hud-rents.js` | HUD Fair Market Rents by ZIP and county |
| `data/mock-listings.js` | 40 fictional listings in RESO format (retired when the MLS feed is connected) |
| `js/cashflow.js` | The cash-flow engine |
| `js/reso-adapter.js` | Converts MLS (RESO) records into the format the site uses |
| `js/app.js`, `js/ui-*.js`, `assets/css/site.css` | The website's look and behavior |
| `lead-form/` | Google Apps Script for the contact form + setup steps (`SETUP.md`) |
| `docs/MLS-INTEGRATION.md` | How the MichRIC feed will be connected later |
| `tests/run-tests.sh` | Runs all tests: `sh tests/run-tests.sh` |
| `js/rent-estimator.js`, `data/sample-data.js` | Earlier comp-based rent estimator (kept for later use) |

## Roadmap
1. ~~Rent estimator~~ (done, sample data)
2. ~~Cash-flow calculator + website~~ (done, sample data)
3. Connect the lead form (Google Apps Script) and fill in contact details
4. Update HUD rents to FY2027
5. Daily automatic update from the MLS (after MichRIC access is approved)

Listing data will be displayed under MichRIC's IDX rules once connected. All figures are estimates — not financial, tax, or legal advice.
