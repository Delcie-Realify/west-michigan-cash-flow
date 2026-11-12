/*
 * "Talk to Delcie" contact form
 * ------------------------------
 * Draws the contact form, checks the answers in the browser, and sends them to
 * Delcie's Google Apps Script (see lead-form/SETUP.md). The address it sends to is
 * LEAD_FORM_URL in assets/config.js. While that is empty, the form politely says
 * it isn't connected yet and sends nothing.
 *
 * Usage: RealifyLeadForm.mount(element, { propertyId, propertyAddress, mlsNumber })
 */
var RealifyLeadForm = (function () {
  "use strict";
  var R = Realify, esc = R.esc;
  var counter = 0;

  var INVESTOR_TYPES = [
    ["first-time", "First-time investor"],
    ["experienced", "Experienced investor"],
    ["out-of-state", "Out-of-state investor"]
  ];
  var BUDGETS = ["Under $150k", "$150k – $250k", "$250k – $400k", "$400k – $600k", "$600k+", "Not sure yet"];
  var TIMELINES = ["Ready now (0–3 months)", "3–6 months", "6–12 months", "Just researching"];

  function options(list, placeholder) {
    return '<option value="">' + esc(placeholder) + "</option>" + list.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(v) + '">' + esc(t) + "</option>";
    }).join("");
  }

  function field(id, label, control, opts) {
    opts = opts || {};
    return '<div class="field' + (opts.full ? " full" : "") + '">' +
      '<label for="' + id + '">' + esc(label) + (opts.required ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="muted small">(optional)</span>') + "</label>" +
      control +
      (opts.hint ? '<span class="hint" id="' + id + '-hint">' + esc(opts.hint) + "</span>" : "") +
      '<span class="err" id="' + id + '-err" aria-live="polite"></span>' +
      "</div>";
  }

  function validate(data) {
    var errs = {};
    if (!data.name || data.name.trim().length < 2) errs.name = "Please enter your name.";
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) errs.email = "Please enter a valid email address.";
    if (data.phone && data.phone.replace(/\D/g, "").length < 10) errs.phone = "Please enter a 10-digit phone number, or leave it blank.";
    if (!data.investorType) errs.investorType = "Please choose one.";
    if (data.message && data.message.length > 4000) errs.message = "Please keep your message under 4,000 characters.";
    return errs;
  }

  function mount(container, ctx) {
    if (!container) return;
    ctx = ctx || {};
    var n = ++counter, p = "lf" + n + "-";
    var started = Date.now();
    var cfg = R.config || {};

    var propLine = ctx.propertyAddress
      ? '<div class="about-prop">About: <strong>' + esc(ctx.propertyAddress) + "</strong>" +
        (ctx.mlsNumber ? ' · MLS# <span class="num">' + esc(ctx.mlsNumber) + "</span>" : "") + "</div>"
      : "";
    var defaultMsg = ctx.propertyAddress
      ? "I'd like to talk about " + ctx.propertyAddress + (ctx.mlsNumber ? " (MLS# " + ctx.mlsNumber + ")" : "") + "."
      : "";

    container.innerHTML =
      '<form novalidate aria-describedby="' + p + 'note">' +
        propLine +
        field(p + "name", "Full name", '<input id="' + p + 'name" name="name" type="text" autocomplete="name" required aria-describedby="' + p + 'name-err">', { required: true }) +
        field(p + "email", "Email", '<input id="' + p + 'email" name="email" type="email" autocomplete="email" required aria-describedby="' + p + 'email-err">', { required: true }) +
        field(p + "phone", "Phone", '<input id="' + p + 'phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" aria-describedby="' + p + 'phone-err">') +
        field(p + "investorType", "I am a…", '<select id="' + p + 'investorType" name="investorType" required aria-describedby="' + p + 'investorType-err">' + options(INVESTOR_TYPES, "Choose one") + "</select>", { required: true }) +
        field(p + "budget", "Budget", '<select id="' + p + 'budget" name="budget">' + options(BUDGETS, "Choose a range") + "</select>") +
        field(p + "timeline", "Timeline", '<select id="' + p + 'timeline" name="timeline">' + options(TIMELINES, "Choose a timeline") + "</select>") +
        field(p + "message", "Message", '<textarea id="' + p + 'message" name="message" rows="4" maxlength="4000" aria-describedby="' + p + 'message-err">' + esc(defaultMsg) + "</textarea>", { full: true }) +
        // Spam trap: people never see this box; bots fill it in.
        '<div class="hp" aria-hidden="true"><label for="' + p + 'website">Leave this empty</label><input id="' + p + 'website" name="website" type="text" tabindex="-1" autocomplete="off"></div>' +
        '<input type="hidden" name="propertyId" value="' + esc(ctx.propertyId || "") + '">' +
        '<input type="hidden" name="propertyAddress" value="' + esc(ctx.propertyAddress ? ctx.propertyAddress + (ctx.mlsNumber ? " (MLS# " + ctx.mlsNumber + ")" : "") : "") + '">' +
        '<div class="form-status" role="status" aria-live="polite"></div>' +
        '<div class="form-foot">' +
          '<p id="' + p + 'note">By sending, you agree that ' + esc(cfg.agentName || "Delcie") + ' may contact you about real estate. No spam, ever — your details are never sold.</p>' +
          '<button class="btn btn-primary" type="submit">Send to ' + esc((cfg.agentName || "Delcie").split(" ")[0]) + R.icons.arrowRight + "</button>" +
        "</div>" +
      "</form>";

    var form = container.querySelector("form");
    var status = form.querySelector(".form-status");
    var btn = form.querySelector('button[type="submit"]');

    function setErrors(errs) {
      ["name", "email", "phone", "investorType", "message"].forEach(function (k) {
        var input = form.querySelector('[name="' + k + '"]');
        var err = form.querySelector("#" + p + k + "-err");
        if (!input || !err) return;
        if (errs[k]) { input.setAttribute("aria-invalid", "true"); err.textContent = errs[k]; }
        else { input.removeAttribute("aria-invalid"); err.textContent = ""; }
      });
    }
    function showStatus(kind, html) {
      status.innerHTML = '<div class="notice notice-' + kind + '">' + html + "</div>";
    }
    function collect() {
      var fd = {};
      Array.prototype.forEach.call(form.elements, function (el) { if (el.name) fd[el.name] = (el.value || "").trim(); });
      fd.pageUrl = window.location.href;
      fd.elapsedMs = Date.now() - started;
      return fd;
    }

    // Clear an error as soon as the visitor fixes it.
    form.addEventListener("input", function (e) {
      var t = e.target;
      if (t.getAttribute("aria-invalid") === "true") {
        var errs = validate(collect());
        if (!errs[t.name]) { t.removeAttribute("aria-invalid"); var er = form.querySelector("#" + p + t.name + "-err"); if (er) er.textContent = ""; }
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = collect();
      var errs = validate(data);
      setErrors(errs);
      var keys = Object.keys(errs);
      if (keys.length) {
        showStatus("error", "Please fix the highlighted field" + (keys.length > 1 ? "s" : "") + ".");
        var first = form.querySelector('[name="' + keys[0] + '"]');
        if (first) first.focus();
        return;
      }
      var url = (cfg.LEAD_FORM_URL || "").trim();
      if (!url) {
        showStatus("info", "<strong>Thanks — this form isn’t connected yet.</strong> Nothing was sent. " +
          "Until it is, please reach " + esc(cfg.agentName || "Delcie") + " directly" +
          (cfg.phone ? " at " + R.cfgText("phone") : "") + (cfg.email ? (cfg.phone ? " or " : " at ") + R.cfgText("email") : "") + ".");
        return;
      }
      if (data.website) { // bot — pretend all is well, send nothing
        success();
        return;
      }
      btn.disabled = true;
      var oldLabel = btn.innerHTML;
      btn.textContent = "Sending…";
      send(url, data, cfg.LEAD_FORM_MODE === "no-cors").then(function (res) {
        if (res && res.ok) success();
        else {
          showStatus("error", "<strong>Sorry, that didn’t go through.</strong> " + esc((res && res.error) || "Please try again in a moment."));
          btn.disabled = false; btn.innerHTML = oldLabel;
        }
      }, function () {
        showStatus("error", "<strong>Sorry, we couldn’t reach the server.</strong> Check your connection and try again" +
          (cfg.email ? ", or email " + R.cfgText("email") : "") + ".");
        btn.disabled = false; btn.innerHTML = oldLabel;
      });
    });

    function success() {
      container.innerHTML = '<div class="notice notice-ok" role="status" tabindex="-1" style="padding:28px">' +
        '<h3 style="color:inherit;margin-bottom:6px">Thank you — your message is on its way.</h3>' +
        "<p style=\"margin:0;color:var(--text)\">" + esc(cfg.agentName || "Delcie") + " will get back to you personally, usually within one business day.</p></div>";
      var box = container.querySelector(".notice");
      if (box) box.focus();
    }
  }

  // Sends the form as plain text (JSON inside). Plain text avoids the browser's
  // "preflight" check, which Google Apps Script can't answer.
  function send(url, data, noCors) {
    var body = JSON.stringify(data);
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 20000) : null;
    var opts = { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body, redirect: "follow" };
    if (ctrl) opts.signal = ctrl.signal;
    if (noCors) opts.mode = "no-cors";
    return fetch(url, opts).then(function (resp) {
      if (timer) clearTimeout(timer);
      if (noCors) return { ok: true }; // can't read the reply in this mode — assume it arrived
      return resp.json().catch(function () { return { ok: false, error: "Unexpected reply from the form server." }; });
    }, function (err) { if (timer) clearTimeout(timer); throw err; });
  }

  return { mount: mount, validate: validate };
})();
if (typeof module !== "undefined") module.exports = RealifyLeadForm;
