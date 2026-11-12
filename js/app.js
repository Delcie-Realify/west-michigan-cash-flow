/*
 * Realify site — shared helpers used by every page
 * -------------------------------------------------
 * - Draws the header (logo + menu) and the footer (disclaimers) on every page,
 *   so the legal wording lives in ONE place (assets/config.js).
 * - Number formatting ($1,234 / 8.4%), the drawn placeholder "photos",
 *   and small helpers for talking to the cash-flow engine (js/cashflow.js).
 *
 * Settings you might want to change are NOT here — they are in assets/config.js.
 */
var Realify = (function () {
  "use strict";

  var CFG = (typeof SITE_CONFIG !== "undefined") ? SITE_CONFIG : {};

  /* ---------------- Small utilities ---------------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function isNum(n) { return typeof n === "number" && isFinite(n); }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function hash(str) {
    var h = 2166136261;
    str = String(str);
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) : (h * 16777619) | 0; }
    return Math.abs(h | 0);
  }
  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
  }
  // Browser storage can be blocked (private windows) — never let that break the page.
  function store(key, val) {
    try {
      if (arguments.length > 1) { window.localStorage.setItem(key, val); return val; }
      return window.localStorage.getItem(key);
    } catch (e) { return null; }
  }
  // Text placeholder like "[phone]" → highlighted so Delcie can spot it.
  function cfgText(key) {
    var v = CFG[key];
    if (!v) return "";
    return /^\[.*\]$/.test(String(v)) ? '<span class="placeholder">' + esc(v) + "</span>" : esc(v);
  }

  /* ---------------- Number formatting ---------------- */
  var MINUS = "−";
  function money(n, opts) {
    opts = opts || {};
    if (!isNum(n)) return "—";
    var abs = Math.abs(n);
    var s;
    if (opts.compact && abs >= 1000) {
      s = abs >= 1e6 ? (abs / 1e6).toFixed(abs >= 1e7 ? 0 : 2).replace(/\.?0+$/, "") + "M"
                     : (abs / 1000).toFixed(abs >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k";
    } else {
      s = Math.round(abs).toLocaleString("en-US");
    }
    var sign = n < 0 && Math.round(abs) !== 0 ? MINUS : (opts.sign && Math.round(abs) !== 0 ? "+" : "");
    return sign + "$" + s;
  }
  function pct(dec, digits) {
    if (!isNum(dec)) return "—";
    var d = digits == null ? 1 : digits;
    var v = dec * 100;
    return (v < 0 ? MINUS : "") + Math.abs(v).toFixed(d) + "%";
  }
  function num(n, digits) {
    if (!isNum(n)) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: digits == null ? 0 : digits });
  }
  // Some settings may be stored as 0.25 or 25 — always show them as "25".
  function asPctNumber(v) { return !isNum(v) ? null : (Math.abs(v) <= 1 ? v * 100 : v); }
  // Write a percent back in the same style the engine gave it to us.
  function fromPctNumber(display, original) {
    return (isNum(original) && Math.abs(original) > 1) ? display : display / 100;
  }

  /* ---------------- Property types ---------------- */
  var TYPE_LABELS = {
    single_family: "Single-family", condo: "Condo", townhouse: "Townhome",
    duplex: "Duplex", triplex: "Triplex", fourplex: "Fourplex"
  };
  function typeLabel(t) { return TYPE_LABELS[t] || "Property"; }

  /* ---------------- Icons (inline SVG, no icon fonts) ---------------- */
  var ICONS = {
    check: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"/></svg>',
    x: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.3 5.3a1 1 0 011.4 0L10 8.6l3.3-3.3a1 1 0 111.4 1.4L11.4 10l3.3 3.3a1 1 0 01-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 01-1.4-1.4L8.6 10 5.3 6.7a1 1 0 010-1.4z"/></svg>',
    alert: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M8.3 3.1a2 2 0 013.4 0l6.3 11a2 2 0 01-1.7 2.9H3.7A2 2 0 012 14.1l6.3-11zM10 7a1 1 0 00-1 1v3a1 1 0 102 0V8a1 1 0 00-1-1zm0 7.5a1.1 1.1 0 100-2.2 1.1 1.1 0 000 2.2z"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    handshake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12l4-4 4 2 3-2 3 1 6 3"/><path d="M6 8v6l5 4 2-1 2 1 4-4"/><path d="M11 18l-2-2"/></svg>',
    eho: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 14L16 4l12 10"/><path d="M7 12v15h18V12"/><path d="M11 17h10M11 21h10" stroke-linecap="round"/></svg>'
  };

  /* ---------------- Drawn placeholder "photo" for a listing ---------------- */
  // There are no real photos yet, so each card gets an elegant drawing:
  // charcoal backdrop, soft raspberry glow, contour lines, and a building icon
  // that matches the property type.
  function houseShape(x, baseY, w, h, door) {
    var roofH = w * 0.42;
    var s = '<path d="M' + x + " " + (baseY - h) + " L" + (x + w / 2) + " " + (baseY - h - roofH) + " L" + (x + w) + " " + (baseY - h) + '" />';
    s += '<rect x="' + (x + w * 0.08) + '" y="' + (baseY - h) + '" width="' + (w * 0.84) + '" height="' + h + '" />';
    if (door) {
      var dw = w * 0.2, dh = h * 0.5;
      s += '<rect x="' + (x + w / 2 - dw / 2) + '" y="' + (baseY - dh) + '" width="' + dw + '" height="' + dh + '" />';
      s += '<rect x="' + (x + w * 0.2) + '" y="' + (baseY - h * 0.78) + '" width="' + (w * 0.16) + '" height="' + (w * 0.16) + '" />';
      s += '<rect x="' + (x + w * 0.64) + '" y="' + (baseY - h * 0.78) + '" width="' + (w * 0.16) + '" height="' + (w * 0.16) + '" />';
    }
    return s;
  }
  function buildingIcon(type, units) {
    var g = "";
    var base = 250;
    if (type === "condo") {
      // mid-rise building with a window grid
      g += '<rect x="270" y="110" width="100" height="140" rx="3" />';
      for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) {
        g += '<rect x="' + (284 + c * 26) + '" y="' + (124 + r * 26) + '" width="14" height="14" rx="1.5" />';
      }
      g += '<rect x="308" y="226" width="24" height="24" />';
    } else if (type === "townhouse") {
      for (var t = 0; t < 3; t++) g += houseShape(230 + t * 60, base, 60, 78, true);
    } else {
      var n = Math.max(1, Math.min(4, units || 1));
      var w = n === 1 ? 120 : n === 2 ? 92 : n === 3 ? 74 : 62;
      var total = w * n;
      var start = 320 - total / 2;
      for (var i = 0; i < n; i++) g += houseShape(start + i * w, base, w, w * (n === 1 ? 0.62 : 0.78), true);
    }
    return g;
  }
  function placeholderSVG(listing) {
    var id = "ph" + hash(listing.id || listing.address || Math.random());
    var h = hash(listing.id || "x");
    var angle = 20 + (h % 50);
    var cx = 420 + (h % 180), cy = 40 + (h % 90);
    var lines = "";
    for (var i = 1; i <= 7; i++) {
      lines += '<ellipse cx="' + cx + '" cy="' + (cy + 40) + '" rx="' + (60 * i) + '" ry="' + (34 * i) + '" />';
    }
    return '<svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration of a ' +
      esc(typeLabel(listing.propertyType).toLowerCase()) + ' (no photo available)">' +
      '<defs>' +
        '<linearGradient id="' + id + 'g" gradientTransform="rotate(' + angle + ')"><stop offset="0" stop-color="#262428"/><stop offset="1" stop-color="#151416"/></linearGradient>' +
        '<radialGradient id="' + id + 'r" cx="' + (cx / 640) + '" cy="' + (cy / 360) + '" r=".7"><stop offset="0" stop-color="#ED135A" stop-opacity=".42"/><stop offset=".55" stop-color="#ED135A" stop-opacity=".06"/><stop offset="1" stop-color="#ED135A" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<rect width="640" height="360" fill="url(#' + id + 'g)"/>' +
      '<rect width="640" height="360" fill="url(#' + id + 'r)"/>' +
      '<g fill="none" stroke="#fff" stroke-opacity=".06" stroke-width="1.2">' + lines + '</g>' +
      '<line x1="150" y1="250.5" x2="490" y2="250.5" stroke="#fff" stroke-opacity=".22" stroke-width="1.5"/>' +
      '<g fill="none" stroke="#fff" stroke-opacity=".88" stroke-width="3" stroke-linejoin="round">' + buildingIcon(listing.propertyType, listing.unitCount) + '</g>' +
      '<g transform="translate(' + (cx - 11) + ' ' + (cy - 4) + ')"><path d="M11 0C4.9 0 0 4.8 0 10.8 0 18.9 11 29 11 29s11-10.1 11-18.2C22 4.8 17.1 0 11 0z" fill="#ED135A"/><circle cx="11" cy="10.5" r="3.8" fill="#fff"/></g>' +
      '</svg>';
  }

  /* ---------------- Header & footer ---------------- */
  var NAV = [
    { href: "index.html", label: "Listings", page: "listings" },
    { href: "method.html", label: "How we calculate", page: "method" },
    { href: "about.html", label: "About Delcie", page: "about" }
  ];
  function renderHeader() {
    var el = document.getElementById("site-header");
    if (!el) return;
    var page = document.body.getAttribute("data-page");
    var links = NAV.map(function (n) {
      return '<a href="' + n.href + '"' + (n.page === page ? ' aria-current="page"' : "") + ">" + esc(n.label) + "</a>";
    }).join("");
    el.className = "site-header";
    el.innerHTML =
      '<div class="container bar">' +
        '<a class="brand-link" href="index.html" aria-label="Realify Properties — investor listings home">' +
          '<img src="assets/img/logo.webp" width="93" height="40" alt="Realify Properties">' +
          '<span class="tag">Investor Rentals</span>' +
        '</a>' +
        '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="visually-hidden">Menu</span>' + ICONS.menu + '</button>' +
        '<nav class="nav" id="site-nav" aria-label="Main">' + links +
          '<a class="nav-cta" href="about.html#contact">Talk to Delcie</a>' +
        '</nav>' +
      '</div>';
    var btn = el.querySelector(".nav-toggle"), nav = el.querySelector(".nav");
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.innerHTML = '<span class="visually-hidden">' + (open ? "Close menu" : "Menu") + "</span>" + (open ? ICONS.close : ICONS.menu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { btn.click(); btn.focus(); }
    });

    if (CFG.usingMockData !== false) {
      var strip = document.createElement("div");
      strip.className = "mock-strip";
      strip.setAttribute("role", "note");
      strip.innerHTML = '<div class="container">' + ICONS.alert +
        '<span><strong>Sample data.</strong> Every listing on this site is a hypothetical example used to demonstrate the calculator — not a real property for sale.</span></div>';
      el.parentNode.insertBefore(strip, el.nextSibling);
    }
  }

  function renderFooter() {
    var el = document.getElementById("site-footer");
    if (!el) return;
    var year = new Date().getFullYear();
    el.className = "site-footer";
    el.innerHTML =
      '<div class="container">' +
        '<div class="top">' +
          '<div>' +
            '<img class="logo" src="assets/img/logo.webp" width="103" height="44" alt="Realify Properties">' +
            '<p>Investment-grade rental analysis for Kent, Ottawa, Allegan and Muskegon counties — every listing run through the same honest, Michigan-specific math.</p>' +
          '</div>' +
          '<div><h2>Explore</h2><ul>' +
            '<li><a href="index.html">Cash-flow listings</a></li>' +
            '<li><a href="method.html">How we calculate</a></li>' +
            '<li><a href="about.html">About Delcie</a></li>' +
            '<li><a href="about.html#contact">Contact</a></li>' +
          '</ul></div>' +
          '<div><h2>Contact</h2><ul>' +
            '<li>' + esc(CFG.agentName || "") + (CFG.agentTitle ? ", " + cfgText("agentTitle") : "") + '</li>' +
            '<li>' + esc(CFG.brokerage || "Realify Properties") + '</li>' +
            (CFG.phone ? '<li>' + cfgText("phone") + '</li>' : "") +
            (CFG.email ? '<li>' + cfgText("email") + '</li>' : "") +
            (CFG.officeAddress ? '<li>' + cfgText("officeAddress") + '</li>' : "") +
            (CFG.brokerageUrl ? '<li><a href="' + esc(CFG.brokerageUrl) + '" rel="noopener">realifyproperties.com</a></li>' : "") +
          '</ul></div>' +
        '</div>' +
        '<div class="legal">' +
          '<p>' + cfgText("mlsDisclaimer") + '</p>' +
          (CFG.usingMockData !== false ? '<p><strong>All listings currently shown are hypothetical sample data.</strong> They are not real properties for sale and are used only to demonstrate the calculator.</p>' : "") +
          '<p><strong>Estimates only — not financial, tax, or legal advice.</strong> Rents, taxes, insurance, financing and expenses are estimates based on public data and stated assumptions. Verify every number (including a lender quote, insurance quote and the local assessor) before you buy.</p>' +
          (CFG.licenseLine ? '<p>' + cfgText("licenseLine") + '</p>' : "") +
          '<p class="eho">' + ICONS.eho + '<span>Equal Housing Opportunity. We are pledged to the letter and spirit of U.S. fair housing law.</span></p>' +
          '<p>© ' + year + ' Realify Properties. All rights reserved.</p>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- Engine helpers ---------------- */
  // Presets shown on the site. (The engine also has "conservative"; add it back here to show it.)
  var PRESET_KEYS = ["default", "aggressive"];
  var PRESET_LABELS = { conservative: "Conservative", "default": "Default", aggressive: "Aggressive" };

  function engineMissing() {
    var missing = [];
    if (typeof ASSUMPTIONS === "undefined") missing.push("data/assumptions.js");
    if (typeof HUD_RENTS === "undefined") missing.push("data/hud-rents.js");
    if (typeof MOCK_RESO_PROPERTIES === "undefined") missing.push("data/mock-listings.js");
    if (typeof ResoAdapter === "undefined") missing.push("js/reso-adapter.js");
    if (typeof CashFlow === "undefined") missing.push("js/cashflow.js");
    return missing;
  }
  function engineErrorHTML(missing) {
    return '<div class="notice notice-error" role="alert"><strong>The calculator couldn’t load.</strong> ' +
      (missing && missing.length ? "Missing file(s): " + missing.map(esc).join(", ") + "." : "Please refresh the page.") + "</div>";
  }
  function getPreset(key) {
    var P = (typeof CashFlow !== "undefined" && CashFlow.PRESETS) || {};
    var p = P[key] || P["default"] || (typeof CashFlow !== "undefined" ? CashFlow.DEFAULTS : null) || {};
    return clone(p);
  }
  function currentPresetKey() {
    var k = qs("preset") || store("realify.preset") || "default";
    return PRESET_KEYS.indexOf(k) >= 0 ? k : "default";
  }
  function savePresetKey(k) { store("realify.preset", k); }

  var _listings = null;
  function loadListings() {
    if (_listings) return _listings;
    _listings = ResoAdapter.toListings(MOCK_RESO_PROPERTIES) || [];
    return _listings;
  }
  // Runs every listing through the engine and returns [{ listing, r }] (r = analysis),
  // best deals first. Uses CashFlow.analyzeAll when its results carry the listing;
  // otherwise analyzes one by one so each result stays paired with its listing.
  function analyzePairs(assumptions) {
    var listings = loadListings();
    var out = null;
    if (typeof CashFlow.analyzeAll === "function") {
      var all = CashFlow.analyzeAll(listings, HUD_RENTS, assumptions) || [];
      if (all.length && all.every(function (r) { return r && r.listing; })) {
        out = all.map(function (r) { return { listing: r.listing, r: r }; });
      }
    }
    if (!out) {
      out = listings.map(function (l) { return { listing: l, r: CashFlow.analyze(l, HUD_RENTS, assumptions) }; });
      out.sort(function (a, b) { return (b.r.cashOnCash - a.r.cashOnCash) || (b.r.perDoor - a.r.perDoor); });
    }
    return out;
  }
  function minPerDoor(a) { return (a && isNum(a.minPerDoor)) ? a.minPerDoor : 200; }
  function minCoC(a) { var v = a && a.minCashOnCash; return isNum(v) ? (v > 1 ? v / 100 : v) : 0.08; }

  function boot() {
    renderHeader();
    renderFooter();
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }

  return {
    config: CFG, esc: esc, isNum: isNum, clone: clone, hash: hash, qs: qs, store: store, cfgText: cfgText,
    money: money, pct: pct, num: num, asPctNumber: asPctNumber, fromPctNumber: fromPctNumber,
    typeLabel: typeLabel, TYPE_LABELS: TYPE_LABELS, icons: ICONS, placeholderSVG: placeholderSVG,
    PRESET_KEYS: PRESET_KEYS, PRESET_LABELS: PRESET_LABELS, getPreset: getPreset,
    currentPresetKey: currentPresetKey, savePresetKey: savePresetKey,
    engineMissing: engineMissing, engineErrorHTML: engineErrorHTML,
    loadListings: loadListings, analyzePairs: analyzePairs,
    minPerDoor: minPerDoor, minCoC: minCoC
  };
})();
if (typeof module !== "undefined") module.exports = Realify;
