# Connecting the Website to Real MLS Listings (MichRIC)

*For Delcie — a plain-English guide for later. Nothing here has been set up yet.*
*Written November 2026. Items marked **(confirm)** are things to verify with MichRIC or the vendor. They are not settled facts.*

---

## 1. Where things stand today

- The website shows **40 made-up sample listings** (`data/mock-listings.js`). Each one is labeled "Sample listing".
- Those sample records already use the **same field names a real MLS feed uses**. That standard is called the RESO Data Dictionary.
- The file `js/reso-adapter.js` translates MLS records into what the website needs. When real data arrives, it goes through the same translator, so the website itself shouldn't need changes.
- Rents come from **HUD Fair Market Rents** (`data/hud-rents.js`, FY2026). They should be updated to FY2027; see section 9.

---

## 2. How MichRIC data access works

**MichRIC** (Michigan Regional Information Center) is the shared MLS for the Grand Rapids board and roughly a dozen other West Michigan associations. Agents use it through **Flexmls**, which is made by a company called **FBS**.

FBS's developer service is called the **Spark Platform** (sparkplatform.com). It offers two ways to pull listings, and **one key works for both**:

| Option | What it is | Best for |
|---|---|---|
| **Spark API** | FBS's own format | Sites that only use one MLS |
| **RESO Web API** | The industry-standard format, at `.../Reso/OData/` | What our site is built for |

**What's likely, but needs confirming:**

- Because MichRIC runs on Flexmls, the feed most likely comes through **Spark**. **(confirm)**
- MichRIC has also delivered data through its own "CIC" (Computerized Information Center), using older RETS-style logins. **(confirm)** which method MichRIC uses today.
- The other big data vendors, **Bridge** (Zillow) and **Trestle** (CoreLogic/Cotality), do not appear to be MichRIC's main channel. **(confirm)**
- FBS documentation has said its RESO Web API uses Data Dictionary 1.6/1.7, not 2.x. The field names our site uses are the same in those versions, so this should not matter. **(confirm)** when we have a test key.
- MichRIC, Realcomp and MiRealSource have formed a joint organization. Data-sharing rules may change, so ask whether a feed covering several MLSs is available.

**How you get a key (typical Spark process):**

1. Ask MichRIC, or your board (Grand Rapids REALTORS®), for the **IDX agreement**. Your **broker must sign it**, since IDX access belongs to the brokerage.
2. Sign the **FBS/Spark developer agreement**, and buy or activate an **IDX data plan** for MichRIC in the Spark "Datamart". There is usually a monthly per-MLS fee. **(confirm the cost)**
3. MichRIC approves it. You then receive an **API key or access token**.

---

## 3. IDX vs. VOW vs. a data license: which one we need

| Type | Who can see the listings | Fits our site? |
|---|---|---|
| **IDX** (Internet Data Exchange) | **Anyone**, with no login. Shows other brokers' active listings. | **Yes, this is the one.** |
| **VOW** (Virtual Office Website) | Only registered users who log in and accept terms. Allows more data, such as sold listings. | Maybe later, for a "members area" with sold comps |
| **Back-office / data license** | Only you and your office. Not for public display. | No. It's for your own analysis tools. |

**Key IDX points (based on NAR's IDX policy; MichRIC's own rules may add more) (confirm):**

- **You may show only some listings** if you choose them by **objective criteria**, such as area, price, property type or number of units. Showing only listings that pass our cash-flow math should count as objective. **(confirm with MichRIC, since it's a computed filter)**
- **Our calculations are allowed as extra information.** They must be **clearly marked as ours, not MLS data**. The site already labels them "estimate, not financial advice".
- **You may not change** the MLS facts themselves (price, remarks and so on).
- Data must be **refreshed at least every 12 hours** (NAR rule). Stale or sold listings must disappear.
- Some sellers opt out of internet display, or of comments and valuations. Those listings must be hidden, or shown without our analysis. Check the RESO fields `InternetEntireListingDisplayYN`, `InternetAddressDisplayYN` and `InternetAutomatedValuationDisplayYN`.

---

## 4. How the automatic update would work (GitHub Action)

Our site is "static" (GitHub Pages), so it can't call the MLS while a visitor is on it. Instead, a small **scheduled robot** (a GitHub Action) runs on a timer:

```
Every few hours (e.g., 6am, noon, 6pm, midnight):
  1. FETCH   → ask MichRIC's API for active listings in our 4 counties
  2. FILTER  → keep only single-family, condo/townhouse and 2–4 units under our price cap;
               drop listings that opted out of internet display
  3. WRITE   → save the result as data/listings.json
  4. PUBLISH → commit that file; GitHub Pages updates the site automatically
```

**The API key is never put in the code.** It is stored in **GitHub → Settings → Secrets and variables → Actions** as a secret (for example `MICHRIC_API_TOKEN`). The robot reads it while it runs, and nobody browsing the site or the code can see it.

Things to know:

- **Public repo warning:** if the repository is public, the saved `listings.json` is public too. That's normal for an IDX website, since the listings are on the site anyway. But some MLS rules forbid offering listing data as a **bulk download**. **(confirm)** with MichRIC whether a public JSON file is acceptable. If it isn't, options include a private repo (GitHub Pages from a private repo needs a paid GitHub plan) or a small hosted function instead of a JSON file.
- GitHub's scheduled jobs can run a few minutes late. Running **every 6 hours** keeps us well inside the 12-hour refresh rule.
- When we build it, the GitHub token used for pushing will need the **"workflow" permission**.
- The robot would also keep a "last updated" time, which the site shows in the footer.

---

## 5. What to ask the API for (fields and filter)

**Fields to request** (RESO names; the adapter reads exactly these):

```
ListingKey, ListingId, StandardStatus, ListPrice, UnparsedAddress, StreetNumber,
StreetDirPrefix, StreetName, StreetSuffix, StreetDirSuffix, UnitNumber, City,
StateOrProvince, PostalCode, CountyOrParish, Latitude, Longitude, PropertyType,
PropertySubType, BedroomsTotal, BathroomsFull, BathroomsHalf, BathroomsTotalInteger,
LivingArea, YearBuilt, LotSizeAcres, TaxAnnualAmount, TaxYear, AssociationFee,
AssociationFeeFrequency, AssociationFee2, AssociationFee2Frequency, NumberOfUnitsTotal,
TotalActualRent, ListOfficeName, ListAgentFullName, PublicRemarks, DaysOnMarket,
OnMarketDate, ModificationTimestamp, InternetEntireListingDisplayYN,
InternetAddressDisplayYN, InternetAutomatedValuationDisplayYN
```

Plus, attached ("expanded") to each listing:
- `Media` (photos: `MediaURL`, `Order`, `MediaCategory`)
- `UnitTypes` (per-unit beds, baths and current rent for 2–4 unit buildings)

**Example request (RESO Web API / OData):**

```
GET https://<vendor-host>/Reso/OData/Property
  ?$filter=StandardStatus eq 'Active'
     and (CountyOrParish eq 'Kent' or CountyOrParish eq 'Ottawa'
          or CountyOrParish eq 'Allegan' or CountyOrParish eq 'Muskegon')
     and (PropertySubType eq 'Single Family Residence' or PropertySubType eq 'Condominium'
          or PropertySubType eq 'Townhouse' or PropertySubType eq 'Duplex'
          or PropertySubType eq 'Triplex' or PropertySubType eq 'Quadruplex')
     and ListPrice le 600000
  &$select=<fields above, comma-separated>
  &$expand=Media,UnitTypes
  &$top=200
  &$orderby=ModificationTimestamp desc
```

(`<vendor-host>` is a placeholder. For Spark it is likely `sparkapi.com`. **(confirm)**)

**Things that often differ in real feeds (confirm with a test key):**

- **County names** may come back as `"Kent"` or `"Kent County"`. The adapter handles both.
- **Property sub-type names** in MichRIC may differ, such as "Multi-Family" with a unit count instead of "Duplex". The adapter handles common variants, and anything it can't classify is skipped with a warning.
- **Per-unit rents**: MichRIC may keep per-unit rents in **custom fields** rather than the standard `UnitTypes` list. If so, we add a small mapping to the adapter. **(confirm field names in Flexmls)**
- Results come in pages of up to a few hundred, so the robot follows `@odata.nextLink` until done.
- The response looks like `{ "value": [ ...listings... ] }`. `ResoAdapter.toListings()` already accepts that shape.

---

## 6. Display rules to confirm with MichRIC

| Topic | What to ask |
|---|---|
| **Listing attribution** | Must every listing show the **listing brokerage** (and agent)? What font size and placement? (The site already shows "Listed by [office]" on every card and detail page.) |
| **MLS disclaimer** | Exact required wording, e.g., "Information deemed reliable but not guaranteed… © MichRIC [year]", and where it must appear (every page, or listing pages only). |
| **MLS logo / IDX icon** | Is a MichRIC or IDX logo required next to listings? |
| **Photos** | May we **link** to the vendor's photo URLs (hotlink), or must we copy them? How many photos? Watermark rules? Do photo links expire? |
| **Refresh frequency** | Minimum refresh (NAR says 12 hours; MichRIC may require more often). |
| **Data allowed** | Which fields may be shown publicly. Private remarks, showing instructions and seller info are **never** allowed. Tax amounts and rents are usually OK. **(confirm)** |
| **Filtering** | Is it OK to show **only** listings that pass our cash-flow test, with a "show all" option? |
| **Our estimates** | Is an investor cash-flow estimate next to a listing allowed? It must be labeled as ours, and opted-out listings respected. |
| **Sold / off-market** | Must they disappear immediately? (Yes under IDX; sold data usually needs VOW.) |
| **Bulk data** | Is a public `listings.json` file acceptable? (see section 4) |
| **Compliance reviews** | Does MichRIC need to **approve the website** before launch? Is there a periodic audit? |

---

## 7. Checklist

**Paperwork and access**
- [ ] Ask MichRIC or your board which data channel they use today (Spark? CIC? other?) and get the current IDX agreement.
- [ ] Broker signs the IDX agreement.
- [ ] Sign the vendor (FBS/Spark) developer agreement; choose an **IDX** plan; note the monthly fee.
- [ ] Receive the API key or token. **Do not email it around or paste it in any file.**
- [ ] Get MichRIC's written display rules (disclaimer text, logo, attribution, refresh, photos).

**Technical (Claude can do these with you)**
- [ ] Save the key in GitHub Secrets as `MICHRIC_API_TOKEN`.
- [ ] Give the GitHub token the "workflow" permission.
- [ ] Run one test pull and compare real field names and values to section 5. Adjust `js/reso-adapter.js` if needed (e.g., custom unit-rent fields).
- [ ] Build the scheduled GitHub Action (fetch → filter → write `data/listings.json`), running every 6 hours.
- [ ] Switch the site from `data/mock-listings.js` to `data/listings.json`, and remove the "sample listing" labels.
- [ ] Add MichRIC's exact disclaimer, logo and attribution, and hide opted-out listings.
- [ ] Update `data/hud-rents.js` to FY2027, or replace it with your own ZIP × bedroom rent table.

**Before going live**
- [ ] Send the site link to MichRIC for review, if they require it.
- [ ] Spot-check 5–10 listings against Flexmls (price, status, units, taxes).
- [ ] Confirm sold or withdrawn listings disappear within 12 hours.

---

## 8. Glossary

- **RESO**: the real-estate industry group that standardizes MLS field names (the "Data Dictionary") and the data-access method (the "Web API").
- **OData**: the query style the RESO Web API uses (`$filter`, `$select`, `$expand`, `$top`).
- **IDX**: rules that let brokers show each other's listings on public websites.
- **API key / token**: a password for software. Keep it secret.
- **GitHub Action**: a small program GitHub runs for you on a schedule.

## 9. Sources and notes

- FBS Spark Platform docs: [Which API is right for you](https://www.sparkplatform.com/docs/overview/which_api), [RESO Web API overview](https://www.sparkplatform.com/docs/reso/overview), [Setting up access](https://sparkplatform.com/docs/overview/set_up_access).
- MichRIC data license form (older copy, 2019): [support.z57.com/…/mi_swmric.pdf](https://support.z57.com/wp-content/uploads/2019/06/mi_swmric.pdf). Get the current version from MichRIC.
- WMLAR member MLS FAQ (MichRIC is accessed through Flexmls): [wmlar.com FAQ PDF](https://wmlar.com/wp-content/uploads/2025/06/Member-MLS-FAQ-Guide-06112025.pdf).
- NAR IDX policy (in NAR's *Handbook on Multiple Listing Policy*): sets the 12-hour refresh, objective-criteria selection, brokerage attribution and opt-out rules. MichRIC's rules may be stricter.
- **HUD rents:** `data/hud-rents.js` currently holds **FY2026** HUD Fair Market Rents. They were pulled from HUD's official open-data service because huduser.gov blocked automated downloads. FY2027 rents took effect Oct 1, 2026, so update the file when possible. HUD's FMR page: https://www.huduser.gov/portal/datasets/fmr.html
