/*
 * "How we calculate" page (method.html)
 * --------------------------------------
 * Fills the numbers on the page straight from the engine (CashFlow.DEFAULTS,
 * CashFlow.PRESETS, HUD_RENTS, MILLAGE), so the explanation never goes stale when
 * data/assumptions.js changes.
 *
 * In the HTML, <span data-a="vacancyPct" data-fmt="pct"></span> shows that default.
 * data-fmt can be: pct (25%), pct3 (7.875%), money ($1,500), num (30), months.
 */
(function () {
  "use strict";
  var R = Realify, esc = R.esc;

  function get(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function fmt(v, f) {
    if (v == null || v === "") return "—";
    switch (f) {
      case "pct": return R.pct(v, 2).replace(/(\.\d*?)0+%$/, "$1%").replace(/\.%$/, "%");
      case "pct3": return R.pct(v, 3).replace(/(\.\d*?)0+%$/, "$1%").replace(/\.%$/, "%");
      case "money": return R.money(v);
      case "months": return v + " month" + (v === 1 ? "" : "s");
      default: return R.num(v, 4);
    }
  }

  function fillSpans(D) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-a]"), function (el) {
      el.textContent = fmt(get(D, el.getAttribute("data-a")), el.getAttribute("data-fmt"));
    });
  }

  function presetTable() {
    var P = CashFlow.PRESETS;
    var rows = [
      ["Down payment", "downPaymentPct", "pct"],
      ["Interest rate", "interestRate", "pct3"],
      ["Vacancy", "vacancyPct", "pct"],
      ["Repairs", "repairsPct", "pct"],
      ["Capital reserves", "capexPct", "pct"],
      ["Management", "managementPct", "pct"],
      ["Leasing fee (months of rent)", "leasingFeeMonths", "num"]
    ];
    var keys = R.PRESET_KEYS;
    var html = '<table class="data-table"><caption class="visually-hidden">Assumption presets compared</caption><thead><tr><th scope="col">Assumption</th>' +
      keys.map(function (k) { return '<th scope="col" class="num">' + esc(R.PRESET_LABELS[k]) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) {
        return '<tr><th scope="row" style="font-weight:500">' + esc(r[0]) + "</th>" + keys.map(function (k) {
          var v = get(P[k], r[1]);
          var t = (r[1] === "managementPct" && !v) ? "Self-managed" : fmt(v, r[2]);
          return '<td class="num">' + esc(t) + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table>";
    document.getElementById("preset-table").innerHTML = html;
  }

  function grades(D) {
    var G = CashFlow.GRADE_CUTOFFS || {};
    var A = G.A || {}, C = G.C || {};
    var items = [
      ["A", "Passes both tests and earns at least " + R.pct(A.minCashOnCash || 0.12, 0) + " cash-on-cash and " + R.money(A.minPerDoor || 300) + " per door."],
      ["B", "Passes both tests: at least " + R.money(D.minPerDoor) + " per door and " + R.pct(D.minCashOnCash, 0) + " cash-on-cash."],
      ["C", "Positive cash flow and at least " + R.pct(C.minCashOnCash || 0.04, 0) + " cash-on-cash, but misses a test."],
      ["D", "Breaks even or a little better, with cash-on-cash under " + R.pct(C.minCashOnCash || 0.04, 0) + "."],
      ["F", "Loses money every month."]
    ];
    document.getElementById("grades-list").innerHTML = items.map(function (g) {
      return '<li style="display:flex;gap:14px;align-items:center;margin-bottom:12px"><span class="grade grade-' + g[0] + '" style="position:static;flex:none;width:36px;height:36px;font-size:1rem" aria-hidden="true">' + g[0] +
        '</span><span><strong>Grade ' + g[0] + ".</strong> " + esc(g[1]) + "</span></li>";
    }).join("");
  }

  function taxExample(D) {
    var M = typeof MILLAGE !== "undefined" ? MILLAGE : null;
    var gr = M && M.jurisdictions && M.jurisdictions["Grand Rapids"];
    if (!gr) return;
    var price = 200000, sev = D.sevRatio || 0.5;
    var investor = price * sev * gr.mills / 1000;
    var home = R.isNum(gr.homesteadMills) ? price * sev * gr.homesteadMills / 1000 : null;
    document.getElementById("tax-example").textContent =
      "Example — $200,000 rental in the City of Grand Rapids:\n" +
      "  $200,000 × " + Math.round(sev * 100) + "% × " + gr.mills + " mills ÷ 1,000 = " + R.money(investor) + " a year (" + R.money(investor / 12) + "/month)\n" +
      (home != null ? "  At the owner-occupied rate (" + gr.homesteadMills + " mills), the same taxable value would pay about " + R.money(home) + " — and a long-time owner’s capped value is often lower still." : "");
  }

  function sources() {
    var H = typeof HUD_RENTS !== "undefined" ? HUD_RENTS : null;
    var M = typeof MILLAGE !== "undefined" ? MILLAGE : null;
    if (H) {
      document.getElementById("hud-year").textContent = "FY" + H.fiscalYear;
      var link = document.getElementById("hud-link");
      link.href = H.hudHomePage || H.url;
    }
    if (M) document.getElementById("mill-year").textContent = String(M.taxYear);
    var asOf = CashFlow.DEFAULTS.asOf;
    if (asOf) document.getElementById("as-of").textContent = asOf;
  }

  function init() {
    var missing = R.engineMissing();
    if (missing.length) {
      document.getElementById("method-error").innerHTML = R.engineErrorHTML(missing);
      return;
    }
    var D = CashFlow.DEFAULTS;
    fillSpans(D);
    presetTable();
    grades(D);
    taxExample(D);
    sources();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
