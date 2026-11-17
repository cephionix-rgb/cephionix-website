/*
  Saggu cursor: one ring that changes shape depending on what is under it.
  Used on every page. Desktop with a mouse only; phones and tablets never see it.

  The shape comes from a data attribute on the element (or any parent):
    data-cursor="link | pick | focus | spin | track | text | danger | off | social"
    data-cursor-label="Text shown inside the ring"
  A few areas get a shape automatically (see AUTO below), so most markup needs nothing.
*/
(function () {
  "use strict";
  if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ring = document.getElementById("cursor");
  if (!ring) { ring = document.createElement("div"); ring.id = "cursor"; ring.setAttribute("aria-hidden", "true"); document.body.appendChild(ring); }
  ring.className = "cursor";
  ring.innerHTML = '<span class="cursor__label"></span>';
  var label = ring.firstChild;
  var dot = document.createElement("i"); dot.className = "cursor__dot"; dot.setAttribute("aria-hidden", "true"); document.body.appendChild(dot);
  document.documentElement.classList.add("has-cursor");

  // [selector, state, label]  first match wins
  var AUTO = [
    ["[data-cursor]", null, null],
    [".day[disabled], .bay[disabled]", "off", ""],
    [".btn--danger", "danger", "Cancel"],
    [".day, .bay", "pick", "Pick"],
    [".branch", "pick", "Choose"],
    ["#igLink, .foot__ig, a[href*='instagram.com']", "social", "Insta"],
    ["input, textarea, select", "text", ""],
    ["#explodedCanvas, .fix__stage", "spin", "Scroll"],
    ["#visitPin", "track", "Scroll"],
    [".look__frame, .step__video, .about__media, .vid", "focus", "Watch"],
    ["a, button, summary, label", "link", ""]
  ];

  var x = -100, y = -100, rx = -100, ry = -100, on = false, raf = 0, state = "", text = "";

  function setState(s, t) {
    if (s === state && t === text) return;
    state = s; text = t;
    if (s) ring.setAttribute("data-state", s); else ring.removeAttribute("data-state");
    label.textContent = t || "";
    ring.classList.toggle("has-label", !!t);
    dot.classList.toggle("is-hidden", s === "pick" || s === "focus" || s === "spin" || s === "track" || s === "text" || s === "danger" || s === "social");
  }

  function decide(target) {
    if (!target || !target.closest) return setState("", "");
    for (var i = 0; i < AUTO.length; i++) {
      var el = target.closest(AUTO[i][0]);
      if (!el) continue;
      if (i === 0) {
        var attr = el.getAttribute("data-cursor");
        var lab = el.hasAttribute("data-cursor-label") ? el.getAttribute("data-cursor-label") : "";
        return setState(attr, lab);
      }
      return setState(AUTO[i][1], AUTO[i][2]);
    }
    setState("", "");
  }

  function tick() {
    rx += (x - rx) * (reduce ? 1 : 0.22); ry += (y - ry) * (reduce ? 1 : 0.22);
    ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
    if (Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1) raf = requestAnimationFrame(tick); else raf = 0;
  }

  window.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    if (!on) { on = true; rx = x; ry = y; ring.classList.add("is-on"); dot.classList.add("is-on"); }
    dot.style.transform = "translate3d(" + x + "px," + y + "px,0)";
    if (!raf) raf = requestAnimationFrame(tick);
    decide(e.target);
  }, { passive: true });
  document.addEventListener("pointerleave", function () { on = false; ring.classList.remove("is-on"); dot.classList.remove("is-on"); });
  window.addEventListener("blur", function () { on = false; ring.classList.remove("is-on"); dot.classList.remove("is-on"); });
  document.addEventListener("pointerdown", function () { ring.classList.add("is-down"); });
  document.addEventListener("pointerup", function () { ring.classList.remove("is-down"); });
  // the page moves under a still mouse (smooth scroll), so check again after scrolling
  var last = null;
  window.addEventListener("scroll", function () { if (!on) return; var t = document.elementFromPoint(x, y); if (t !== last) { last = t; decide(t); } }, { passive: true });

  // Buttons marked data-magnet lean towards the pointer.
  if (!reduce) document.querySelectorAll("[data-magnet]").forEach(function (b) {
    var tx = 0, ty = 0, cx = 0, cy = 0, run = 0;
    function loop() { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; b.style.transform = "translate(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px)"; if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) run = requestAnimationFrame(loop); else { run = 0; if (!tx && !ty) b.style.transform = ""; } }
    b.addEventListener("pointermove", function (e) { var r = b.getBoundingClientRect(); tx = (e.clientX - r.left - r.width / 2) * 0.28; ty = (e.clientY - r.top - r.height / 2) * 0.4; if (!run) run = requestAnimationFrame(loop); });
    b.addEventListener("pointerleave", function () { tx = 0; ty = 0; if (!run) run = requestAnimationFrame(loop); });
  });
})();
