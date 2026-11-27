(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Barra de progresso do topo
  var prog = $("#prog");
  window.addEventListener("scroll", function () {
    var h = document.documentElement.scrollHeight - innerHeight;
    prog.style.width = (h > 0 ? scrollY / h * 100 : 0) + "%";
  }, { passive: true });

  // Aparelhos fixos: o passo no meio da tela escolhe a tela (desliza na horizontal)
  var sysUrls = ["freelandoo.com.br/carla.treina", "freelandoo.com.br/feed", "freelandoo.com.br/vitrine", "freelandoo.com.br/mensagens", "freelandoo.com.br/agendar/aula", "freelandoo.com.br/carteira"];
  var flows = $$("[data-flow]").map(function (root) {
    return { steps: $$(".step", root), track: $(".dev-track", root), dots: $$(".dev-dots i", root), url: $("#dev-url", root), cur: -1 };
  });
  function show(f, i) {
    if (i === f.cur) return; f.cur = i;
    var n = f.steps.length;
    f.track.style.transform = "translateX(" + (-i * 100 / n) + "%)";
    if (f.url) f.url.textContent = sysUrls[i];
    f.steps.forEach(function (s, k) { s.classList.toggle("is-on", k === i); });
    f.dots.forEach(function (d, k) { d.classList.toggle("on", k === i); });
  }
  function pickStep() {
    var line = innerWidth <= 960 ? innerHeight * 0.72 : innerHeight * 0.5;
    flows.forEach(function (f) {
      var best = 0;
      f.steps.forEach(function (s, k) { if (s.getBoundingClientRect().top < line) best = k; });
      show(f, best);
    });
  }
  window.addEventListener("scroll", pickStep, { passive: true });
  window.addEventListener("resize", pickStep);
  pickStep();

  // Simulador do cupom IRONTALKS (25%)
  var sP = $("#s-people"), sR = $("#s-rate"), sT = $("#s-ticket");
  function brl(v) { return "R$ " + Math.round(v).toLocaleString("pt-BR"); }
  function sim() {
    if (!sP) return;
    var people = +sP.value, rate = +sR.value, ticket = +sT.value;
    var gross = people * rate / 100 * ticket;
    $("#o-people").textContent = people.toLocaleString("pt-BR");
    $("#o-rate").textContent = rate + "%";
    $("#o-ticket").textContent = brl(ticket);
    $("#o-gross").textContent = brl(gross);
    $("#o-month").textContent = brl(gross * 0.25);
    $("#o-year").textContent = brl(gross * 0.25 * 12);
  }
  [sP, sR, sT].forEach(function (el) { if (el) el.addEventListener("input", sim); });
  sim();

  function runCount(el) {
    var to = +el.dataset.to;
    if (reduce || !window.gsap) { el.textContent = to; return; }
    var o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.4, ease: "power2.out", onUpdate: function () { el.textContent = Math.round(o.v); } });
  }

  if (!window.gsap || !window.ScrollTrigger) { $$(".count").forEach(runCount); return; }
  gsap.registerPlugin(ScrollTrigger);

  // Comunidades: rolagem vertical vira horizontal, um painel por cor
  var ctrack = $("#comm-track"), cn = $("#comm-n"), panels = $$(".cpanel"), label = $(".comm-label");
  gsap.to(ctrack, {
    xPercent: -100 * (panels.length - 1) / panels.length, ease: "none",
    scrollTrigger: {
      trigger: ".comm-pin", start: "top top", end: function () { return "+=" + innerWidth * (panels.length - 1) * 0.9; },
      pin: true, scrub: 0.5, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: function (st) { var k = Math.round(st.progress * (panels.length - 1)); cn.textContent = String(k + 1).padStart(2, "0"); label.style.color = panels[k].style.getPropertyValue("--fg"); }
    }
  });

  if (reduce) { $$(".count").forEach(runCount); return; }

  // Entrada do hero
  gsap.from(".h1 .ln > span", { yPercent: 110, duration: 1, ease: "power4.out", stagger: 0.1, delay: 0.1 });
  gsap.from(".hero .eyebrow, .hero .lead, .hero .btn", { y: 24, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.1, delay: 0.5 });
  gsap.from(".phone", { y: 60, opacity: 0, rotate: 3, duration: 1.1, ease: "power3.out", delay: 0.4 });
  gsap.from(".float-chip", { scale: 0.6, opacity: 0, duration: 0.6, ease: "back.out(2)", stagger: 0.2, delay: 1.1 });

  // Parallax
  $$("[data-speed]").forEach(function (el) {
    var sp = +el.dataset.speed || 0, sec = el.closest("section") || el;
    gsap.fromTo(el, { yPercent: -sp * 40 }, { yPercent: sp * 40, ease: "none", scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // Títulos e blocos
  $$(".h2, .close-t, .cv-logo").forEach(function (el) {
    gsap.from(el, { y: 40, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 86%" } });
  });
  $$("[data-reveal]").forEach(function (el, i) {
    gsap.from(el, { y: 36, opacity: 0, duration: 0.7, ease: "power3.out", delay: (i % 4) * 0.07, scrollTrigger: { trigger: el, start: "top 90%" } });
  });

  // Post de cada comunidade entra levemente inclinado
  panels.forEach(function (p) {
    var post = $(".cp-post", p);
    gsap.fromTo(post, { rotate: 4, y: 30 }, { rotate: -2, y: -10, ease: "none",
      scrollTrigger: { trigger: ".comm-pin", start: "top top", end: function () { return "+=" + innerWidth * (panels.length - 1) * 0.9; }, scrub: true } });
  });

  // Ranking da Casa Views
  gsap.from(".pol-row i", { scaleX: 0, duration: 1.1, ease: "power3.out", stagger: 0.12, scrollTrigger: { trigger: ".pol-panel", start: "top 80%" } });
  gsap.from(".cv-row i", { scaleX: 0, duration: 1.1, ease: "power3.out", stagger: 0.12, scrollTrigger: { trigger: ".cv-panel", start: "top 80%" } });

  $$(".count").forEach(function (el) {
    ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: function () { runCount(el); } });
  });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); pickStep(); });
})();
