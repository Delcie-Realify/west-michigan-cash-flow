/*
 * Property detail page (property.html?id=...)
 * --------------------------------------------
 * Shows one listing with a live calculator. Every slider or box a visitor changes
 * re-runs CashFlow.analyze and updates the metrics, table, chart and pass/fail.
 */
(function () {
  "use strict";
  var R = Realify, esc = R.esc, money = R.money, pct = R.pct;

  var listing, presetKey, base, vals, touched, rentOverride, mgmtOn, lastRent;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- The editable controls ----------
     kind "pct": shown as a percent (stored by the engine as a decimal)
     kind "money": dollars       kind "num": plain number */
  var CONTROLS = [
    { group: "Financing", key: "downPaymentPct", label: "Down payment", kind: "pct", min: 0, max: 100, step: 1 },
    { group: "Financing", key: "interestRate", label: "Interest rate", kind: "pct", min: 3, max: 12, step: 0.125 },
    { group: "Financing", key: "termYears", label: "Loan term", kind: "num", unit: "yrs", min: 10, max: 30, step: 5 },
    { group: "Financing", key: "closingCostPct", label: "Closing costs", kind: "pct", min: 0, max: 8, step: 0.25 },
    { group: "Reserves (share of rent)", key: "vacancyPct", label: "Vacancy", kind: "pct", min: 0, max: 20, step: 0.5 },
    { group: "Reserves (share of rent)", key: "repairsPct", label: "Repairs", kind: "pct", min: 0, max: 20, step: 0.5 },
    { group: "Reserves (share of rent)", key: "capexPct", label: "Capital reserves (CapEx)", kind: "pct", min: 0, max: 20, step: 0.5 },
    { group: "Management", key: "managementPct", label: "Management fee", kind: "pct", min: 4, max: 14, step: 0.5, mgmt: true },
    { group: "Management", key: "leasingFeeMonths", label: "Leasing fee (months of rent)", kind: "num", unit: "mo", min: 0, max: 1.5, step: 0.25, mgmt: true },
    { group: "Other costs", key: "insuranceAnnual", label: "Insurance (per year)", kind: "money", min: 0, max: 8000, step: 50 },
    { group: "Other costs", key: "utilities", label: "Owner-paid utilities (per unit / mo)", kind: "money", min: 0, max: 300, step: 5 }
  ];

  function utilitiesFrom(a) {
    var u = a.ownerPaidUtilitiesPerUnitMonthly;
    if (u && typeof u === "object") return R.isNum(u[listing.propertyType]) ? u[listing.propertyType] : 0;
    return R.isNum(u) ? u : 0;
  }

  // Load a preset's values into the controls.
  function loadPreset(key) {
    presetKey = key;
    base = R.getPreset(key);
    mgmtOn = (base.managementPct || 0) > 0;
    touched = {};
    vals = {};
    CONTROLS.forEach(function (c) {
      var v;
      if (c.key === "utilities") v = utilitiesFrom(base);
      else if (c.key === "managementPct") v = R.asPctNumber(mgmtOn ? base.managementPct : (base.proManagementPct || 0.09));
      else if (c.key === "leasingFeeMonths") v = mgmtOn ? (base.leasingFeeMonths || 0) : (R.isNum(base.proLeasingFeeMonths) ? base.proLeasingFeeMonths : 0.75);
      else if (c.key === "insuranceAnnual") v = R.isNum(base.insuranceAnnual) ? base.insuranceAnnual : null; // filled in after first run
      else if (c.kind === "pct") v = R.asPctNumber(base[c.key]);
      else v = base[c.key];
      vals[c.key] = v;
    });
    R.savePresetKey(key);
  }

  // Turn the control values back into an assumptions object for the engine.
  function buildAssumptions() {
    var a = R.clone(base);
    CONTROLS.forEach(function (c) {
      var v = vals[c.key];
      if (!R.isNum(v)) return;
      if (c.key === "utilities") {
        if (a.ownerPaidUtilitiesPerUnitMonthly && typeof a.ownerPaidUtilitiesPerUnitMonthly === "object") a.ownerPaidUtilitiesPerUnitMonthly[listing.propertyType] = v;
        else a.ownerPaidUtilitiesPerUnitMonthly = v;
      } else if (c.key === "insuranceAnnual") {
        if (touched.insuranceAnnual || R.isNum(base.insuranceAnnual)) a.insuranceAnnual = v;
      } else if (c.mgmt) {
        // handled below
      } else if (c.kind === "pct") {
        a[c.key] = R.fromPctNumber(v, base[c.key]);
      } else {
        a[c.key] = v;
      }
    });
    if (mgmtOn) {
      a.managementPct = R.fromPctNumber(vals.managementPct, base.proManagementPct || base.managementPct);
      a.leasingFeeMonths = vals.leasingFeeMonths;
    } else {
      a.managementPct = 0;
      a.leasingFeeMonths = 0;
    }
    return a;
  }

  function listingWithRents() {
    var l = R.clone(listing);
    (l.units || []).forEach(function (u, i) {
      if (R.isNum(rentOverride[i])) u.currentRent = rentOverride[i];
    });
    return l;
  }

  /* ---------- Controls panel ---------- */
  function fmtVal(c, v) {
    if (!R.isNum(v)) return "";
    var d = c.step < 1 ? (String(c.step).split(".")[1] || "").length : 0;
    return String(+v.toFixed(Math.max(d, c.kind === "pct" ? 3 : d)));
  }
  function controlHTML(c) {
    var id = "a-" + c.key, v = vals[c.key];
    var unit = c.kind === "pct" ? "%" : c.kind === "money" ? "$" : (c.unit || "");
    return '<div class="ctl" data-key="' + c.key + '"' + (c.mgmt && !mgmtOn ? " hidden" : "") + ">" +
      '<label for="' + id + '">' + esc(c.label) + "</label>" +
      '<div class="numwrap' + (c.kind === "money" ? " prefix" : "") + '"><input id="' + id + '" type="number" inputmode="decimal" step="' + c.step + '" min="0" value="' + fmtVal(c, v) + '"><span class="unit" aria-hidden="true">' + esc(unit) + "</span></div>" +
      '<input type="range" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + (R.isNum(v) ? v : c.min) + '" aria-label="' + esc(c.label) + ' slider" tabindex="-1">' +
      "</div>";
  }
  function renderControls() {
    var html = "", group = "";
    CONTROLS.forEach(function (c) {
      if (c.group !== group) {
        if (group) html += "</div>";
        group = c.group;
        html += '<div class="assump-group"><h3>' + esc(group) + "</h3>";
        if (group === "Management") {
          html += '<label class="switch" style="margin-bottom:14px"><input type="checkbox" id="a-mgmt"' + (mgmtOn ? " checked" : "") +
            '><span class="track" aria-hidden="true"></span>Hire a property manager</label>' +
            '<p class="small muted" id="mgmt-note" style="margin:-4px 0 12px">' + (mgmtOn ? "Professional management fees included." : "Self-managed: no management fee.") + "</p>";
        }
      }
      html += controlHTML(c);
    });
    html += "</div>";
    html += '<div class="assump-group unit-rents"><h3>Rent per unit (per month)</h3><div id="rent-ctls"></div>' +
      '<button type="button" class="link-btn" id="rent-reset">Reset rents to estimate</button></div>';
    $("controls").innerHTML = html;
    renderRentControls();
  }
  function renderRentControls() {
    var units = (lastRent && lastRent.units) || [];
    $("rent-ctls").innerHTML = (listing.units || []).map(function (u, i) {
      var est = units[i] || {};
      var v = R.isNum(rentOverride[i]) ? rentOverride[i] : est.rent;
      var label = (listing.unitCount > 1 ? "Unit " + (i + 1) + " · " : "") + (R.isNum(u.beds) ? u.beds + " bd" : "") + (R.isNum(u.baths) ? " / " + u.baths + " ba" : "");
      return '<div class="ctl"><label for="rent-' + i + '">' + esc(label || "Rent") + '<span class="hint" style="display:block;font-weight:400" id="rent-src-' + i + '">' + esc(sourceText(i, est)) + "</span></label>" +
        '<div class="numwrap prefix"><input id="rent-' + i + '" data-unit="' + i + '" type="number" inputmode="numeric" min="0" step="25" value="' + (R.isNum(v) ? Math.round(v) : "") + '"><span class="unit" aria-hidden="true">$</span></div></div>';
    }).join("");
  }
  function sourceText(i, est) {
    if (R.isNum(rentOverride[i])) return "Your number" + (R.isNum(est.marketRent) ? " · HUD " + money(est.marketRent) : "");
    return sourceLabel(est);
  }
  function sourceLabel(u) {
    if (!u || !u.source) return "";
    if (u.source === "missing") return "No rent data — enter a rent";
    if (u.source === "current lease") return "Current lease" + (R.isNum(u.marketRent) ? " · HUD " + money(u.marketRent) : "");
    return u.source === "HUD SAFMR" ? "HUD Small Area FMR (ZIP)" : u.source === "HUD county FMR" ? "HUD county FMR" : u.source;
  }
  function syncControl(c) {
    var wrap = document.querySelector('.ctl[data-key="' + c.key + '"]');
    if (!wrap) return;
    var num = wrap.querySelector('input[type="number"]'), rng = wrap.querySelector('input[type="range"]');
    if (document.activeElement !== num) num.value = fmtVal(c, vals[c.key]);
    if (R.isNum(vals[c.key])) rng.value = vals[c.key];
  }

  function wireControls() {
    var panel = $("controls");
    panel.addEventListener("input", function (e) {
      var t = e.target;
      if (t.hasAttribute("data-unit")) {
        var i = +t.getAttribute("data-unit"), v = parseFloat(t.value);
        rentOverride[i] = isFinite(v) && v >= 0 ? v : null;
        update();
        var src = $("rent-src-" + i);
        if (src) src.textContent = sourceText(i, (lastRent.units || [])[i] || {});
        return;
      }
      var wrap = t.closest(".ctl[data-key]");
      if (!wrap) return;
      var key = wrap.getAttribute("data-key");
      var c = CONTROLS.filter(function (x) { return x.key === key; })[0];
      var val = parseFloat(t.value);
      if (!isFinite(val) || val < 0) return;
      vals[key] = val;
      touched[key] = true;
      syncControl(c);
      markCustom();
      update();
    });
    panel.addEventListener("change", function (e) {
      if (e.target.id === "a-mgmt") {
        mgmtOn = e.target.checked;
        Array.prototype.forEach.call(panel.querySelectorAll(".ctl[data-key]"), function (w) {
          var c = CONTROLS.filter(function (x) { return x.key === w.getAttribute("data-key"); })[0];
          if (c && c.mgmt) w.hidden = !mgmtOn;
        });
        $("mgmt-note").textContent = mgmtOn ? "Professional management fees included." : "Self-managed: no management fee.";
        markCustom();
        update();
      }
    });
    panel.addEventListener("click", function (e) {
      if (e.target.id === "rent-reset") { rentOverride = []; update(); renderRentControls(); }
    });
    $("presets").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-preset]");
      if (!b) return;
      loadPreset(b.getAttribute("data-preset"));
      setPresetButtons(presetKey);
      renderControls();
      update();
    });
  }
  function setPresetButtons(key) {
    Array.prototype.forEach.call($("presets").querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-preset") === key ? "true" : "false");
    });
    $("preset-status").textContent = "Using " + R.PRESET_LABELS[key] + " assumptions.";
  }
  function markCustom() {
    $("preset-status").textContent = "Custom — started from " + R.PRESET_LABELS[presetKey] + ".";
  }

  /* ---------- Output ---------- */
  function update() {
    var a = buildAssumptions();
    var r;
    try { r = CashFlow.analyze(listingWithRents(), HUD_RENTS, a); }
    catch (err) { $("breakdown").innerHTML = R.engineErrorHTML(); if (window.console) console.error(err); return; }
    lastRent = r.rent;
    if (!R.isNum(vals.insuranceAnnual) && r.annual && R.isNum(r.annual.insurance)) {
      vals.insuranceAnnual = Math.round(r.annual.insurance);
      syncControl(CONTROLS.filter(function (c) { return c.key === "insuranceAnnual"; })[0]);
    }
    renderKPIs(r, a);
    renderBreakdown(r);
    renderChart(r);
    renderVerdict(r, a);
    renderTax(r);
    renderWarnings(r);
    renderRentSources(r);
  }

  function kpi(k, v, s, cls) {
    return '<div class="kpi' + (cls ? " " + cls : "") + '"><div class="k">' + esc(k) + '</div><div class="v">' + v + "</div>" + (s ? '<div class="s">' + s + "</div>" : "") + "</div>";
  }
  function renderKPIs(r, a) {
    var cf = r.monthly.cashFlow;
    $("kpis").innerHTML =
      kpi("Monthly cash flow", '<span class="' + (cf >= 0 ? "pos" : "neg") + '">' + money(cf, { sign: true }) + "</span>", '<span class="muted">' + money(r.annual.cashFlow, { sign: true }) + " per year</span>", "feature") +
      kpi("Per door / month", money(r.perDoor, { sign: true }), passLine(r.passes.perDoor, "goal " + money(R.minPerDoor(a)))) +
      kpi("Cash-on-cash", pct(r.cashOnCash), passLine(r.passes.cashOnCash, "goal " + pct(R.minCoC(a), 0))) +
      kpi("Cash needed", money(r.cash.totalCashNeeded), '<span class="muted">down + closing' + (r.cash.rehabReserve ? " + rehab" : "") + "</span>") +
      kpi("Cap rate", pct(r.capRate), '<span class="muted">DSCR ' + (R.isNum(r.dscr) ? r.dscr.toFixed(2) : "—") + "</span>");
    $("grade").className = "grade grade-" + (r.grade || "C");
    $("grade").innerHTML = '<span><span class="visually-hidden">Deal grade </span>' + esc(r.grade || "–") + "</span>";
  }
  function passLine(ok, goal) {
    return '<span class="' + (ok ? "pos" : "neg") + '">' + (ok ? "✓ Meets " : "✗ Below ") + esc(goal) + "</span>";
  }

  function row(label, m, cls, note) {
    return '<tr' + (cls ? ' class="' + cls + '"' : "") + "><td>" + esc(label) + (note ? ' <span class="muted small">' + esc(note) + "</span>" : "") +
      '</td><td class="num">' + money(m) + '</td><td class="num">' + money(m * 12) + "</td></tr>";
  }
  function neg(v) { return R.isNum(v) ? -v : v; }
  function renderBreakdown(r) {
    var m = r.monthly;
    var html = '<table class="breakdown"><caption class="visually-hidden">Monthly and yearly income, expenses and cash flow</caption>' +
      '<thead><tr><th scope="col">Line item</th><th scope="col" class="num">Monthly</th><th scope="col" class="num">Yearly</th></tr></thead><tbody>' +
      '<tr class="section"><td colspan="3">Income</td></tr>' +
      row("Gross rent", m.grossRent, "", (listing.unitCount > 1 ? listing.unitCount + " units" : "")) +
      row("Vacancy & unpaid rent", neg(m.vacancy), "sub") +
      row("Rent collected", R.isNum(m.effectiveRent) ? m.effectiveRent : m.grossRent - (m.vacancy || 0), "total") +
      '<tr class="section"><td colspan="3">Operating expenses</td></tr>' +
      row("Repairs", neg(m.repairs), "sub") +
      row("Capital reserves", neg(m.capex), "sub") +
      row("Management", neg(m.management), "sub", m.management ? "" : "(self-managed)") +
      (m.leasing ? row("Leasing fees", neg(m.leasing), "sub") : "") +
      row("Property tax", neg(m.propertyTax), "sub", "(investor rate)") +
      row("Insurance", neg(m.insurance), "sub") +
      (m.hoa ? row("HOA / association", neg(m.hoa), "sub") : "") +
      row("Owner-paid utilities", neg(m.utilities), "sub") +
      (m.otherExpenses ? row("Other (registration, inspections)", neg(m.otherExpenses), "sub") : "") +
      row("Total operating expenses", neg(m.operatingExpenses), "total") +
      row("Net operating income (NOI)", m.noi, "total") +
      '<tr class="section"><td colspan="3">Financing</td></tr>' +
      row("Mortgage (principal + interest)", neg(m.principalAndInterest), "sub") +
      (m.pmi ? row("Mortgage insurance (PMI)", neg(m.pmi), "sub") : "") +
      '<tr class="grand"><td>Cash flow</td><td class="num ' + (m.cashFlow >= 0 ? "pos" : "neg") + '">' + money(m.cashFlow, { sign: true }) +
        '</td><td class="num ' + (m.cashFlow >= 0 ? "pos" : "neg") + '">' + money(m.cashFlow * 12, { sign: true }) + "</td></tr>" +
      "</tbody></table>";
    $("breakdown").innerHTML = html;
    $("loan-line").innerHTML = "Loan " + money(r.loan.amount) + " at " + pct(r.loan.rate > 1 ? r.loan.rate / 100 : r.loan.rate, 3).replace(/0+%$/, "%").replace(/\.%$/, "%") +
      " for " + r.loan.termYears + " years · down payment " + money(r.cash.downPayment) + " · closing costs " + money(r.cash.closingCosts) +
      (r.cash.rehabReserve ? " · rehab reserve " + money(r.cash.rehabReserve) : "");
  }

  /* Waterfall: rent at the top, each cost steps down, cash flow at the bottom. */
  function renderChart(r) {
    var m = r.monthly;
    var steps = [
      { label: "Gross rent", v: m.grossRent, kind: "in" },
      { label: "Reserves", v: -((m.vacancy || 0) + (m.repairs || 0) + (m.capex || 0)), kind: "out", hint: "vacancy, repairs, CapEx" },
      { label: "Management", v: -((m.management || 0) + (m.leasing || 0)), kind: "out" },
      { label: "Property tax", v: -(m.propertyTax || 0), kind: "out" },
      { label: "Insurance", v: -(m.insurance || 0), kind: "out" },
      { label: "Utilities & other", v: -((m.utilities || 0) + (m.hoa || 0) + (m.otherExpenses || 0)), kind: "out" },
      { label: "Mortgage", v: -((m.principalAndInterest || 0) + (m.pmi || 0)), kind: "debt" },
      { label: "Cash flow", v: m.cashFlow, kind: "total" }
    ].filter(function (s) { return s.kind === "in" || s.kind === "total" || Math.round(s.v) !== 0; });

    var run = 0, lo = 0, hi = 0;
    steps.forEach(function (s) {
      if (s.kind === "in") { s.from = 0; s.to = s.v; run = s.v; }
      else if (s.kind === "total") { s.from = 0; s.to = s.v; }
      else { s.from = run; s.to = run + s.v; run = s.to; }
      lo = Math.min(lo, s.from, s.to); hi = Math.max(hi, s.from, s.to);
    });
    var W = 640, labelW = 150, valW = 86, rowH = 34, barH = 20, top = 6;
    var plotW = W - labelW - valW;
    var x = function (v) { return labelW + ((v - lo) / ((hi - lo) || 1)) * plotW; };
    var H = top + steps.length * rowH + 4;
    var colors = { "in": "#3A3A3A", out: "#F4A3BF", debt: "#ED135A" };
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-labelledby="wf-t wf-d">' +
      '<title id="wf-t">Where the rent goes each month</title>' +
      '<desc id="wf-d">Gross rent of ' + money(m.grossRent) + " minus operating costs and the mortgage leaves " + money(m.cashFlow, { sign: true }) + " of monthly cash flow. Full numbers are in the table.</desc>";
    // zero line
    svg += '<line x1="' + x(0) + '" x2="' + x(0) + '" y1="0" y2="' + H + '" stroke="#CDD2DA" stroke-width="1"/>';
    steps.forEach(function (s, i) {
      var y = top + i * rowH, x1 = x(Math.min(s.from, s.to)), x2 = x(Math.max(s.from, s.to));
      var w = Math.max(2, x2 - x1);
      var fill = s.kind === "total" ? (s.v >= 0 ? "#0F7B4F" : "#B42318") : colors[s.kind];
      var valText = (s.kind === "out" || s.kind === "debt") ? money(s.v) : money(s.v, { sign: s.kind === "total" });
      svg += '<g><title>' + esc(s.label + (s.hint ? " (" + s.hint + ")" : "") + ": " + valText + " per month") + "</title>" +
        '<rect x="0" y="' + (y - 4) + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' +
        '<text x="' + (labelW - 12) + '" y="' + (y + barH / 2 + 5) + '" text-anchor="end" font-size="13" fill="' + (s.kind === "total" ? "#1E1E1E" : "#555") + '" font-weight="' + (s.kind === "total" || s.kind === "in" ? 700 : 400) + '">' + esc(s.label) + "</text>" +
        '<rect x="' + x1 + '" y="' + y + '" width="' + w + '" height="' + barH + '" rx="4" fill="' + fill + '"/>' +
        '<text x="' + (W - 4) + '" y="' + (y + barH / 2 + 5) + '" text-anchor="end" font-size="13" fill="#1E1E1E" font-weight="' + (s.kind === "total" ? 700 : 500) + '" style="font-variant-numeric:tabular-nums">' + valText + "</text></g>";
      // connector to next step
      if (i < steps.length - 1 && s.kind !== "total") {
        svg += '<line x1="' + x(s.to) + '" x2="' + x(s.to) + '" y1="' + (y + barH) + '" y2="' + (y + rowH) + '" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="2 3"/>';
      }
    });
    svg += "</svg>";
    $("chart").innerHTML = svg;
  }

  function renderVerdict(r, a) {
    var ok = r.passes.overall;
    $("verdict").innerHTML =
      '<div class="notice ' + (ok ? "notice-ok" : "notice-info") + '" style="margin-bottom:12px"><strong>' +
        (ok ? "This property passes Realify’s cash-flow test." : "This property doesn’t pass both tests with these assumptions.") + "</strong> " +
        (ok ? "It clears both bars below." : "Try a lower price, a bigger down payment, or different rents to see what it would take.") + "</div>" +
      '<div class="verdict">' +
        '<div class="item ' + (r.passes.perDoor ? "ok" : "no") + '"><div class="k">Cash flow per door (goal ≥ ' + money(R.minPerDoor(a)) + ")</div><div class=\"v\">" + (r.passes.perDoor ? "✓ " : "✗ ") + money(r.perDoor, { sign: true }) + " / month</div></div>" +
        '<div class="item ' + (r.passes.cashOnCash ? "ok" : "no") + '"><div class="k">Cash-on-cash return (goal ≥ ' + pct(R.minCoC(a), 0) + ")</div><div class=\"v\">" + (r.passes.cashOnCash ? "✓ " : "✗ ") + pct(r.cashOnCash) + " / year</div></div>" +
      "</div>";
  }

  function renderTax(r) {
    var t = r.tax || {};
    var seller = t.sellerAnnual, inv = t.investorAnnual;
    var diff = (R.isNum(inv) && R.isNum(seller)) ? inv - seller : null;
    $("tax").innerHTML =
      '<p class="eyebrow">Michigan property tax</p>' +
      "<h2>Your tax bill won’t match the listing</h2>" +
      '<div class="tax-compare">' +
        '<div class="box"><div class="k">Seller pays today' + (listing.taxYear ? " (" + esc(listing.taxYear) + ")" : "") + '</div><div class="v">' + (R.isNum(seller) && seller > 0 ? money(seller) + '<span class="small muted"> /yr</span>' : "Not listed") + "</div></div>" +
        '<div class="arrow" aria-hidden="true">' + R.icons.arrowRight + "</div>" +
        '<div class="box after"><div class="k">You’d likely pay as an investor</div><div class="v">≈ ' + money(inv) + '<span class="small muted"> /yr</span></div></div>' +
      "</div>" +
      "<p>" + (diff != null && diff > 0 ? "That’s about <strong>" + money(diff) + " more per year</strong> (" + money(diff / 12) + "/month). " : "") +
        "Two Michigan rules cause this. When a home sells, its taxable value <strong>“uncaps”</strong> and resets to about half the sale price. And a rental doesn’t get the <strong>homestead (Principal Residence) exemption</strong>, so it pays roughly 18 extra school mills.</p>" +
      '<div class="formula">Investor tax ≈ ' + money(listing.price) + " × 50% × " + (R.isNum(t.millage) ? R.num(t.millage, 4) : "local") + " mills ÷ 1,000 = " + money(inv) + "/yr</div>" +
      '<p class="small muted" style="margin-top:10px">Rate used: ' + esc(t.jurisdiction || "local rate") +
        (t.verified === true ? " — from the 2025 county millage table." : " — an estimate; confirm on the parcel.") +
        " Rates vary by school district, and a mailing city can differ from the taxing township. Always confirm with the local assessor.</p>";
  }

  function renderWarnings(r) {
    // A rent the visitor typed in is treated by the engine as a "current lease";
    // drop the lease-vs-HUD warning for those units so it doesn't confuse them.
    var w = (r.warnings || []).filter(function (x) {
      var m = /^Unit (\d+): current lease/.exec(x);
      return !(m && R.isNum(rentOverride[+m[1] - 1]));
    }).map(function (x) {
      // The Conservative preset isn't offered on the site right now.
      return R.PRESET_KEYS.indexOf("conservative") < 0 ? x.replace(/\s*\(try the Conservative preset\)/, " (raise them under “Your assumptions”)") : x;
    });
    $("warnings").hidden = !w.length;
    $("warnings").innerHTML = w.length
      ? '<div class="notice notice-warn"><strong>Things to double-check</strong><ul>' + w.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>"
      : "";
  }

  function renderRentSources(r) {
    var units = (r.rent && r.rent.units) || [];
    $("rent-sources").innerHTML = '<table class="data-table"><caption class="visually-hidden">Rent used for each unit</caption><thead><tr><th scope="col">Unit</th><th scope="col">Beds</th><th scope="col" class="num">Rent / mo</th><th scope="col">Source</th></tr></thead><tbody>' +
      units.map(function (u, i) {
        var src = R.isNum(rentOverride[i]) ? "Your number" : (sourceLabel(u) || "—");
        return "<tr><td>" + (i + 1) + "</td><td>" + (R.isNum(u.beds) ? u.beds : "—") + '</td><td class="num">' + money(u.rent) + "</td><td>" + esc(src) + "</td></tr>";
      }).join("") +
      '<tr><td colspan="2"><strong>Total</strong></td><td class="num"><strong>' + money(r.rent && r.rent.total) + "</strong></td><td></td></tr></tbody></table>";
  }

  /* ---------- Static header info ---------- */
  function renderHeaderInfo() {
    var l = listing;
    document.title = l.address + ", " + l.city + " — Cash-flow analysis | Realify Properties";
    $("p-title").textContent = l.address;
    $("p-addr").textContent = l.city + ", " + (l.state || "MI") + " " + (l.zip || "") + " · " + l.county + " County";
    $("p-price").textContent = money(l.price);
    $("p-price-sub").textContent = (l.unitCount > 1 ? money(l.price / l.unitCount) + " per unit" : R.typeLabel(l.propertyType)) + (l.daysOnMarket != null ? " · " + l.daysOnMarket + " days on market" : "");
    var badges = [R.typeLabel(l.propertyType)];
    if (l.unitCount > 1) badges.push(l.unitCount + " units");
    if (R.isNum(l.beds)) badges.push(l.beds + " beds");
    if (R.isNum(l.baths)) badges.push(l.baths + " baths");
    if (R.isNum(l.sqft) && l.sqft) badges.push(R.num(l.sqft) + " sq ft");
    if (l.yearBuilt) badges.push("Built " + l.yearBuilt);
    $("p-badges").innerHTML = (l.isMock !== false ? '<span class="chip mock">' + R.icons.alert + "Hypothetical sample listing</span>" : "") +
      badges.map(function (b) { return '<span class="chip">' + esc(b) + "</span>"; }).join("");
    $("p-media").innerHTML = R.placeholderSVG(l) + (l.isMock !== false ? '<span class="ribbon" aria-hidden="true">MOCK DATA</span>' : "") +
      '<span class="grade" id="grade"></span>';

    var facts = [
      ["MLS #", l.mlsNumber], ["Status", l.status], ["Year built", l.yearBuilt], ["Lot", R.isNum(l.lotAcres) ? l.lotAcres + " acres" : null],
      ["HOA", l.hoaMonthly ? money(l.hoaMonthly) + "/mo" : "None"], ["Listed", l.onMarketDate ? String(l.onMarketDate).slice(0, 10) : null],
      ["Listing office", l.listOffice], ["Listing agent", l.listAgent]
    ].filter(function (f) { return f[1] != null && f[1] !== ""; });
    $("p-facts").innerHTML = facts.map(function (f) { return "<div><dt>" + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd></div>"; }).join("");
    $("p-remarks").textContent = l.remarks || "";
    $("p-attrib").innerHTML = "Listing courtesy of <strong>" + esc(l.listOffice || "[listing office]") + "</strong>" +
      (l.listAgent ? ", " + esc(l.listAgent) : "") + (l.mlsNumber ? " · MLS# " + esc(l.mlsNumber) : "") +
      (l.isMock !== false ? " · <em>Hypothetical sample data — not a real listing.</em>" : "");
  }

  function notFound(msg) {
    $("prop-root").innerHTML = '<div class="container section"><div class="empty">' + R.icons.search +
      "<h3>" + esc(msg || "We couldn’t find that property") + "</h3><p>It may have sold or been removed. Browse the current list instead.</p>" +
      '<a class="btn btn-primary" href="index.html">See all listings</a></div></div>';
  }

  function init() {
    var missing = R.engineMissing();
    if (missing.length) { $("prop-root").innerHTML = '<div class="container section">' + R.engineErrorHTML(missing) + "</div>"; return; }
    var id = R.qs("id");
    var all;
    try { all = R.loadListings(); } catch (e) { notFound("The listings couldn’t load"); return; }
    listing = all.filter(function (l) { return String(l.id) === String(id) || String(l.mlsNumber) === String(id); })[0];
    if (!listing) { notFound(); return; }
    rentOverride = [];
    loadPreset(R.currentPresetKey());
    renderHeaderInfo();
    // First pass fills in the estimated rents and insurance before the controls are drawn.
    update();
    renderControls();
    wireControls();
    setPresetButtons(presetKey);
    update();
    RealifyLeadForm.mount($("lead-form"), { propertyId: listing.id, propertyAddress: listing.address + ", " + listing.city + ", " + (listing.state || "MI") + " " + (listing.zip || ""), mlsNumber: listing.mlsNumber });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
