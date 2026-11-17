/*
  Booking section: calendar, five-bay board, form, ticket, "find my booking".
  Talks to SagguAPI only; the rules live in booking-core.js.
*/
window.SagguBookingUI = (function () {
  "use strict";
  var CFG = window.SAGGU_CONFIG, B = window.SagguBooking, API = window.SagguAPI;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var BR = B.branches(CFG), MULTI = BR.length > 1;
  var st = { days: {}, today: "", selected: null, bay: null, view: null, mine: null, pending: false, branch: BR[0].id };
  function branchName(id) { var b = B.branchById(CFG, id || BR[0].id); return b ? b.name : ""; }
  var el = {};

  /* ---------- formatting ---------- */
  function d(date) { return new Date(date + "T00:00:00Z"); }
  function fmtShort(date) { return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d(date)); }
  function fmtLong(date) { return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d(date)); }
  function fmtMonth(y, m) { return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m, 1))); }
  function fmtTime(t) { var p = t.split(":"), h = +p[0], ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return h + ":" + p[1] + " " + ap; }
  function serviceName(id) { if (id === "checkup") return "Not sure, needs a check-up"; var s = CFG.services.filter(function (x) { return x.id === id; })[0]; return s ? s.title : id; }
  function bayTime(n) { return CFG.booking.bays.filter(function (b) { return b.n === n; })[0].time; }
  function text(node, s) { node.textContent = s; }

  /* ---------- data ---------- */
  function refresh() {
    var today = API.today(), to = B.addDays(today, CFG.booking.advanceDays);
    var asked = st.branch;
    return API.availability(today, to, asked).then(function (days) {
      if (asked !== st.branch) return; // the customer switched branch while this was loading
      if (!days) return;
      st.today = today; st.days = {};
      days.forEach(function (x) { st.days[x.date] = x; });
      if (!st.view) { st.view = { y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 }; }
      renderCal(); renderBoard(false); renderChip(); renderMode();
    });
  }

  function renderMode() {
    if (API.mode() === "local") {
      el.mode.hidden = false;
      text(el.mode, "Demo mode: bookings on this preview are saved only in this browser. Run server.js to share one live schedule between all customers.");
    } else el.mode.hidden = true;
  }

  function renderChip() {
    var chip = $("#liveChip"), t = $("#liveChipText");
    if (!chip || !st.today) return;
    var cap = CFG.booking.bays.length, today = st.days[st.today], where = MULTI ? branchName(st.branch) + ", " : "";
    chip.classList.remove("is-closed");
    if (today && !today.closed && today.free > 0) { text(t, "Today at " + (MULTI ? branchName(st.branch) : "the garage") + ": " + today.free + " of " + cap + " bays open"); return; }
    var next = null, k = st.today;
    for (var i = 0; i < 40 && !next; i++) { k = B.addDays(k, 1); var s = st.days[k]; if (s && !s.closed && s.free > 0) next = s; }
    chip.classList.add("is-closed");
    text(t, next ? where + "next open day: " + fmtShort(next.date) + ", " + next.free + " of " + cap + " bays free" : (MULTI ? branchName(st.branch) + " is fully booked for now" : "Fully booked for now"));
  }

  /* ---------- calendar ---------- */
  function renderCal() {
    var v = st.view, first = new Date(Date.UTC(v.y, v.m, 1)), lead = (first.getUTCDay() + 6) % 7;
    var count = new Date(Date.UTC(v.y, v.m + 1, 0)).getUTCDate(), html = "", cap = CFG.booking.bays.length;
    text(el.calTitle, fmtMonth(v.y, v.m));
    el.calDays.textContent = "";
    for (var b = 0; b < lead; b++) el.calDays.appendChild(document.createElement("span"));
    for (var n = 1; n <= count; n++) {
      var date = v.y + "-" + ("0" + (v.m + 1)).slice(-2) + "-" + ("0" + n).slice(-2);
      var s = st.days[date], btn = document.createElement("button");
      btn.type = "button"; btn.className = "day"; btn.dataset.date = date;
      var num = document.createElement("span"); num.textContent = n; btn.appendChild(num);
      if (date === st.today) btn.classList.add("is-today");
      if (!s || s.closed) {
        btn.disabled = true;
        btn.setAttribute("aria-label", fmtLong(date) + ", closed");
      } else if (s.free === 0) {
        btn.disabled = true; btn.classList.add("is-full");
        var f = document.createElement("span"); f.className = "day__full"; f.textContent = "Full"; btn.appendChild(f);
        btn.setAttribute("aria-label", fmtLong(date) + ", fully booked");
      } else {
        var pips = document.createElement("span"); pips.className = "day__pips"; pips.setAttribute("aria-hidden", "true");
        for (var p = 1; p <= cap; p++) {
          var i = document.createElement("i");
          if (s.taken.indexOf(p) !== -1 || s.passed.indexOf(p) !== -1) i.className = "is-taken";
          pips.appendChild(i);
        }
        btn.appendChild(pips);
        btn.setAttribute("aria-label", fmtLong(date) + ", " + s.free + " of " + cap + " bays open");
        if (date === st.selected) { btn.classList.add("is-selected"); btn.setAttribute("aria-pressed", "true"); }
      }
      el.calDays.appendChild(btn);
    }
    var tv = { y: +st.today.slice(0, 4), m: +st.today.slice(5, 7) - 1 };
    var last = B.addDays(st.today, CFG.booking.advanceDays), lv = { y: +last.slice(0, 4), m: +last.slice(5, 7) - 1 };
    el.calPrev.disabled = v.y * 12 + v.m <= tv.y * 12 + tv.m;
    el.calNext.disabled = v.y * 12 + v.m >= lv.y * 12 + lv.m;
  }

  /* ---------- bays ---------- */
  function renderBoard(animate) {
    var s = st.selected && st.days[st.selected];
    if (!st.selected && !el.ticket.hidden) return; // keep the "You're booked" heading while the ticket shows
    if (!s || s.closed || s.free === 0) {
      if (st.selected) { st.selected = null; st.bay = null; }
      text(el.boardTitle, "Choose a day");
      text(el.boardSub, "Pick a day on the calendar to see its " + CFG.booking.bays.length + " bays.");
      el.bays.hidden = true; el.form.hidden = true; return;
    }
    text(el.boardTitle, fmtLong(st.selected));
    text(el.boardSub, s.free + " of " + s.capacity + " bays open. Pick one.");
    el.bays.hidden = false; el.bays.textContent = "";
    CFG.booking.bays.forEach(function (bay) {
      var taken = s.taken.indexOf(bay.n) !== -1, passed = s.passed.indexOf(bay.n) !== -1;
      var b = document.createElement("button"); b.type = "button"; b.className = "bay"; b.dataset.bay = bay.n;
      b.innerHTML = '<span class="bay__lab">Bay</span><span class="bay__no"></span><span class="bay__time"></span><span class="bay__state"></span>';
      b.querySelector(".bay__no").textContent = bay.n;
      b.querySelector(".bay__time").textContent = fmtTime(bay.time);
      var stt = b.querySelector(".bay__state");
      if (taken) { b.disabled = true; stt.textContent = "Booked"; b.setAttribute("aria-label", "Bay " + bay.n + ", booked"); }
      else if (passed) { b.disabled = true; stt.textContent = "Time passed"; b.setAttribute("aria-label", "Bay " + bay.n + ", time passed"); }
      else { stt.textContent = "Open"; b.setAttribute("aria-label", "Bay " + bay.n + ", drop-off " + fmtTime(bay.time) + ", open"); }
      if (st.bay === bay.n && !taken && !passed) { b.classList.add("is-selected"); b.setAttribute("aria-pressed", "true"); }
      el.bays.appendChild(b);
    });
    if (st.bay && (s.taken.indexOf(st.bay) !== -1 || s.passed.indexOf(st.bay) !== -1)) { st.bay = null; el.form.hidden = true; }
    if (animate && window.gsap && !reduce) window.gsap.from(el.bays.children, { y: 22, opacity: 0, duration: .5, stagger: .07, ease: "power3.out", clearProps: "transform,opacity" });
  }

  function showForm() {
    if (!st.bay) { el.form.hidden = true; return; }
    el.form.hidden = false;
    text(el.formPick, (MULTI ? branchName(st.branch) + ", " : "") + "Bay " + st.bay + ", drop-off at " + fmtTime(bayTime(st.bay)) + " on " + fmtShort(st.selected));
    text(el.confirm, "Confirm bay " + st.bay);
    el.error.hidden = true;
  }

  function selectDay(date) {
    st.selected = date; st.bay = null; el.ticket.hidden = true; el.form.hidden = true;
    renderCal(); renderBoard(true);
    var tgt = $("#board"); if (window.innerWidth < 900 && tgt) scrollTo(tgt);
  }

  function selectBay(n) {
    st.bay = n; renderBoard(false); showForm();
    if (window.gsap && !reduce) window.gsap.from(el.form, { y: 16, opacity: 0, duration: .45, ease: "power3.out", clearProps: "transform,opacity" });
    var f = $("#fName"); if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
    scrollTo(el.form);
  }

  function scrollTo(node) {
    if (window.sagguScrollTo) window.sagguScrollTo(node, { offset: -110 });
    else node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  /* ---------- booking ---------- */
  function fieldFor(name) { var m = { name: "#fName", phone: "#fPhone", email: "#fEmail", vehicle: "#fVehicle", service: "#fService" }; return m[name] ? $(m[name]) : null; }
  function clearErrors() { el.form.querySelectorAll(".has-error").forEach(function (x) { x.classList.remove("has-error"); }); }

  function showError(r) {
    clearErrors();
    el.error.hidden = false; text(el.error, r.message || "Could not book. Try again.");
    var f = fieldFor(r.field); if (f) { f.parentNode.classList.add("has-error"); f.focus(); }
  }

  function submit(e) {
    e.preventDefault();
    if (st.pending) return;
    if (!st.selected || !st.bay) { showError({ message: "Pick a day and a bay first." }); return; }
    var fd = new FormData(el.form);
    var input = { branch: st.branch, date: st.selected, bay: st.bay, name: fd.get("name"), phone: fd.get("phone"), email: fd.get("email"), vehicle: fd.get("vehicle"), service: fd.get("service"), notes: fd.get("notes"), website: fd.get("website") };
    st.pending = true; el.confirm.disabled = true; text(el.confirm, "Booking your bay");
    API.create(input).then(function (r) {
      st.pending = false; el.confirm.disabled = false;
      if (r.ok) { onBooked(r.booking, input, r.email); return; }
      showError(r);
      if (r.code === "bay_taken" || r.code === "day_full" || r.code === "bay_passed" || r.code === "day_closed") {
        return refresh().then(function () { showForm(); if (!st.bay) { text(el.boardSub, r.message); } });
      }
      text(el.confirm, "Confirm bay " + st.bay);
    });
  }

  function onBooked(b, input, emailState) {
    st.mine = b;
    text($("#tBay"), b.bay);
    text($("#tBranch"), branchName(b.branch));
    var note = $("#tEmail");
    if (note) {
      var addr = b.email || input.email;
      text(note, emailState === "queued" ? "A confirmation is on its way to " + addr + ". Check your spam folder if it does not arrive."
        : "Confirmation emails are not switched on for this site yet, so no email was sent. Please save the token below.");
      note.classList.toggle("is-warn", emailState !== "queued");
    }
    text($("#tWhen"), fmtLong(b.date) + ", drop-off at " + fmtTime(b.time || bayTime(b.bay)));
    text($("#tName"), b.name || input.name);
    text($("#tCar"), b.vehicle || input.vehicle);
    text($("#tService"), serviceName(b.service || input.service));
    text($("#tToken"), b.token);
    el.form.hidden = true; el.bays.hidden = true; el.ticket.hidden = false;
    text(el.boardTitle, "You're booked");
    text(el.boardSub, "Your bay is held for you. Save the token below.");
    el.form.reset(); st.bay = null; st.selected = null;
    refresh();
    if (window.gsap && !reduce) window.gsap.from(el.ticket, { y: -50, rotation: -3, opacity: 0, duration: 1.1, ease: "elastic.out(1,.55)", clearProps: "transform,opacity" });
    scrollTo(el.ticket);
  }

  function copyDetails() {
    var b = st.mine; if (!b) return;
    var line = "Saggu Motor Garage, " + (MULTI ? branchName(b.branch) : CFG.city) + "\nBay " + b.bay + ", " + fmtLong(b.date) + ", drop-off " + fmtTime(b.time || bayTime(b.bay)) + "\nToken: " + b.token + "\nCar: " + b.vehicle;
    function done() { var o = el.copy.textContent; text(el.copy, "Copied"); setTimeout(function () { text(el.copy, o); }, 1600); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(line).then(done, fallback); else fallback();
    function fallback() { var t = document.createElement("textarea"); t.value = line; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (e) { text(el.copy, "Select and copy manually"); } document.body.removeChild(t); }
  }

  function again() {
    el.ticket.hidden = true; st.selected = null; st.bay = null; st.mine = null;
    renderCal(); renderBoard(false); scrollTo($("#cal"));
  }

  /* ---------- find / cancel ---------- */
  var found = null, armed = null;
  function lookup(e) {
    e.preventDefault();
    var input = { phone: $("#mPhone").value, token: $("#mToken").value };
    API.lookup(input).then(function (r) {
      el.mResult.hidden = false; el.cancel.hidden = true; found = null; text(el.cancel, "Cancel this booking");
      el.mResult.classList.toggle("is-bad", !r.ok);
      if (!r.ok) { text(el.mResult, r.message); return; }
      var b = r.booking; found = { phone: input.phone, token: input.token };
      var past = B.diffDays(st.today || API.today(), b.date) < 0;
      if (b.status === "cancelled") text(el.mResult, (MULTI ? branchName(b.branch) + ", " : "") + "Bay " + b.bay + " on " + fmtShort(b.date) + " was cancelled.");
      else {
        text(el.mResult, (MULTI ? branchName(b.branch) + ", " : "") + "Bay " + b.bay + " on " + fmtLong(b.date) + ", drop-off at " + fmtTime(b.time) + ". " + b.vehicle + ", " + serviceName(b.service) + ".");
        if (!past) el.cancel.hidden = false;
      }
    });
  }
  function cancel() {
    if (!found) return;
    if (armed !== found.token) { armed = found.token; text(el.cancel, "Tap again to cancel"); setTimeout(function () { armed = null; text(el.cancel, "Cancel this booking"); }, 4000); return; }
    API.cancel(found).then(function (r) {
      armed = null; el.cancel.hidden = true; el.mResult.classList.toggle("is-bad", !r.ok);
      text(el.mResult, r.ok ? "Cancelled. Bay " + r.booking.bay + " on " + fmtShort(r.booking.date) + " is open again." : r.message);
      if (r.ok) refresh();
    });
  }

  /* ---------- setup ---------- */
  function fillService() {
    el.service.textContent = "";
    var o = document.createElement("option"); o.value = ""; o.textContent = "Choose a service"; o.disabled = true; o.selected = true; el.service.appendChild(o);
    CFG.services.forEach(function (s) { var x = document.createElement("option"); x.value = s.id; x.textContent = s.title; el.service.appendChild(x); });
    var c = document.createElement("option"); c.value = "checkup"; c.textContent = "Not sure, needs a check-up"; el.service.appendChild(c);
  }

  function renderBranches() {
    var wrap = $("#branchPick");
    if (!wrap) return;
    if (!MULTI) { wrap.hidden = true; return; }
    wrap.hidden = false;
    var box = $("#branchBtns"); box.textContent = "";
    BR.forEach(function (b) {
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "branch"; btn.dataset.branch = b.id;
      btn.setAttribute("role", "radio"); btn.setAttribute("aria-checked", b.id === st.branch ? "true" : "false");
      var n = document.createElement("strong"); n.textContent = b.name; btn.appendChild(n);
      if (b.address || b.city) { var a = document.createElement("span"); a.textContent = b.address || b.city; btn.appendChild(a); }
      if (b.id === st.branch) btn.classList.add("is-on");
      box.appendChild(btn);
    });
  }
  function pickBranch(id) {
    if (id === st.branch) return;
    st.branch = id; st.selected = null; st.bay = null; st.days = {};
    el.ticket.hidden = true; el.form.hidden = true;
    renderBranches();
    refresh().then(function () { renderBoard(false); });
    try { window.localStorage.setItem("saggu.branch", id); } catch (e) {}
  }

  function fillContact() {
    var ul = $("#footContact"), map = $("#mapLink");
    map.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(CFG.mapsQuery || (CFG.name + " " + CFG.city));
    function add(label, value, href) {
      if (!value) return; var li = document.createElement("li");
      if (href) { var a = document.createElement("a"); a.href = href; a.textContent = value; li.appendChild(a); } else li.textContent = value;
      ul.insertBefore(li, ul.firstChild);
    }
    var ig = document.getElementById("igLink"); if (ig && CFG.instagram) ig.href = CFG.instagram;
    if (MULTI) BR.slice().reverse().forEach(function (b) {
      if (b.phone) add(b.name, b.name + ": " + b.phone, "tel:" + b.phone.replace(/[^\d+]/g, ""));
      if (b.address) add(b.name, b.name + ": " + b.address);
    });
    add("Hours", CFG.hours);
    add("Address", CFG.address);
    if (CFG.whatsapp) add("WhatsApp", "WhatsApp us", "https://wa.me/" + CFG.whatsapp.replace(/\D/g, ""));
    if (CFG.phone) add("Phone", CFG.phone, "tel:" + CFG.phone.replace(/[^\d+]/g, ""));
  }

  function init() {
    ["cal", "calDays", "calTitle", "calPrev", "calNext", "board", "boardTitle", "boardSub", "bays", "bookForm", "formPick", "formError", "confirmBtn", "ticket", "copyBtn", "againBtn", "modeNote", "fService", "manageForm", "manageResult", "cancelBtn"]
      .forEach(function (id) { el[id] = document.getElementById(id); });
    el.form = el.bookForm; el.error = el.formError; el.confirm = el.confirmBtn; el.mode = el.modeNote; el.service = el.fService;
    el.mResult = el.manageResult; el.cancel = el.cancelBtn; el.copy = el.copyBtn; el.again = el.againBtn;

    try { var q = new URLSearchParams(window.location.search).get("branch"); if (q && B.branchById(CFG, q)) st.branch = q; } catch (e) {}
    try { var saved = !new URLSearchParams(window.location.search).get("branch") && window.localStorage.getItem("saggu.branch"); if (saved && B.branchById(CFG, saved)) st.branch = saved; } catch (e) {}
    fillService(); fillContact(); renderBranches();
    var bb = $("#branchBtns"); if (bb) bb.addEventListener("click", function (e) { var b = e.target.closest(".branch"); if (b) pickBranch(b.dataset.branch); });
    el.calDays.addEventListener("click", function (e) { var b = e.target.closest(".day"); if (b && !b.disabled) selectDay(b.dataset.date); });
    el.bays.addEventListener("click", function (e) { var b = e.target.closest(".bay"); if (b && !b.disabled) selectBay(+b.dataset.bay); });
    el.calPrev.addEventListener("click", function () { st.view.m--; if (st.view.m < 0) { st.view.m = 11; st.view.y--; } renderCal(); });
    el.calNext.addEventListener("click", function () { st.view.m++; if (st.view.m > 11) { st.view.m = 0; st.view.y++; } renderCal(); });
    el.form.addEventListener("submit", submit);
    el.form.addEventListener("input", function (e) { var p = e.target.closest(".field"); if (p) p.classList.remove("has-error"); });
    el.copy.addEventListener("click", copyDetails);
    el.again.addEventListener("click", again);
    el.manageForm.addEventListener("submit", lookup);
    el.cancel.addEventListener("click", cancel);

    API.ready().then(refresh);
    setInterval(function () { if (!document.hidden) refresh(); }, 45000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); });
  }

  // "Book this service" links on the services list call this.
  function pickService(id) {
    if (el.service) el.service.value = id;
    scrollTo(document.getElementById("book"));
  }

  return { init: init, pickService: pickService, refresh: refresh };
})();
