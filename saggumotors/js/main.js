/*
  Saggu Motor Garage - motion and page behaviour (GSAP + ScrollTrigger + Lenis)

  The sequence:
   1. Splash: the garage shutter stays down while the engine video and fonts load, then rolls up.
   2. Hero: the engine clip grows from a framed window to the full screen as you scroll.
   3. What we fix: the exploded-car frames play as you scroll, and the services light up in step.
   4. Our garage: a gentle parallax on the workshop clip and a years counter.
   5. How a visit works: the page scrolls sideways through five steps.
   6. Booking: GSAP only answers your clicks here (bays rise in, the ticket drops in).
*/
(function () {
  "use strict";
  var CFG = window.SAGGU_CONFIG;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);

  // Booking works even if animation libraries fail to load.
  if (window.SagguBookingUI) window.SagguBookingUI.init();

  /* ---------- small content jobs ---------- */
  var yearsEl = $("#yearsCount");
  var yearsNow = new Date().getFullYear() - (CFG.since || 1997);
  if (yearsEl) yearsEl.textContent = yearsNow;

  function buildServices() {
    var list = $("#svcList"); if (!list) return;
    CFG.services.forEach(function (s, i) {
      var li = document.createElement("li");
      li.innerHTML =
        '<button class="svc__btn" type="button" aria-expanded="false"><span class="svc__title"></span><span class="svc__plus" aria-hidden="true"></span></button>' +
        '<div class="svc__more"><div><p></p><a class="svc__book" href="#book">Book this service</a></div></div>';
      li.querySelector(".svc__title").textContent = s.title;
      li.querySelector("p").textContent = s.text;
      li.querySelector(".svc__book").dataset.service = s.id;
      list.appendChild(li);
    });
  }
  buildServices();

  if (!hasGSAP) { document.body.classList.remove("is-loading"); var sp = $("#splash"); if (sp) sp.remove(); return; }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scrolling ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  window.sagguScrollTo = function (target, opts) {
    opts = opts || {};
    if (lenis) lenis.scrollTo(target, { offset: opts.offset || 0, duration: 1.3, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else (typeof target === "number" ? window.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" }) : target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  };

  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    if (a.dataset.service) { e.preventDefault(); window.SagguBookingUI.pickService(a.dataset.service); return; }
    var id = a.getAttribute("href"); if (id.length < 2) return;
    var t = document.querySelector(id); if (!t) return;
    e.preventDefault();
    window.sagguScrollTo(id === "#top" ? 0 : t, { offset: id === "#book" ? -20 : 0 });
  });

  /* ---------- video helpers ---------- */
  function playWhenVisible(v) {
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (reduce || v.dataset.userPaused === "1") return;
        if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
      });
    }, { threshold: 0.25 }).observe(v);
  }
  var heroVideo = $("#heroVideo");
  playWhenVisible(heroVideo);
  var pauseBtn = $("#heroPause");
  if (pauseBtn) {
    if (reduce) { pauseBtn.setAttribute("aria-pressed", "true"); pauseBtn.setAttribute("aria-label", "Play the background video"); heroVideo.dataset.userPaused = "1"; }
    pauseBtn.addEventListener("click", function () {
      var paused = heroVideo.dataset.userPaused !== "1";
      heroVideo.dataset.userPaused = paused ? "1" : "0";
      pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
      pauseBtn.setAttribute("aria-label", paused ? "Play the background video" : "Pause the background video");
      if (paused) heroVideo.pause(); else { var p = heroVideo.play(); if (p && p.catch) p.catch(function () {}); }
    });
  }
  playWhenVisible($("#aboutVideo"));
  $$(".step__video").forEach(playWhenVisible);
  if (reduce) $$("video").forEach(function (v) { v.pause(); v.removeAttribute("autoplay"); });

  function imageReady(img, max) {
    return new Promise(function (res) {
      var done = function () { res(); };
      if (img.complete && img.naturalWidth) return res();
      img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true });
      setTimeout(done, max);
    });
  }
  function videoReady(v, max) {
    return new Promise(function (res) {
      if (v.readyState >= 3) return res();
      var done = function () { res(); };
      v.addEventListener("canplay", done, { once: true });
      setTimeout(done, max);
    });
  }

  /* ---------- hero entrance state (hidden until the intro lifts) ---------- */
  var heroItems = $$(".hero .hx"), heroBg = $(".hero__bg"), heroBar = $(".facts-bar");
  function sizeBar() {
    var cs = getComputedStyle(heroBar), mb = parseFloat(cs.marginBottom) || 0;
    document.documentElement.style.setProperty("--bar-h", Math.round(heroBar.offsetHeight + mb) + "px");
  }
  sizeBar(); window.addEventListener("resize", sizeBar);
  if (!reduce) {
    gsap.set(heroItems, { opacity: 0, y: 28 });
    gsap.set(heroBg, { opacity: 0, scale: 1.06 });
    gsap.set(heroBar, { opacity: 0, y: 46 });
    gsap.set("#nav", { yPercent: -100 });
  }

  /* ---------- splash ---------- */
  var splashEl = $("#splash");
  function finishLoading() {
    document.body.classList.remove("is-loading");
    if (typeof startPreload === "function") startPreload();
    if (lenis) lenis.start();
    ScrollTrigger.refresh();
  }

  // Rev gauge around the badge: a 270 degree arc with ticks that light up as loading progresses.
  function buildRing() {
    var NS = "http://www.w3.org/2000/svg", svg = $("#splashRing"), cx = 200, cy = 200, R = 168, a0 = 135, a1 = 405;
    function pt(a, r) { var t = a * Math.PI / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; }
    function el(name, attrs) { var n = document.createElementNS(NS, name); for (var k in attrs) n.setAttribute(k, attrs[k]); svg.appendChild(n); return n; }
    var defs = el("defs", {}), g = document.createElementNS(NS, "linearGradient");
    g.setAttribute("id", "ringGrad"); g.setAttribute("x1", "0"); g.setAttribute("y1", "0"); g.setAttribute("x2", "1"); g.setAttribute("y2", "0");
    [["0", "#1F6BFF"], ["0.7", "#F0B429"], ["1", "#E43A2F"]].forEach(function (s) { var st = document.createElementNS(NS, "stop"); st.setAttribute("offset", s[0]); st.setAttribute("stop-color", s[1]); g.appendChild(st); });
    defs.appendChild(g);
    var p0 = pt(a0, R), p1 = pt(a1, R), d = "M" + p0[0] + " " + p0[1] + " A" + R + " " + R + " 0 1 1 " + p1[0] + " " + p1[1];
    var track = el("path", { d: d, "class": "track" });
    var fill = el("path", { d: d, "class": "fill" });
    var L = R * (a1 - a0) * Math.PI / 180;
    fill.style.strokeDasharray = L; fill.style.strokeDashoffset = L;
    var ticks = [], n = 28;
    for (var i = 0; i < n; i++) {
      var a = a0 + (a1 - a0) * i / (n - 1), major = i % 4 === 0 || i === n - 1;
      var q1 = pt(a, R + 20), q2 = pt(a, R + (major ? 40 : 31));
      var t = el("line", { x1: q1[0], y1: q1[1], x2: q2[0], y2: q2[1], "class": "tick" + (major ? " is-major" : "") + (i >= n - 5 ? " is-red" : "") });
      ticks.push(t);
    }
    return { fill: fill, L: L, ticks: ticks, track: track };
  }

  function runSplash() {
    var navLogo = $(".nav__brand img");
    if (reduce || !splashEl) { if (splashEl) splashEl.remove(); finishLoading(); return; }

    var ring = buildRing(), badge = $("#splashBadge"), num = $("#splashNum"), prog = { v: 0 };
    gsap.set(navLogo, { opacity: 0 });

    var seen = false; try { seen = !!sessionStorage.getItem("saggu.splash"); sessionStorage.setItem("saggu.splash", "1"); } catch (e) {}
    var minMs = seen ? 900 : 1900;

    function paint() {
      var p = prog.v;
      num.textContent = Math.round(p * 100);
      ring.fill.style.strokeDashoffset = ring.L * (1 - p);
      ring.ticks.forEach(function (t, i) { t.classList.toggle("on", i / (ring.ticks.length - 1) <= p); });
    }

    // intro: badge pops in, ticks flick on, a shine crosses the chrome
    gsap.from(badge, { scale: 0.5, rotation: -12, opacity: 0, duration: 1, ease: "back.out(1.7)" });
    gsap.from(ring.ticks, { opacity: 0, duration: 0.35, stagger: 0.025, delay: 0.15 });
    gsap.from(ring.track, { opacity: 0, duration: 0.6 });
    gsap.from(["#splashMeter", "#splashNote"], { y: 18, opacity: 0, duration: 0.6, delay: 0.4, stagger: 0.1, ease: "power3.out" });
    gsap.fromTo(badge, { "--sx": "-160%" }, { "--sx": "160%", duration: 1.1, delay: 0.85, ease: "power2.inOut" });
    var creep = null;
    gsap.to(prog, { v: 0.92, duration: minMs / 1000, ease: "power2.inOut", onUpdate: paint, onComplete: function () {
      // on a slow connection keep inching forward so the loader never looks frozen
      creep = gsap.to(prog, { v: 0.985, duration: 5, ease: "power1.out", onUpdate: paint });
    } });

    var wait = new Promise(function (r) { setTimeout(r, minMs); });
    var assets = Promise.all([imageReady($("#heroImg"), 2500), document.fonts ? document.fonts.ready : Promise.resolve(), wait]);
    var cap = new Promise(function (r) { setTimeout(r, minMs + 1200); }); // never wait more than 1.2 s past the minimum
    Promise.race([assets, cap]).then(function () {
      if (creep) creep.kill();
      gsap.to(prog, { v: 1, duration: 0.3, ease: "none", onUpdate: paint, onComplete: lift });
    });

    function lift() {
      // where the badge has to land: the logo in the nav (the nav is still parked above the screen)
      var nb = navLogo.getBoundingClientRect(), navH = $("#nav").offsetHeight, bb = badge.getBoundingClientRect();
      var dx = (nb.left + nb.width / 2) - (bb.left + bb.width / 2);
      var dy = (nb.top + navH + nb.height / 2) - (bb.top + bb.height / 2);
      var sc = nb.width / bb.width;
      var R = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 80;

      gsap.set(badge, { "--sx": "-160%" });
      gsap.set(".splash__iris", { opacity: 1 });
      var tl = gsap.timeline({ onComplete: function () { gsap.set(navLogo, { opacity: 1 }); splashEl.remove(); finishLoading(); } });
      tl.to(badge, { "--sx": "160%", scale: 1.06, duration: 0.7, ease: "power2.inOut" }, 0)
        .to(["#splashRing", "#splashMeter", "#splashNote"], { opacity: 0, duration: 0.4, ease: "power2.in" }, 0.5)
        .to(splashEl, { "--r": R + "px", duration: 1.35, ease: "power3.in" }, 0.75)
        .to(badge, { x: dx, y: dy, scale: sc, duration: 1.05, ease: "power3.inOut" }, 0.75)
        .to("#nav", { yPercent: 0, duration: 0.8, ease: "power3.out" }, 0.9)
        .to(heroBg, { opacity: 1, scale: 1, duration: 1.5, ease: "power3.out" }, 1.0)
        .to(heroItems, { opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: "power3.out" }, 1.25)
        .to(heroBar, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, 2.0);
    }
  }

  /* ---------- scroll choreography ---------- */
  var mm = gsap.matchMedia();
  var motionOK = "(prefers-reduced-motion: no-preference)";

  // 2. Our work: the badge close-up opens from a framed window to the full screen.
  mm.add("(min-width: 900px) and " + motionOK, function () {
    gsap.timeline({ scrollTrigger: { trigger: "#work", start: "top top", end: "+=100%", pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 3 } })
      .fromTo("#lookFrame", { "--t": "24vh", "--s": "8vw", "--b": "8vh", "--r": "36px" },
                            { "--t": "0vh", "--s": "0vw", "--b": "0vh", "--r": "0px", ease: "none", duration: 1 }, 0)
      .to("#lookTitle", { opacity: 0, y: -40, ease: "none", duration: 0.35 }, 0)
      .fromTo("#heroVideo", { scale: 1 }, { scale: 1.04, ease: "none", duration: 1 }, 0)
      .fromTo("#lookCap", { opacity: 0, y: 36 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.3 }, 0.7);
  });
  mm.add("(max-width: 899px)", function () { gsap.set("#lookCap", { opacity: 1, y: 0 }); });

  // 3. What we fix: the exploded car is a preloaded image sequence drawn on a canvas, scrubbed by scroll.
  //    (Images, not a seeking video: it works the same on every phone and over slow links.)
  var canvas = $("#explodedCanvas"), ctx2 = canvas.getContext("2d"), items = $$("#svcList li");
  var FRAMES = 120, frames = new Array(FRAMES), shown = -1;
  function frameSrc(i) { return "assets/exploded/f" + String(i + 1).padStart(3, "0") + ".webp"; }
  function drawFrame(i) {
    // use the nearest frame that has loaded
    var k = i;
    while (k >= 0 && !(frames[k] && frames[k].complete && frames[k].naturalWidth)) k--;
    if (k < 0) { k = i; while (k < FRAMES && !(frames[k] && frames[k].complete && frames[k].naturalWidth)) k++; }
    if (k >= FRAMES || k === shown) return;
    var img = frames[k];
    if (canvas.width !== img.naturalWidth) { canvas.width = img.naturalWidth; canvas.height = img.naturalHeight; }
    ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
    shown = k;
  }
  // The frames (3 MB) load after the splash is gone, so they never compete with the hero image and fonts for a slow phone connection.
  var preloadStarted = false;
  function startPreload() {
    if (preloadStarted) return; preloadStarted = true;
    var next = 0;
    function pump() {
      if (next >= FRAMES) return;
      var i = next++, im = new Image();
      im.onload = function () { if (i === 0 || shown < 0) drawFrame(0); pump(); };
      im.onerror = pump;
      im.src = frameSrc(i); frames[i] = im;
    }
    for (var w = 0; w < 4; w++) pump();   // four downloads at a time
  }
  setTimeout(startPreload, 9000); // safety: start even if the splash never finishes

  function setActive(idx) {
    items.forEach(function (li, i) {
      var on = i === idx; li.classList.toggle("is-active", on);
      li.querySelector(".svc__btn").setAttribute("aria-expanded", on ? "true" : "false");
    });
  }
  setActive(0);

  function buildFix(desktop) {
    var cur = { p: 0 };
    var smooth = gsap.quickTo(cur, "p", { duration: 0.35, ease: "power2.out", onUpdate: function () { drawFrame(Math.min(FRAMES - 1, Math.round(cur.p * (FRAMES - 1)))); } });
    var n = items.length, st;
    st = ScrollTrigger.create(desktop
      ? { trigger: "#fixPin", start: "top top", end: "+=420%", pin: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 2 }
      : { trigger: "#fix", start: "top top+=120", end: "bottom bottom", invalidateOnRefresh: true });
    ScrollTrigger.create({
      trigger: desktop ? "#fixPin" : "#fix", start: st.vars.start, end: st.vars.end, invalidateOnRefresh: true,
      onUpdate: function (self) {
        smooth(self.progress);
        setActive(Math.min(n - 1, Math.floor(self.progress * n * 0.999)));
      }
    });
    $("#svcList").onclick = function (e) {
      var btn = e.target.closest(".svc__btn"); if (!btn) return;
      var idx = items.indexOf(btn.parentNode);
      if (desktop) {
        var from = st.start, to = st.end;
        window.sagguScrollTo(from + (to - from) * ((idx + 0.5) / n), { offset: 0 });
      } else setActive(idx);
    };
    return function () { $("#svcList").onclick = null; };
  }
  mm.add("(min-width: 900px) and " + motionOK, function () {
    var cleanup = buildFix(true); ScrollTrigger.refresh();
    return function () { cleanup(); };
  });
  mm.add("(max-width: 899px) and " + motionOK, function () {
    var cleanup = buildFix(false); ScrollTrigger.refresh();
    return function () { cleanup(); };
  });

  // 4. Our garage: parallax and counter.
  mm.add(motionOK, function () {
    gsap.fromTo("#aboutVideo", { yPercent: -7 }, { yPercent: 7, ease: "none", scrollTrigger: { trigger: "#aboutMedia", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.fromTo("#aboutMedia", { clipPath: "inset(14% 10% 14% 10% round 36px)" }, { clipPath: "inset(0% 0% 0% 0% round 36px)", ease: "none", scrollTrigger: { trigger: "#aboutMedia", start: "top 92%", end: "top 38%", scrub: true } });
    var c = { v: 0 };
    ScrollTrigger.create({ trigger: ".facts", start: "top 85%", once: true, onEnter: function () {
      gsap.to(c, { v: yearsNow, duration: 1.6, ease: "power3.out", onUpdate: function () { yearsEl.textContent = Math.round(c.v); } });
    } });
  });

  // 5. How a visit works: sideways scroll.
  mm.add("(min-width: 900px) and " + motionOK, function () {
    var track = $("#visitTrack"), pin = $("#visitPin");
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var tween = gsap.to(track, { x: function () { return -dist(); }, ease: "none",
      scrollTrigger: { trigger: pin, start: "top top", end: function () { return "+=" + dist(); }, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1,
        onUpdate: function (s) { gsap.set("#visitRail", { scaleX: s.progress }); } } });
    $$(".step").forEach(function (step) {
      ScrollTrigger.create({ trigger: step, containerAnimation: tween, start: "left 72%", end: "right 20%", toggleClass: { targets: step, className: "is-in" } });
    });
  });
  mm.add("(max-width: 899px) and " + motionOK, function () {
    $$(".step").forEach(function (step) { ScrollTrigger.create({ trigger: step, start: "top 80%", toggleClass: { targets: step, className: "is-in" } }); });
  });
  if (reduce) $$(".step").forEach(function (s) { s.classList.add("is-in"); });

  /* ---------- nav: roomy over the hero, compact bar after; hides on the way down ---------- */
  var nav = $("#nav");
  function navState(y) { nav.classList.toggle("is-scrolled", y > 40); }
  navState(window.scrollY || 0);
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: function (self) {
    navState(self.scroll());
    if (document.body.classList.contains("is-loading")) return;
    var hide = self.direction === 1 && self.scroll() > 240;
    nav.classList.toggle("is-hidden", hide);
  } });
  // current section in the nav
  var spyLinks = $$(".nav__links a[data-spy]");
  function spySet(key) { spyLinks.forEach(function (a) { if (a.dataset.spy === key) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); }); }
  [["top", "#top"], ["fix", "#fix"], ["work", "#work"], ["about", "#about"], ["contact", "#contact"]].forEach(function (p) {
    var el = $(p[1]); if (!el) return;
    ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: function (s) { if (s.isActive) spySet(p[0]); } });
  });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  runSplash();
})();
