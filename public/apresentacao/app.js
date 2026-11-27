(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sections = Array.prototype.slice.call(document.querySelectorAll("main > .s"));
  var dots = document.getElementById("dots");
  var hudNum = document.getElementById("hud-num");
  var hudLabel = document.getElementById("hud-label");
  document.getElementById("hud-total").textContent = String(sections.length - 1).padStart(2, "0");

  // Dots de navegação
  sections.forEach(function (s, i) {
    var b = document.createElement("button");
    b.setAttribute("aria-label", s.dataset.label || "Seção " + i);
    b.title = s.dataset.label || "";
    b.addEventListener("click", function () { go(i); });
    dots.appendChild(b);
  });
  var current = 0;
  function setActive(i) {
    current = i;
    hudNum.textContent = String(i).padStart(2, "0");
    hudLabel.textContent = sections[i].dataset.label || "";
    Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle("on", k === i); });
  }
  function go(i) {
    i = Math.max(0, Math.min(sections.length - 1, i));
    var top = sections[i].getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) { e.preventDefault(); go(nearest() + 1); }
    else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) { e.preventDefault(); go(nearest() - 1); }
    else if (e.key === "f" || e.key === "F") {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      else document.exitFullscreen && document.exitFullscreen();
    }
  });
  function nearest() {
    var mid = window.innerHeight * 0.35, best = 0;
    sections.forEach(function (s, i) { if (s.getBoundingClientRect().top <= mid) best = i; });
    return best;
  }
  var bar = document.getElementById("progress");
  window.addEventListener("scroll", function () {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    var n = nearest(); if (n !== current) setActive(n);
  }, { passive: true });
  setActive(0);

  // Contadores
  function runCount(el) {
    var to = parseFloat(el.dataset.to), dec = el.dataset.dec ? 1 : 0;
    var fmt = function (v) { return dec ? Math.round(v).toLocaleString("pt-BR") : String(Math.round(v)); };
    if (reduce || !window.gsap) { el.textContent = fmt(to); return; }
    var o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.6, ease: "power2.out", onUpdate: function () { el.textContent = fmt(o.v); } });
  }

  // Digitação da busca
  var typingEl = document.getElementById("typing");
  var phrase = "influenciador fitness em São Bernardo do Campo, 30 mil seguidores";
  var typed = false;
  function runTyping() {
    if (typed) return; typed = true;
    if (reduce) { typingEl.textContent = phrase; return; }
    var i = 0;
    (function step() { typingEl.textContent = phrase.slice(0, ++i); if (i < phrase.length) setTimeout(step, 34); })();
  }

  if (!window.gsap || !window.ScrollTrigger || reduce) {
    document.querySelectorAll(".count").forEach(runCount);
    runTyping();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Hero: entrada
  gsap.from(".hero-title .ln > span", { yPercent: 110, duration: 1.1, ease: "power4.out", stagger: 0.12, delay: 0.15 });
  gsap.from(".hero .tag, .hero .lead, .hero-logos", { y: 30, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.12, delay: 0.6 });
  gsap.to(".hero-inner", { yPercent: -25, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  // Parallax genérico
  document.querySelectorAll("[data-speed]").forEach(function (el) {
    var sp = parseFloat(el.dataset.speed) || 0;
    var sec = el.closest(".s") || el;
    gsap.fromTo(el, { yPercent: -sp * 40 }, { yPercent: sp * 40, ease: "none", scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // Títulos grandes
  gsap.utils.toArray(".s .big, .close-title, .cv-logo").forEach(function (el) {
    gsap.from(el, { y: 60, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });
  gsap.utils.toArray(".kicker, .s .body").forEach(function (el) {
    gsap.from(el, { y: 24, opacity: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%" } });
  });

  // Reveals em grupo
  gsap.utils.toArray("[data-reveal]").forEach(function (el, i) {
    gsap.from(el, { y: 50, opacity: 0, duration: 0.8, ease: "power3.out", delay: (i % 4) * 0.08, scrollTrigger: { trigger: el, start: "top 90%" } });
  });

  // Comunidades: rolagem horizontal fixada
  var track = document.getElementById("htrack");
  var mm = gsap.matchMedia();
  mm.add("(min-width: 961px)", function () {
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    gsap.to(track, {
      x: function () { return -dist(); }, ease: "none",
      scrollTrigger: { trigger: "#comunidades", start: "top top", end: function () { return "+=" + dist(); }, scrub: 0.6, pin: true, invalidateOnRefresh: true, anticipatePin: 1 }
    });
  });
  mm.add("(max-width: 960px)", function () { document.querySelector(".hscroll").style.overflowX = "auto"; });

  // Anéis do algoritmo
  gsap.set("#rings .ring", { xPercent: -50, yPercent: -50 });
  gsap.from("#rings .ring", { scale: 0, opacity: 0, transformOrigin: "50% 50%", duration: 0.9, ease: "back.out(1.6)", stagger: { each: 0.25, from: "end" },
    scrollTrigger: { trigger: "#rings", start: "top 75%" } });

  // Vitrine
  ScrollTrigger.create({ trigger: ".search-ui", start: "top 75%", once: true, onEnter: function () {
    runTyping();
    gsap.from(".filters .chip", { scale: 0.6, opacity: 0, duration: 0.4, stagger: 0.12, delay: 1.2, ease: "back.out(2)" });
    gsap.from(".res", { x: -30, opacity: 0, duration: 0.6, stagger: 0.15, delay: 2.3, ease: "power3.out" });
  } });

  // Condomínio: pacote desce do 8º ao 4º andar
  var building = document.getElementById("building");
  var shop = building.querySelector(".shop"), dest = building.querySelector(".dest"), pkg = document.getElementById("pkg");
  function pos(el) { var b = building.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - b.left + r.width / 2 - 15, y: r.top - b.top - 6 }; }
  var tl = gsap.timeline({ scrollTrigger: { trigger: building, start: "top 65%", end: "bottom 45%", scrub: 0.8 } });
  tl.fromTo(pkg, { x: function () { return pos(shop).x; }, y: function () { return pos(shop).y; }, left: 0, top: 0, scale: 0.6 },
    { x: function () { return pos(dest).x; }, y: function () { return pos(dest).y; }, scale: 1, ease: "none" });
  gsap.from("#order", { y: 30, opacity: 0, scrollTrigger: { trigger: building, start: "center 60%", toggleActions: "play none none reverse" } });

  // Barras e medidores
  gsap.from(".bars span", { scaleY: 0, duration: 0.9, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: ".bars", start: "top 85%" } });
  gsap.from(".cvm-bar i", { scaleX: 0, duration: 1.2, stagger: 0.15, ease: "power3.out", scrollTrigger: { trigger: ".cv-meter", start: "top 80%" } });

  // Contadores ao entrar
  document.querySelectorAll(".count").forEach(function (el) {
    ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: function () { runCount(el); } });
  });

  // Cupom: ticket gira levemente com a rolagem
  gsap.fromTo("#ticket", { rotateY: -25, rotateZ: -6 }, { rotateY: 10, rotateZ: 3, ease: "none", scrollTrigger: { trigger: ".cupom", start: "top bottom", end: "bottom top", scrub: true } });

  // Flywheel: arco preenche e nós aparecem
  var run = document.getElementById("wheel-run");
  var len = 2 * Math.PI * 230;
  run.style.strokeDasharray = len; run.style.strokeDashoffset = len;
  gsap.to(run, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: "#wheel", start: "top 70%", end: "bottom 60%", scrub: 0.6 } });
  gsap.from(".wn", { scale: 0.5, opacity: 0, duration: 0.5, stagger: 0.18, ease: "back.out(2)", scrollTrigger: { trigger: "#wheel", start: "top 65%" } });
  gsap.to(".wheel-core", { rotate: 360, ease: "none", scrollTrigger: { trigger: "#wheel", start: "top bottom", end: "bottom top", scrub: true } });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
