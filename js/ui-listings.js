/*
 * Listings page (index.html)
 * --------------------------
 * Loads the listings, runs each one through the cash-flow engine, and shows them as
 * cards. The filter bar, "only show passing" switch and preset buttons re-run or
 * re-filter the cards instantly.
 *
 * Pipeline: MOCK_RESO_PROPERTIES -> ResoAdapter.toListings -> CashFlow.analyze(All)
 */
(function () {
  "use strict";
  var R = Realify, esc = R.esc, money = R.money, pct = R.pct;

  var state = {
    preset: R.currentPresetKey(),
    county: "", city: "", type: "", priceMin: null, priceMax: null,
    minBeds: 0, minUnits: 0, sort: "coc", passOnly: true
  };
  var cache = {};      // preset -> analyzed pairs
  var els = {};

  function $(id) { return document.getElementById(id); }

  function pairsFor(preset) {
    if (!cache[preset]) cache[preset] = R.analyzePairs(R.getPreset(preset));
    return cache[preset];
  }

  /* ---------- Filter bar ---------- */
  function fillSelect(sel, values, anyLabel, labelFn) {
    var cur = sel.value;
    sel.innerHTML = '<option value="">' + esc(anyLabel) + "</option>" + values.map(function (v) {
      return '<option value="' + esc(v) + '">' + esc(labelFn ? labelFn(v) : v) + "</option>";
    }).join("");
    if (values.indexOf(cur) >= 0) sel.value = cur;
  }
  function uniqueSorted(arr) {
    var seen = {}, out = [];
    arr.forEach(function (v) { if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out.sort();
  }
  function populateFilters(listings) {
    fillSelect(els.county, uniqueSorted(listings.map(function (l) { return l.county; })), "All counties", function (c) { return c + " County"; });
    refreshCities(listings);
    var typeOrder = ["single_family", "condo", "townhouse", "duplex", "triplex", "fourplex"];
    var types = uniqueSorted(listings.map(function (l) { return l.propertyType; }))
      .sort(function (a, b) { return typeOrder.indexOf(a) - typeOrder.indexOf(b); });
    fillSelect(els.type, types, "All types", R.typeLabel);
  }
  function refreshCities(listings) {
    var cities = uniqueSorted(listings.filter(function (l) { return !state.county || l.county === state.county; })
      .map(function (l) { return l.city; }));
    fillSelect(els.city, cities, "All cities");
    if (state.city && cities.indexOf(state.city) < 0) { state.city = ""; els.city.value = ""; }
  }

  function readNum(input) {
    var v = parseFloat(String(input.value).replace(/[^0-9.]/g, ""));
    return isFinite(v) && v > 0 ? v : null;
  }

  /* ---------- Filtering & sorting ---------- */
  function matches(p) {
    var l = p.listing;
    if (state.county && l.county !== state.county) return false;
    if (state.city && l.city !== state.city) return false;
    if (state.type && l.propertyType !== state.type) return false;
    if (state.priceMin != null && l.price < state.priceMin) return false;
    if (state.priceMax != null && l.price > state.priceMax) return false;
    if (state.minBeds && (l.beds || 0) < state.minBeds) return false;
    if (state.minUnits && (l.unitCount || 1) < state.minUnits) return false;
    return true;
  }
  function passes(p) { return !!(p.r && p.r.passes && p.r.passes.overall); }
  function dateVal(l) {
    var t = Date.parse(l.onMarketDate || l.updatedAt || "");
    return isFinite(t) ? t : -(l.daysOnMarket || 0);
  }
  var SORTS = {
    coc: function (a, b) { return (b.r.cashOnCash - a.r.cashOnCash) || (b.r.perDoor - a.r.perDoor); },
    perdoor: function (a, b) { return (b.r.perDoor - a.r.perDoor) || (b.r.cashOnCash - a.r.cashOnCash); },
    "price-asc": function (a, b) { return a.listing.price - b.listing.price; },
    "price-desc": function (a, b) { return b.listing.price - a.listing.price; },
    newest: function (a, b) { return dateVal(b.listing) - dateVal(a.listing); }
  };

  /* ---------- Cards ---------- */
  function factsLine(l) {
    var parts = [];
    if ((l.unitCount || 1) > 1) parts.push(l.unitCount + " units");
    if (R.isNum(l.beds)) parts.push(l.beds + " bd");
    if (R.isNum(l.baths)) parts.push(l.baths + " ba");
    if (R.isNum(l.sqft) && l.sqft) parts.push(R.num(l.sqft) + " sf");
    return parts.join(" · ");
  }
  function chip(ok, text, label) {
    return '<span class="chip ' + (ok ? "chip-pass" : "chip-fail") + '" title="' + esc(label) + '">' +
      (ok ? R.icons.check : R.icons.x) + '<span class="visually-hidden">' + (ok ? "Passes: " : "Misses: ") + "</span>" + esc(text) + "</span>";
  }
  function card(p) {
    var l = p.listing, r = p.r, a = R.getPreset(state.preset);
    var cf = r.monthly ? r.monthly.cashFlow : null;
    var href = "property.html?id=" + encodeURIComponent(l.id) + "&preset=" + encodeURIComponent(state.preset);
    var grade = r.grade || "–";
    var warnCount = (r.warnings || []).length;
    return '<article class="card">' +
      '<div class="media">' + R.placeholderSVG(l) +
        (l.isMock !== false ? '<span class="ribbon" aria-hidden="true">MOCK DATA</span>' : "") +
        '<span class="grade grade-' + esc(grade) + '" title="Deal grade ' + esc(grade) + '"><span><span class="visually-hidden">Deal grade </span>' + esc(grade) + "</span></span>" +
        '<span class="type-pill">' + esc(R.typeLabel(l.propertyType)) + "</span>" +
      "</div>" +
      '<div class="body">' +
        "<div>" +
          '<div class="price-row"><span class="price money">' + money(l.price) + '</span><span class="facts">' + esc(factsLine(l)) + "</span></div>" +
          '<h3><a href="' + href + '">' + esc(l.address) + "</a></h3>" +
          '<p class="where">' + esc(l.city) + ", " + esc(l.state || "MI") + " " + esc(l.zip || "") + " · " + esc(l.county) + " County" +
            (l.isMock !== false ? ' · <span class="visually-hidden">Hypothetical sample listing</span>' : "") + "</p>" +
        "</div>" +
        '<div class="cf-hero"><div><div class="label">Est. monthly cash flow</div>' +
          '<div class="big money ' + (cf >= 0 ? "pos" : "neg") + '">' + money(cf, { sign: true }) + "<small>/mo</small></div></div>" +
        "</div>" +
        '<dl class="metrics">' +
          "<div><dt>Per door</dt><dd>" + money(r.perDoor, { sign: true }) + "</dd></div>" +
          "<div><dt>Cash-on-cash</dt><dd>" + pct(r.cashOnCash) + "</dd></div>" +
          "<div><dt>Cash needed</dt><dd>" + money(r.cash && r.cash.totalCashNeeded, { compact: true }) + "</dd></div>" +
        "</dl>" +
        '<div class="chips">' +
          chip(r.passes && r.passes.perDoor, money(R.minPerDoor(a)) + "/door", "Cash flow of at least " + money(R.minPerDoor(a)) + " per unit per month") +
          chip(r.passes && r.passes.cashOnCash, pct(R.minCoC(a), 0) + " CoC", "Cash-on-cash return of at least " + pct(R.minCoC(a), 0)) +
          (warnCount ? '<span class="chip chip-warn">' + R.icons.alert + warnCount + " note" + (warnCount > 1 ? "s" : "") + "</span>" : "") +
        "</div>" +
        '<p class="attribution">Listing courtesy of ' + esc(l.listOffice || "[listing office]") +
          (l.mlsNumber ? ' · MLS# <span class="num">' + esc(l.mlsNumber) + "</span>" : "") + "</p>" +
      "</div>" +
    "</article>";
  }

  /* ---------- Render ---------- */
  function renderStats(pairs) {
    var passing = pairs.filter(passes);
    var bestCoc = pairs.reduce(function (m, p) { return Math.max(m, p.r.cashOnCash); }, -Infinity);
    var doors = passing.map(function (p) { return p.r.perDoor; }).sort(function (a, b) { return a - b; });
    var median = doors.length ? doors[Math.floor((doors.length - 1) / 2)] : null;
    var counties = uniqueSorted(pairs.map(function (p) { return p.listing.county; })).length;
    var a = R.getPreset(state.preset), hd = $("hero-door"), hc = $("hero-coc");
    if (hd) hd.textContent = money(R.minPerDoor(a));
    if (hc) hc.textContent = pct(R.minCoC(a), 0);
    els.stats.innerHTML =
      stat(passing.length + '<span style="color:#9CA3AF;font-weight:600"> / ' + pairs.length + "</span>", "listings pass both tests") +
      stat(isFinite(bestCoc) ? pct(bestCoc) : "—", "best cash-on-cash return") +
      stat(median != null ? money(median, { sign: true }) : "—", "median cash flow per door (passing)") +
      stat(String(counties), "West Michigan counties covered");
  }
  function stat(v, k) { return '<div class="hero-stat"><div class="v">' + v + '</div><div class="k">' + esc(k) + "</div></div>"; }

  function render() {
    var pairs = pairsFor(state.preset);
    renderStats(pairs);
    var filtered = pairs.filter(matches);
    var passingCount = filtered.filter(passes).length;
    var shown = (state.passOnly ? filtered.filter(passes) : filtered.slice()).sort(SORTS[state.sort] || SORTS.coc);

    els.title.textContent = state.passOnly ? "Properties that pass" : "All properties";
    els.count.textContent = state.passOnly
      ? shown.length + " of " + filtered.length + " matching listing" + (filtered.length === 1 ? "" : "s") + " pass under " + R.PRESET_LABELS[state.preset] + " assumptions"
      : filtered.length + " listing" + (filtered.length === 1 ? "" : "s") + " · " + passingCount + " pass under " + R.PRESET_LABELS[state.preset] + " assumptions";

    if (!shown.length) {
      var onlyPassIssue = state.passOnly && filtered.length > 0;
      els.cards.innerHTML = '<div class="empty" style="grid-column:1/-1">' + R.icons.search +
        "<h3>" + (onlyPassIssue ? "Nothing passes with these filters — yet" : "No listings match these filters") + "</h3>" +
        "<p>" + (onlyPassIssue
          ? filtered.length + " listing" + (filtered.length === 1 ? " matches" : "s match") + " your filters, but none clear both the " + money(R.minPerDoor(R.getPreset(state.preset))) + "/door and " + pct(R.minCoC(R.getPreset(state.preset)), 0) + " cash-on-cash bars. Show them all, or try the Aggressive preset."
          : "Try widening the price range or clearing a filter.") + "</p>" +
        (onlyPassIssue ? '<button type="button" class="btn btn-primary" data-act="show-all">Show all ' + filtered.length + "</button> " : "") +
        '<button type="button" class="btn btn-ghost" data-act="reset">Reset filters</button></div>';
      return;
    }
    els.cards.innerHTML = shown.map(card).join("");
  }

  function setPreset(key) {
    state.preset = key;
    R.savePresetKey(key);
    Array.prototype.forEach.call(els.presets.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-preset") === key ? "true" : "false");
    });
    render();
  }

  function resetFilters() {
    state.county = state.city = state.type = "";
    state.priceMin = state.priceMax = null;
    state.minBeds = state.minUnits = 0;
    els.county.value = els.city.value = els.type.value = "";
    els.priceMin.value = els.priceMax.value = "";
    els.beds.value = els.units.value = "0";
    refreshCities(R.loadListings());
    render();
  }

  function init() {
    els = {
      county: $("f-county"), city: $("f-city"), type: $("f-type"), priceMin: $("f-price-min"), priceMax: $("f-price-max"),
      beds: $("f-beds"), units: $("f-units"), sort: $("f-sort"), passOnly: $("f-pass"), presets: $("f-presets"),
      cards: $("cards"), count: $("results-count"), title: $("results-title"), stats: $("hero-stats"), reset: $("f-reset")
    };
    var missing = R.engineMissing();
    if (missing.length) { els.cards.innerHTML = R.engineErrorHTML(missing); els.stats.innerHTML = ""; return; }

    var listings;
    try { listings = R.loadListings(); pairsFor(state.preset); }
    catch (err) { els.cards.innerHTML = R.engineErrorHTML(); if (window.console) console.error(err); return; }

    populateFilters(listings);
    els.passOnly.checked = state.passOnly;

    els.county.addEventListener("change", function () { state.county = els.county.value; refreshCities(listings); render(); });
    els.city.addEventListener("change", function () { state.city = els.city.value; render(); });
    els.type.addEventListener("change", function () { state.type = els.type.value; render(); });
    els.beds.addEventListener("change", function () { state.minBeds = +els.beds.value || 0; render(); });
    els.units.addEventListener("change", function () { state.minUnits = +els.units.value || 0; render(); });
    els.sort.addEventListener("change", function () { state.sort = els.sort.value; render(); });
    els.passOnly.addEventListener("change", function () { state.passOnly = els.passOnly.checked; render(); });
    var t;
    function priceChanged() {
      clearTimeout(t);
      t = setTimeout(function () { state.priceMin = readNum(els.priceMin); state.priceMax = readNum(els.priceMax); render(); }, 250);
    }
    els.priceMin.addEventListener("input", priceChanged);
    els.priceMax.addEventListener("input", priceChanged);
    els.reset.addEventListener("click", resetFilters);
    els.presets.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-preset]");
      if (b) setPreset(b.getAttribute("data-preset"));
    });
    els.cards.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-act]");
      if (!b) return;
      if (b.getAttribute("data-act") === "show-all") { state.passOnly = false; els.passOnly.checked = false; render(); }
      else resetFilters();
    });
    setPreset(state.preset);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
