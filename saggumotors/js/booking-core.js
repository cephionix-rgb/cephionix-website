/*
  Saggu Motor Garage - booking rules (shared by the browser and the Node server)

  One place decides everything: the 5-bays-a-day limit, closed days, past times,
  duplicate bookings and validation. The server calls this to protect the real data,
  and the browser calls the same code in demo mode (when no server is running).

  State shape:  { bookings: [ {...} ], blockedDates: [ "YYYY-MM-DD" ] }
  Functions mutate the state they are given and return { ok, ... }. The caller saves it.
*/
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SagguBooking = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

  /* ---------- date helpers (all dates are "YYYY-MM-DD" in the garage's time zone) ---------- */

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function nowInZone(cfg, d) {
    var date = d || new Date();
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: cfg.timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(date);
    var p = {};
    parts.forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + "-" + p.month + "-" + p.day, minutes: parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10) };
  }

  function isValidDate(s) {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10);
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function addDays(s, n) {
    var dt = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10) + n));
    return dt.getUTCFullYear() + "-" + pad(dt.getUTCMonth() + 1) + "-" + pad(dt.getUTCDate());
  }

  function weekday(s) { return new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))).getUTCDay(); }

  function diffDays(a, b) { // b - a in days
    var A = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
    var B = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
    return Math.round((B - A) / 86400000);
  }

  function timeToMinutes(t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; }

  /* ---------- branches ---------- */
  // A garage can have several branches. Each branch has its own set of bays and its own bookings.
  function branches(cfg) { return (cfg.branches && cfg.branches.length) ? cfg.branches : [{ id: "main", name: cfg.name || "Main branch" }]; }
  function branchById(cfg, id) { var l = branches(cfg); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function branchOf(b, cfg) { return b.branch || branches(cfg)[0].id; } // older bookings with no branch belong to the first one

  /* ---------- input cleaning ---------- */

  function clean(s, max) {
    return String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  }

  // Accepts 98765 43210, +91 98765 43210, 098765-43210 ... returns 10 digits or "".
  function normalizePhone(p) {
    var d = String(p == null ? "" : p).replace(/\D/g, "");
    if (d.length === 12 && d.indexOf("91") === 0) d = d.slice(2);
    if (d.length === 11 && d.charAt(0) === "0") d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : "";
  }

  function randomToken(rng) {
    var out = "";
    for (var i = 0; i < 5; i++) out += TOKEN_ALPHABET.charAt(Math.floor(rng() * TOKEN_ALPHABET.length));
    return out;
  }

  function defaultRng() {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      return function () { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; };
    }
    return Math.random;
  }

  /* ---------- availability ---------- */

  function activeOn(state, date, cfg, branch) {
    return state.bookings.filter(function (b) {
      return b.date === date && b.status === "confirmed" && (!branch || branchOf(b, cfg) === branch);
    });
  }

  function isBlocked(state, date, branch) {
    if (state.blockedDates.indexOf(date) !== -1) return true;
    var own = state.branchBlocked && state.branchBlocked[branch];
    return !!(own && own.indexOf(date) !== -1);
  }

  // Everything the website needs to draw one day.
  function dayStatus(state, date, cfg, now, branch) {
    var b = cfg.booking, total = b.bays.length;
    branch = branch || branches(cfg)[0].id;
    var out = { date: date, branch: branch, capacity: total, taken: [], passed: [], free: 0, closed: false, reason: "" };
    var delta = diffDays(now.date, date);
    if (delta < 0) { out.closed = true; out.reason = "past"; return out; }
    if (delta > b.advanceDays) { out.closed = true; out.reason = "too_far"; return out; }
    if (b.closedWeekdays.indexOf(weekday(date)) !== -1) { out.closed = true; out.reason = "weekday"; return out; }
    if (isBlocked(state, date, branch)) { out.closed = true; out.reason = "blocked"; return out; }

    activeOn(state, date, cfg, branch).forEach(function (x) { out.taken.push(x.bay); });
    if (delta === 0) {
      b.bays.forEach(function (bay) { if (timeToMinutes(bay.time) <= now.minutes) out.passed.push(bay.n); });
    }
    b.bays.forEach(function (bay) {
      if (out.taken.indexOf(bay.n) === -1 && out.passed.indexOf(bay.n) === -1) out.free++;
    });
    return out;
  }

  function availability(state, cfg, now, from, to, branch) {
    var days = [];
    var d = from;
    for (var i = 0; i < 400 && diffDays(d, to) >= 0; i++) { days.push(dayStatus(state, d, cfg, now, branch)); d = addDays(d, 1); }
    return days;
  }

  /* ---------- creating a booking ---------- */

  function fail(code, message, field) { return { ok: false, code: code, message: message, field: field || null }; }

  function validate(input, cfg) {
    var name = clean(input.name, 60);
    var phone = normalizePhone(input.phone);
    var vehicle = clean(input.vehicle, 60);
    var service = clean(input.service, 40);
    var notes = clean(input.notes, 300);
    var email = clean(input.email, 120).toLowerCase();
    var ids = cfg.services.map(function (s) { return s.id; }).concat(["checkup"]);

    if (name.length < 2) return fail("invalid", "Enter your name.", "name");
    if (!phone) return fail("invalid", "Enter a 10-digit mobile number.", "phone");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("invalid", "Enter a valid email address. We send your confirmation there.", "email");
    if (vehicle.length < 2) return fail("invalid", "Enter your car make and model.", "vehicle");
    if (ids.indexOf(service) === -1) return fail("invalid", "Choose a service.", "service");
    return { ok: true, value: { name: name, phone: phone, email: email, vehicle: vehicle, service: service, notes: notes } };
  }

  function createBooking(state, input, cfg, now, rng) {
    input = input || {};
    var v = validate(input, cfg);
    if (!v.ok) return v;

    var branch;
    if (branches(cfg).length > 1) {
      branch = branchById(cfg, String(input.branch || ""));
      if (!branch) return fail("invalid", "Choose a branch.", "branch");
    } else branch = branches(cfg)[0];

    var date = String(input.date || "");
    var bayNo = parseInt(input.bay, 10);
    if (!isValidDate(date)) return fail("invalid", "Pick a date.", "date");

    var status = dayStatus(state, date, cfg, now, branch.id);
    if (status.closed) {
      var why = { past: "That day has passed.", too_far: "Bookings open " + cfg.booking.advanceDays + " days ahead.", weekday: "The garage is closed that day.", blocked: "The garage is closed that day." }[status.reason];
      return fail("day_closed", why, "date");
    }
    var bay = null;
    cfg.booking.bays.forEach(function (x) { if (x.n === bayNo) bay = x; });
    if (!bay) return fail("invalid", "Pick a bay.", "bay");

    if (status.free === 0) return fail("day_full", "That day is fully booked. Pick another day.", "date");
    if (status.taken.indexOf(bay.n) !== -1) return fail("bay_taken", "Bay " + bay.n + " was just taken. Pick another bay.", "bay");
    if (status.passed.indexOf(bay.n) !== -1) return fail("bay_passed", "That drop-off time has passed. Pick a later bay.", "bay");

    // one booking per mobile number per day, across all branches
    var dupe = activeOn(state, date, cfg).some(function (x) { return x.phone === v.value.phone; });
    if (dupe) return fail("duplicate", "This number already has a booking on that day.", "phone");

    var r = rng || defaultRng();
    var token, tries = 0;
    do { token = randomToken(r); tries++; } while (tries < 50 && state.bookings.some(function (x) { return x.token === token; }));

    var booking = {
      token: token, branch: branch.id, date: date, bay: bay.n, time: bay.time,
      name: v.value.name, phone: v.value.phone, email: v.value.email, vehicle: v.value.vehicle,
      service: v.value.service, notes: v.value.notes,
      status: "confirmed", emailStatus: "none", createdAt: new Date().toISOString()
    };
    state.bookings.push(booking);
    return { ok: true, booking: booking };
  }

  /* ---------- finding and cancelling ---------- */

  function findMine(state, phone, token) {
    var p = normalizePhone(phone), t = clean(token, 10).toUpperCase();
    for (var i = 0; i < state.bookings.length; i++) {
      var b = state.bookings[i];
      if (b.token === t && b.phone === p) return b;
    }
    return null;
  }

  function lookup(state, input) {
    var b = findMine(state, input && input.phone, input && input.token);
    if (!b) return fail("not_found", "No booking matches that number and token.");
    return { ok: true, booking: b };
  }

  function cancelMine(state, input, cfg, now) {
    var b = findMine(state, input && input.phone, input && input.token);
    if (!b) return fail("not_found", "No booking matches that number and token.");
    if (b.status === "cancelled") return fail("already_cancelled", "That booking is already cancelled.");
    if (diffDays(now.date, b.date) < 0) return fail("past", "That booking is in the past.");
    b.status = "cancelled"; b.cancelledAt = new Date().toISOString();
    return { ok: true, booking: b };
  }

  function adminCancel(state, token) {
    for (var i = 0; i < state.bookings.length; i++) {
      if (state.bookings[i].token === token && state.bookings[i].status === "confirmed") {
        state.bookings[i].status = "cancelled"; state.bookings[i].cancelledAt = new Date().toISOString();
        return { ok: true, booking: state.bookings[i] };
      }
    }
    return fail("not_found", "Booking not found.");
  }

  // branch = a branch id to close just that branch, or empty to close every branch.
  function setBlocked(state, date, blocked, branch, cfg) {
    if (!isValidDate(date)) return fail("invalid", "Enter a valid date.");
    var list;
    if (branch && branch !== "all") {
      if (cfg && !branchById(cfg, branch)) return fail("invalid", "Unknown branch.");
      state.branchBlocked = state.branchBlocked || {};
      list = state.branchBlocked[branch] = state.branchBlocked[branch] || [];
    } else list = state.blockedDates;
    var i = list.indexOf(date);
    if (blocked && i === -1) list.push(date);
    if (!blocked && i !== -1) list.splice(i, 1);
    list.sort();
    return { ok: true };
  }

  function emptyState() { return { bookings: [], blockedDates: [], branchBlocked: {} }; }

  return {
    nowInZone: nowInZone, isValidDate: isValidDate, addDays: addDays, weekday: weekday, diffDays: diffDays,
    normalizePhone: normalizePhone, dayStatus: dayStatus, availability: availability,
    createBooking: createBooking, lookup: lookup, cancelMine: cancelMine, adminCancel: adminCancel,
    setBlocked: setBlocked, emptyState: emptyState, timeToMinutes: timeToMinutes,
    branches: branches, branchById: branchById, branchOf: branchOf
  };
});
