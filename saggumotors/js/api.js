/*
  Booking connection used by the page.
  - If the Node server is running, every call goes to /api (the real, shared bookings).
  - If not (static hosting, opening the file directly, previews), it falls back to demo mode:
    the same rules from booking-core.js, saved only in this browser.
*/
window.SagguAPI = (function () {
  "use strict";
  var CFG = window.SAGGU_CONFIG, B = window.SagguBooking;
  var mode = null, mem = B.emptyState(), KEY = "saggu.demo.v1";

  function loadLocal() {
    try { var s = window.localStorage.getItem(KEY); if (s) { var o = JSON.parse(s); if (o && o.bookings) { o.blockedDates = o.blockedDates || []; o.branchBlocked = o.branchBlocked || {}; return o; } } } catch (e) {}
    return mem;
  }
  function saveLocal(st) { mem = st; try { window.localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  function detect() {
    if (mode) return Promise.resolve(mode);
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 1500);
    return fetch("api/health", { cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(timer); mode = j && j.ok && j.app === "saggu" ? "server" : "local"; return mode; })
      .catch(function () { clearTimeout(timer); mode = "local"; return mode; });
  }

  function call(method, url, body, headers) {
    return fetch(url, {
      method: method, cache: "no-store",
      headers: Object.assign(body ? { "Content-Type": "application/json" } : {}, headers || {}),
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { return r.json().catch(function () { return { ok: false, code: "error", message: "Unexpected reply from the server." }; }); })
      .catch(function () { return { ok: false, code: "network", message: "Can't reach the garage server. Check your connection and try again." }; });
  }

  function now() { return B.nowInZone(CFG.booking); }

  return {
    mode: function () { return mode; },
    ready: detect,
    today: function () { return now().date; },

    availability: function (from, to, branch) {
      return detect().then(function (m) {
        if (m === "server") return call("GET", "api/availability?from=" + from + "&to=" + to + "&branch=" + encodeURIComponent(branch || "")).then(function (r) { return r.ok ? r.days : null; });
        return B.availability(loadLocal(), CFG, now(), from, to, branch);
      });
    },
    create: function (input) {
      return detect().then(function (m) {
        if (m === "server") return call("POST", "api/bookings", input);
        var st = loadLocal(), r = B.createBooking(st, input, CFG, now());
        if (r.ok) { saveLocal(st); r.email = "off"; }
        return r;
      });
    },
    lookup: function (input) {
      return detect().then(function (m) {
        if (m === "server") return call("POST", "api/bookings/lookup", input);
        return B.lookup(loadLocal(), input);
      });
    },
    cancel: function (input) {
      return detect().then(function (m) {
        if (m === "server") return call("POST", "api/bookings/cancel", input);
        var st = loadLocal(), r = B.cancelMine(st, input, CFG, now());
        if (r.ok) saveLocal(st);
        return r;
      });
    },

    /* owner page */
    admin: {
      overview: function (pin) {
        return detect().then(function (m) {
          if (m === "server") return call("GET", "api/admin/overview", null, { "x-admin-pin": pin || "" });
          var st = loadLocal(), n = now();
          var up = st.bookings.filter(function (b) { return B.diffDays(n.date, b.date) >= 0; })
            .sort(function (a, b) { return a.date.localeCompare(b.date) || a.bay - b.bay; });
          return { ok: true, today: n, capacity: CFG.booking.bays.length, bookings: up, blockedDates: st.blockedDates, branchBlocked: st.branchBlocked || {}, email: "off" };
        });
      },
      cancel: function (pin, token) {
        return detect().then(function (m) {
          if (m === "server") return call("POST", "api/admin/cancel", { token: token }, { "x-admin-pin": pin });
          var st = loadLocal(), r = B.adminCancel(st, token); if (r.ok) saveLocal(st); return r;
        });
      },
      block: function (pin, date, blocked, branch) {
        return detect().then(function (m) {
          if (m === "server") return call("POST", "api/admin/block", { date: date, blocked: blocked, branch: branch || "" }, { "x-admin-pin": pin });
          var st = loadLocal(), r = B.setBlocked(st, date, blocked, branch, CFG); if (r.ok) saveLocal(st); return r;
        });
      }
    }
  };
})();
