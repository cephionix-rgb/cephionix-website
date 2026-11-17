/*
  Saggu Motor Garage - behaviour shared by About, Terms and 404.
  The home page has its own script (main.js). Everything here works without GSAP too; GSAP only adds motion.
*/
(function () {
  "use strict";
  var CFG = window.SAGGU_CONFIG, B = window.SagguBooking;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasG = !!(window.gsap && window.ScrollTrigger);
  if (hasG) gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (hasG && !reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToNode(node) {
    if (lenis) lenis.scrollTo(node, { offset: -90, duration: 1.2 });
    else node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  /* ---------- nav: hides while reading down, returns on the way up ---------- */
  var nav = $("#nav"), lastY = 0;
  window.addEventListener("scroll", function () {
    var y = window.scrollY || 0;
    if (nav) nav.classList.toggle("is-hidden", y > lastY && y > 240);
    lastY = y;
  }, { passive: true });

  /* ---------- videos play only while on screen ---------- */
  function watch(v) {
    if (reduce) { v.removeAttribute("autoplay"); return; }
    if (!("IntersectionObserver" in window)) { v.play && v.play().catch(function () {}); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
      });
    }, { threshold: 0.15 }).observe(v);
  }
  $$("video[data-watch]").forEach(watch);

  /* ---------- reveal: lines slide up, blocks rise ---------- */
  function intro(root) {
    var lines = $$(".li", root || document);
    if (!hasG || reduce) return;
    gsap.set(lines, { yPercent: 108 });
    gsap.to(lines, { yPercent: 0, duration: 1.05, ease: "power4.out", stagger: 0.11, delay: 0.1 });
  }
  function rise(sel) {
    if (!hasG || reduce) return;
    $$(sel).forEach(function (el) {
      gsap.from(el, { y: 40, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
  }

  /* ---------- counters ---------- */
  function counters() {
    $$("[data-count]").forEach(function (el) {
      var to = parseFloat(el.dataset.count), from = parseFloat(el.dataset.from || "0");
      if (!hasG || reduce) { el.textContent = Math.round(to); return; }
      var o = { v: from }; el.textContent = Math.round(from);
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: function () {
        gsap.to(o, { v: to, duration: 1.8, ease: "power2.out", onUpdate: function () { el.textContent = Math.round(o.v); } });
      } });
    });
  }

  /* ---------- sticky video that follows the section being read ---------- */
  function follow(opts) {
    var blocks = $$(opts.blocks), vids = $$(opts.videos), cap = opts.caption ? $(opts.caption) : null, links = opts.links ? $$(opts.links) : [];
    if (!blocks.length) return;
    var active = -1;
    function set(i) {
      if (i === active) return; active = i;
      blocks.forEach(function (b, k) { b.classList.toggle("is-on", k === i); });
      links.forEach(function (a, k) { a.classList.toggle("is-on", k === i); if (k === i) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
      var v = vids[(blocks[i].dataset.video | 0) % vids.length];
      vids.forEach(function (x) { x.classList.toggle("is-on", x === v); });
      if (cap) cap.textContent = blocks[i].dataset.caption || "";
    }
    set(0);
    function pick() {
      var mid = window.innerHeight * 0.45, best = 0, bd = 1e9;
      blocks.forEach(function (b, i) { var r = b.getBoundingClientRect(), c = Math.abs((r.top + r.height / 2) - mid); if (c < bd) { bd = c; best = i; } });
      set(best);
    }
    window.addEventListener("scroll", pick, { passive: true }); window.addEventListener("resize", pick); pick();
  }

  /* ---------- branches (from config.js) ---------- */
  function branchCards() {
    var box = $("#branchCards"); if (!box) return;
    B.branches(CFG).forEach(function (b) {
      var c = document.createElement("article"); c.className = "brcard";
      var h = document.createElement("h3"); h.textContent = b.name; c.appendChild(h);
      var p = document.createElement("p"); p.textContent = b.address || b.city || "Punjab"; c.appendChild(p);
      var links = document.createElement("div"); links.className = "brcard__links";
      if (b.phone) { var t = document.createElement("a"); t.href = "tel:" + b.phone.replace(/[^\d+]/g, ""); t.textContent = b.phone; links.appendChild(t); }
      var m = document.createElement("a"); m.target = "_blank"; m.rel = "noopener"; m.textContent = "Open in Google Maps";
      m.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(b.mapsQuery || (b.address ? b.address : (CFG.name + " " + b.name + " " + CFG.city)));
      links.appendChild(m); c.appendChild(links);
      var go = document.createElement("a"); go.className = "btn btn--primary btn--sm"; go.href = "index.html?branch=" + encodeURIComponent(b.id) + "#book"; go.textContent = "Book at " + b.name; go.setAttribute("data-magnet", ""); c.appendChild(go);
      box.appendChild(c);
    });
    if (hasG && !reduce) gsap.from(box.children, { y: 40, opacity: 0, duration: .8, stagger: .12, ease: "power3.out", scrollTrigger: { trigger: box, start: "top 85%", once: true } });
  }

  function links() {
    $$("[data-ig]").forEach(function (a) { if (CFG.instagram) a.href = CFG.instagram; });
    $$("[data-ig-handle]").forEach(function (a) { a.textContent = CFG.instagramHandle || "Instagram"; });
    var yr = $("[data-year-count]"); if (yr) { var n = new Date().getFullYear() - (CFG.since || 1997); yr.dataset.count = n; }
    $$("[data-now-year]").forEach(function (a) { a.textContent = new Date().getFullYear(); });
  }

  /* ---------- pages ---------- */
  var page = document.body.getAttribute("data-page");

  function aboutPage() {
    intro($(".ab-hero"));
    if (hasG && !reduce) {
      gsap.from(".ab-hero__media", { clipPath: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)", duration: 1.4, ease: "power4.inOut" });
      gsap.from(".ab-hero__badge", { scale: 0.4, rotate: -40, opacity: 0, duration: 1.2, delay: 0.7, ease: "back.out(1.6)" });
      gsap.to(".ab-hero__media video", { yPercent: 8, ease: "none", scrollTrigger: { trigger: ".ab-hero", start: "top top", end: "bottom top", scrub: true } });
      var path = $("#lineDraw");
      if (path) { var len = path.getTotalLength(); gsap.set(path, { strokeDasharray: len, strokeDashoffset: len }); gsap.to(path, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".ab-nums", start: "top 80%", end: "bottom 55%", scrub: true } }); }
      $$(".reel figure").forEach(function (f, i) { gsap.from(f, { y: 70 + i * 20, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".reel", start: "top 85%", once: true }, delay: i * 0.1 }); });
    }
    counters(); branchCards();
    follow({ blocks: ".ab-block", videos: ".stack__frame video", caption: "#stackCap" });
    rise(".ab-block h2");
  }

  function termsPage() {
    intro($(".tm-hero"));
    if (hasG && !reduce) {
      gsap.from(".tm-hero__ribbon", { clipPath: "polygon(0 0, 0 0, 0 78%, 0 100%, 0 100%)", duration: 1.3, ease: "power4.inOut", delay: .2 });
      gsap.from(".tm-short li", { y: 26, opacity: 0, duration: .7, stagger: .08, ease: "power3.out", scrollTrigger: { trigger: ".tm-short ul", start: "top 88%", once: true } });
    }
    var secs = $$(".tm-sec"), nav = $$(".tm-nav a");
    follow({ blocks: ".tm-sec", videos: ".tm-aside .stack__frame video", links: ".tm-nav a" });
    nav.forEach(function (a) { a.addEventListener("click", function (e) { var t = $(a.getAttribute("href")); if (t) { e.preventDefault(); scrollToNode(t); history.replaceState(null, "", a.getAttribute("href")); } }); });
    var gauge = $(".tm-gauge span"), body = $("#termsRoot");
    function progress() {
      var r = body.getBoundingClientRect(), p = Math.min(1, Math.max(0, (window.innerHeight * 0.4 - r.top) / (r.height - window.innerHeight * 0.4)));
      if (gauge) gauge.style.setProperty("--p", p);
    }
    window.addEventListener("scroll", progress, { passive: true }); progress();
  }

  function notFoundPage() {
    intro($(".nf"));
    if (hasG && !reduce) {
      gsap.from(".nf__num", { scale: 0.86, opacity: 0, duration: 1.1, ease: "power4.out", delay: 0.1 });
    }
    var p = $("#badPath"); if (p) p.textContent = decodeURIComponent(location.pathname).slice(0, 80);
  }

  links();
  if (page === "about") aboutPage();
  if (page === "terms") termsPage();
  if (page === "404") notFoundPage();
  window.addEventListener("load", function () { if (hasG) ScrollTrigger.refresh(); });
})();
