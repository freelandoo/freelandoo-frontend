/* Projeto Trancoso — apresentação. Efeitos discretos: Lenis + GSAP ScrollTrigger, sem nada piscando. */
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = document.documentElement.classList.contains('reduced');
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!location.hash) window.scrollTo(0, 0);
const hasGsap = !!(window.gsap && window.ScrollTrigger);

/* imagem que ainda não existe some e deixa o degradê de areia no lugar */
$$('img').forEach(img => {
  const miss = () => img.setAttribute('data-missing', '');
  if (img.complete && img.naturalWidth === 0 && img.src) miss();
  img.addEventListener('error', miss);
});

/* ---------- divisão de títulos em palavras ---------- */
$$('[data-split]').forEach(el => {
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(p => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('span'); i.textContent = p; w.appendChild(i); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(el);
});
/* prólogo: palavras acendem conforme a rolagem */
$$('[data-words]').forEach(el => {
  el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="rv">${w}</span>`).join(' ');
});

/* ---------- cortina ---------- */
const curtain = $('.curtain');
function openCurtain() {
  if (!curtain) return;
  if (!hasGsap || reduced) { curtain.remove(); heroIn(); return; }
  const tl = gsap.timeline();
  tl.to('.curtain__bar i', { width: '100%', duration: 1.1, ease: 'power2.inOut' })
    .to('.curtain__inner', { opacity: 0, y: -10, duration: .5, ease: 'power2.in' }, '+=.1')
    .to(curtain, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=.15')
    .add(heroIn, '-=.7')
    .add(() => curtain.remove());
}
function heroIn() {
  if (!hasGsap || reduced) return;
  gsap.fromTo('.hero__media img', { scale: 1.22 }, { scale: 1.08, duration: 2.6, ease: 'power3.out' });
  gsap.fromTo('.hero .h1 .w>span', { yPercent: 110 }, { yPercent: 0, duration: 1.3, stagger: .08, ease: 'expo.out' });
  gsap.fromTo('.hero .eyebrow, .hero__side, .hero .ill', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.2, stagger: .12, delay: .35, ease: 'power3.out' });
}

/* ---------- rolagem suave ---------- */
let lenis = null;
if (window.Lenis && !reduced) {
  lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  if (hasGsap) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
  else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
}
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = $(a.getAttribute('href')); if (!t) return;
  e.preventDefault();
  lenis ? lenis.scrollTo(t, { offset: 0, duration: 1.6 }) : t.scrollIntoView({ behavior: 'smooth' });
}));

/* ---------- nav e progresso ---------- */
const nav = $('#nav'), wa = $('.wafloat');
const darkSecs = $$('.dark, .hero, .final');
const navLinks = $$('.nav__links a');
function onScroll() {
  const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
  $('.progress').style.transform = `scaleX(${h > 0 ? y / h : 0})`;
  nav.classList.toggle('is-solid', y > innerHeight * .8);
  const mid = 40;
  const overDark = darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
  nav.classList.toggle('is-dark', overDark && y > innerHeight * .8);
  const bottom = innerHeight - 40;
  wa.classList.toggle('on-dark', darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= bottom && r.bottom > bottom; }));
  let cur = null; navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s && s.getBoundingClientRect().top < innerHeight * .4) cur = a; });
  navLinks.forEach(a => a.classList.toggle('is-on', a === cur));
}
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* luz que segue o mouse no hero, bem sutil */
const hero = $('#hero');
hero && hero.addEventListener('pointermove', e => {
  const r = hero.getBoundingClientRect();
  hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
  hero.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
});

/* ---------- GSAP: parallax, revelações, trilha horizontal ---------- */
if (hasGsap && !reduced) {
  gsap.registerPlugin(ScrollTrigger);

  $$('[data-speed]').forEach(el => {
    const sp = parseFloat(el.dataset.speed);
    gsap.fromTo(el, { yPercent: -sp * 20 }, { yPercent: sp * 20, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.hero__body', { yPercent: 0, opacity: 1 }, { yPercent: -18, opacity: .2, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  $$('[data-split]').forEach(el => {
    if (el.closest('.hero')) return;
    gsap.fromTo($$('.w>span', el), { yPercent: 110 }, { yPercent: 0, duration: 1.2, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('.reveal').forEach(el => {
    if (el.closest('.hero')) return;
    gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  $$('.act__l').forEach(el => gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));

  // prólogo: palavras acendem
  $$('[data-words]').forEach(el => {
    const ws = $$('.rv', el);
    ScrollTrigger.create({ trigger: el, start: 'top 75%', end: 'bottom 45%', scrub: true, onUpdate: s => {
      const n = Math.round(s.progress * ws.length);
      ws.forEach((w, i) => { w.style.color = i < n ? '' : 'rgba(28,26,22,.16)'; });
    } });
  });

  // números que contam
  $$('[data-count]').forEach(el => {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.8, ease: 'power2.out', onUpdate: () => { el.textContent = pre + o.v.toFixed(dec).replace('.', ',') + suf; } }) });
  });

  // trilha das regiões anda na horizontal conforme a rolagem
  const strip = $('#strip');
  if (strip) {
    gsap.to(strip, { x: () => -(strip.scrollWidth - innerWidth + 80), ease: 'none', scrollTrigger: { trigger: '.strip', start: 'top 70%', end: 'bottom 20%', scrub: 1, invalidateOnRefresh: true } });
  }

  // linha do tempo
  ScrollTrigger.create({ trigger: '#tl', start: 'top 80%', once: true, onEnter: () => $$('.tli').forEach((t, i) => setTimeout(() => t.classList.add('on'), i * 220)) });
  // e-mail
  ScrollTrigger.create({ trigger: '#mail', start: 'top 70%', once: true, onEnter: () => $$('.mf').forEach((t, i) => setTimeout(() => t.classList.add('on'), 300 + i * 450)) });
} else {
  $$('.tli,.mf').forEach(t => t.classList.add('on'));
  $$('.rv').forEach(w => w.style.color = '');
}

/* ---------- fluxos com passos (procura e equipe) ---------- */
function flow(root, onStep) {
  const steps = $$('.step', root), scenes = $$('.scene, .pscene', root);
  let cur = -1;
  const set = i => {
    if (i === cur) return; cur = i;
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    scenes.forEach((s, k) => s.classList.toggle('is-on', k === i));
    onStep && onStep(i);
  };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) set(+e.target.dataset.step); }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
  set(0);
}

/* cena 0: idioma troca sozinho */
const L = {
  PT: ['Casas para chegar bem.', 'Destino', 'Quartos', 'Temporada', 'Ver', 'trancoso.com.br/pt'],
  EN: ['Homes worth arriving to.', 'Destination', 'Bedrooms', 'Season', 'View', 'trancoso.com.br/en'],
  FR: ['Des maisons pour bien arriver.', 'Destination', 'Chambres', 'Saison', 'Voir', 'trancoso.com.br/fr'],
  NL: ['Huizen om goed aan te komen.', 'Bestemming', 'Slaapkamers', 'Seizoen', 'Bekijk', 'trancoso.com.br/nl'],
};
const order = ['FR', 'EN', 'NL', 'PT']; let li = 0, langTimer = null, carTimer = null, curTimer = null, qTimer = null;
function langCycle() {
  li = (li + 1) % order.length; const k = order[li], t = L[k];
  $$('#langs span').forEach(s => s.classList.toggle('on', s.textContent === k));
  const h = $('#htitle'); h.classList.add('out');
  setTimeout(() => { h.textContent = t[0]; h.classList.remove('out'); }, 420);
  $('#sl1').textContent = t[1]; $('#sl2').textContent = t[2]; $('#sl3').textContent = t[3]; $('#sl4').textContent = t[4]; $('#durl').textContent = t[5];
}
function carCycle() {
  const tr = $('#scar .carousel__track'); if (!tr) return;
  let i = 0; const n = tr.children.length;
  return setInterval(() => {
    i = (i + 1) % n; tr.style.transform = `translateX(-${i * 100}%)`;
    $$('#scar .dots i').forEach((d, k) => d.classList.toggle('on', k === i));
    $('#scount').textContent = `Foto ${i + 1} de 10 · mais 24 na página da casa`;
  }, 1800);
}
const RATE = { BRL: 1, USD: 1 / 5.76, EUR: 1 / 6.22 }, SYM = { BRL: 'R$', USD: 'US$', EUR: '€' };
const fmt = (v, c) => SYM[c] + ' ' + (Math.round(v * RATE[c] / 1000) * 1000).toLocaleString('pt-BR');
function curCycle() {
  const cs = ['BRL', 'USD', 'EUR']; let i = 0;
  return setInterval(() => {
    i = (i + 1) % 3; const c = cs[i];
    $$('.pbox__c span').forEach(s => s.classList.toggle('on', s.dataset.c === c));
    $('#pv').textContent = fmt(14800000, c);
  }, 1700);
}
function queuePush() {
  const q = $('#queue'); $$('.qi.new', q).forEach(n => n.classList.remove('new'));
  const d = document.createElement('div'); d.className = 'qi new';
  d.innerHTML = '<span>Claire Dubois<small>TRC-014 · temporada · FR</small></span><span>agora</span>';
  q.querySelector('h5').after(d);
  const all = $$('.qi', q); if (all.length > 4) all[all.length - 1].remove();
}
$$('.pbox__c span').forEach(s => s.addEventListener('click', () => {
  $$('.pbox__c span').forEach(x => x.classList.toggle('on', x === s)); $('#pv').textContent = fmt(14800000, s.dataset.c);
}));
const seekRoot = $('[data-flow="seek"]');
seekRoot && flow(seekRoot, i => {
  clearInterval(langTimer); clearInterval(carTimer); clearInterval(curTimer); clearTimeout(qTimer);
  if (reduced) return;
  if (i === 0) langTimer = setInterval(langCycle, 2200);
  if (i === 1) { const f = $('.range__fill'), ks = $$('.range__k'); f.style.left = '20%'; f.style.right = '50%'; ks[0].style.left = 'calc(20% - 7px)'; ks[1].style.left = 'calc(50% - 7px)'; setTimeout(() => { f.style.left = '40%'; f.style.right = '30%'; ks[0].style.left = 'calc(40% - 7px)'; ks[1].style.left = 'calc(70% - 7px)'; }, 350); }
  if (i === 2) carTimer = carCycle();
  if (i === 3) curTimer = curCycle();
  if (i === 4) qTimer = setTimeout(queuePush, 900);
});

/* fluxo da equipe */
const cal = $('#cal');
if (cal) {
  const h = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(x => `<span class="h">${x}</span>`).join('');
  const days = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  cal.innerHTML = h + days.map((d, i) => `<span data-i="${i}">${d}</span>`).join('');
}
let teamTimers = [];
const T = (fn, ms) => teamTimers.push(setTimeout(fn, ms));
const teamRoot = $('[data-flow="team"]');
teamRoot && flow(teamRoot, i => {
  teamTimers.forEach(clearTimeout); teamTimers = [];
  const side = ['ps0', 'ps0', 'ps0', 'ps0', 'ps0', 'ps2'];
  $$('.panel__side span').forEach(s => s.classList.toggle('on', s.id === side[i]));
  if (i === 0) { const w = $$('#who div'); w.forEach(x => x.classList.remove('on')); T(() => w[0].classList.add('on'), 600); }
  if (i === 1) {
    const ts = $$('#drop .t'); ts.forEach(t => t.classList.remove('in'));
    ts.forEach((t, k) => T(() => t.classList.add('in'), 250 + k * 220));
    const st = $$('#stepper span'); st.forEach((s, k) => s.classList.toggle('on', k === 0));
    T(() => st[1].classList.add('on'), 1600); T(() => st[2].classList.add('on'), 2400);
  }
  if (i === 2) {
    const el = $('#codebig'), chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789', target = 'TRC-034'; let n = 0;
    const tick = () => { n++; el.textContent = target.split('').map((c, k) => (k < n / 2 || c === '-') ? c : chars[Math.random() * chars.length | 0]).join(''); if (n < target.length * 2 + 2) T(tick, 45); else el.textContent = target; };
    if (!reduced) tick();
  }
  if (i === 3) { const s = $('#swap'); s.classList.remove('done'); T(() => s.classList.add('done'), 900); }
  if (i === 4) {
    const st = $('#soldStatus'), row = $('#soldRow'), v = $('#vitSold'), toast = $('#toast');
    st.className = 'status ok'; st.textContent = 'Disponível'; v.classList.remove('gone'); toast.classList.remove('in'); row.classList.remove('flash'); $('#vitN').textContent = '4 casas';
    T(() => { row.classList.add('flash'); }, 700);
    T(() => { st.className = 'status sold'; st.textContent = 'Vendido'; }, 1200);
    T(() => { v.classList.add('gone'); $('#vitN').textContent = '3 casas'; }, 1700);
    T(() => toast.classList.add('in'), 2100);
  }
  if (i === 5) {
    const cs = $$('#cal span[data-i]'); cs.forEach(c => c.className = '');
    for (let k = 7; k <= 14; k++) T(() => { cs[k].className = (k === 7 || k === 14) ? 'edge' : 'sel'; }, 300 + (k - 7) * 110);
  }
});

/* ---------- demo de filtro ---------- */
const HOUSES = [
  { c: 'TRC-021', n: 'Villa Itapororoca', m: 'venda', q: 6, a: 980, l: 'Itapororoca', p: 22000000, img: ['villa-itapororoca', 'interior-sala', 'piscina-detalhe', 'interior-suite'] },
  { c: 'TRC-031', n: 'Casa da Falésia', m: 'venda', q: 5, a: 720, l: 'Praia dos Nativos', p: 14800000, img: ['casa-falesia', 'piscina-detalhe', 'interior-suite', 'interior-sala'] },
  { c: 'TRC-027', n: 'Casa do Jardim', m: 'venda', q: 7, a: 1100, l: 'Terravista', p: 9600000, img: ['casa-jardim', 'interior-sala', 'textura-palha', 'interior-suite'] },
  { c: 'TRC-014', n: 'Casa da Praia', m: 'temporada', q: 6, a: 640, l: 'Itapororoca', low: 9000, high: 22000, img: ['casa-praia', 'piscina-detalhe', 'interior-sala', 'interior-suite'] },
  { c: 'TRC-008', n: 'Casa do Rio', m: 'temporada', q: 8, a: 860, l: 'Rio da Barra', low: 12000, high: 30000, img: ['casa-rio-da-barra', 'interior-suite', 'interior-sala', 'textura-palha'] },
  { c: 'TRC-019', n: 'Casa do Quadrado', m: 'venda', q: 4, a: 420, l: 'Quadrado', p: 6900000, img: ['quadrado', 'interior-suite', 'interior-sala', 'textura-palha'] },
  { c: 'TRC-033', n: 'Pavilhão da Mata', m: 'temporada', q: 5, a: 700, l: 'Terravista', low: 8000, high: 19000, img: ['hero-villa', 'interior-sala', 'piscina-detalhe', 'interior-suite'] },
  { c: 'TRC-036', n: 'Casa das Falésias', m: 'temporada', q: 9, a: 1250, l: 'Praia dos Nativos', low: 15000, high: 38000, img: ['falesias', 'casa-falesia', 'piscina-detalhe', 'interior-suite'] },
];
const F = { mode: 'all', min: 3, max: 8, loc: 'all', code: '', cur: 'BRL' };
const grid = $('#grid');
function cardHTML(h) {
  const badge = h.m === 'venda' ? '<span class="badge">Venda</span>' : '<span class="badge badge--t">Temporada</span>';
  const price = h.m === 'venda' ? `<div class="card__price" data-p="${h.p}">${fmt(h.p, F.cur)}</div>` : `<div class="card__price"><small>Valores por data · consultar</small></div>`;
  const slides = h.img.map(i => `<div><img src="img/${i}.webp" alt="" loading="lazy"></div>`).join('');
  const dots = Array.from({ length: 10 }, (_, k) => `<i class="${k === 0 ? 'on' : ''}"></i>`).join('');
  return `<article class="card" data-code="${h.c}"><div class="carousel ph"><div class="carousel__track">${slides}</div>${badge}<button class="prev" aria-label="Foto anterior">‹</button><button class="next" aria-label="Próxima foto">›</button><div class="dots">${dots}</div></div>
  <div class="card__b"><div class="card__code"><span>${h.c}</span><span>${h.l}</span></div><h4>${h.n}</h4><div class="card__specs"><span>${h.q} quartos</span><span>${h.a.toLocaleString('pt-BR')} m²</span><span>${h.q * 2} hóspedes</span></div>${price}</div></article>`;
}
if (grid) {
  grid.innerHTML = HOUSES.map(cardHTML).join('') + '<p class="empty" id="empty">Nenhuma casa com esse perfil agora. Na vida real, a equipe oferece uma parecida.</p>';
  $$('img', grid).forEach(img => img.addEventListener('error', () => img.setAttribute('data-missing', '')));
  $$('.card', grid).forEach(card => {
    const tr = $('.carousel__track', card), n = tr.children.length, dots = $$('.dots i', card); let i = 0;
    const go = d => { i = (i + d + n) % n; tr.style.transform = `translateX(-${i * 100}%)`; dots.forEach((x, k) => x.classList.toggle('on', k === i)); };
    $('.prev', card).addEventListener('click', () => go(-1)); $('.next', card).addEventListener('click', () => go(1));
    let sx = null; tr.addEventListener('pointerdown', e => sx = e.clientX); tr.addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 30) go(e.clientX < sx ? 1 : -1); sx = null; });
  });
}
function apply() {
  let n = 0;
  HOUSES.forEach(h => {
    const ok = (F.mode === 'all' || h.m === F.mode) && h.q >= F.min && h.q <= F.max && (F.loc === 'all' || h.l === F.loc) && (!F.code || h.c.toLowerCase().includes(F.code.toLowerCase()));
    const el = $(`.card[data-code="${h.c}"]`); if (!el) return;
    if (ok && el.classList.contains('hide')) { el.classList.remove('hide'); if (hasGsap && !reduced) gsap.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5, ease: 'power2.out' }); }
    if (!ok) el.classList.add('hide');
    if (ok) n++;
  });
  $('#empty').style.display = n ? 'none' : 'block';
  const cEl = $('#fCount'), from = +cEl.textContent;
  if (hasGsap && !reduced) { const o = { v: from }; gsap.to(o, { v: n, duration: .5, onUpdate: () => cEl.textContent = Math.round(o.v) }); } else cEl.textContent = n;
  $$('.card__price[data-p]').forEach(p => p.textContent = fmt(+p.dataset.p, F.cur));
}
const fMin = $('#fMin'), fMax = $('#fMax');
function rooms() {
  let a = +fMin.value, b = +fMax.value; if (a > b) { [a, b] = [b, a]; }
  F.min = a; F.max = b;
  $('#fRoomsV').textContent = a === b ? `${a} exatos` : `${a} a ${b === 10 ? '10+' : b}`;
  const pct = v => (v - 2) / 8 * 100; const f = $('#fFill'); f.style.left = pct(a) + '%'; f.style.right = (100 - pct(b)) + '%';
  apply();
}
if (fMin) {
  fMin.addEventListener('input', rooms); fMax.addEventListener('input', rooms);
  $$('#fMode button').forEach(b => b.addEventListener('click', () => { $$('#fMode button').forEach(x => x.classList.toggle('on', x === b)); F.mode = b.dataset.v; apply(); }));
  $$('#fCur button').forEach(b => b.addEventListener('click', () => { $$('#fCur button').forEach(x => x.classList.toggle('on', x === b)); F.cur = b.dataset.c; apply(); }));
  $('#fLoc').addEventListener('change', e => { F.loc = e.target.value; apply(); });
  $('#fCode').addEventListener('input', e => { F.code = e.target.value.trim(); apply(); });
  rooms();
}

/* ---------- painel de números ---------- */
const DATA = {
  m: { v: 3480, c: 61, r: 640000, s: 1, k: 1 / 3 },
  t: { v: 11240, c: 187, r: 2310000, s: 3, k: 1 },
  a: { v: 41800, c: 702, r: 8940000, s: 9, k: 3.7 },
};
const BARS = [['TRC-021', 'Villa Itapororoca', 2140, 41], ['TRC-014', 'Casa da Praia', 1860, 52], ['TRC-036', 'Casa das Falésias', 1520, 33], ['TRC-031', 'Casa da Falésia', 1310, 27], ['TRC-008', 'Casa do Rio', 990, 21], ['TRC-033', 'Pavilhão da Mata', 640, 13]];
const RENT = [['TRC-014', 'Casa da Praia', 31, 880000], ['TRC-036', 'Casa das Falésias', 18, 760000], ['TRC-008', 'Casa do Rio', 22, 470000], ['TRC-033', 'Pavilhão da Mata', 14, 200000]];
let per = 't';
const money = v => 'R$ ' + (v >= 1e6 ? (v / 1e6).toFixed(2).replace('.', ',') + ' mi' : Math.round(v / 1000) + ' mil');
function drawDash(animate) {
  const d = DATA[per];
  $$('.kpi b').forEach(b => {
    const k = b.dataset.k, to = d[k], o = { v: animate ? 0 : to };
    const out = v => k === 'r' ? money(v) : Math.round(v).toLocaleString('pt-BR');
    if (hasGsap && !reduced) gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out', onUpdate: () => b.textContent = out(o.v) }); else b.textContent = out(to);
  });
  const max = BARS[0][2] * d.k;
  $('#bars').innerHTML = BARS.map(b => `<div class="bar"><code>${b[0]}</code><div><div class="bar__t"><i style="width:0" data-w="${b[2] * d.k / max * 100}"></i></div><div class="bar__t" style="height:5px;margin-top:3px"><i class="b" style="width:0" data-w="${b[3] * d.k / (60 * d.k) * 100}"></i></div></div><em>${Math.round(b[2] * d.k).toLocaleString('pt-BR')}</em></div>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => $$('#bars i').forEach(i => i.style.width = i.dataset.w + '%')));
  $('#tbl').innerHTML = RENT.map((r, i) => `<tr class="${i === 0 ? 'top' : ''}"><td>${r[0]}</td><td>${r[1]}</td><td>${Math.round(r[2] * d.k)}</td><td>${money(r[3] * d.k)}</td></tr>`).join('');
}
const dash = $('#dash');
if (dash) {
  let drawn = false;
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !drawn) { drawn = true; drawDash(true); } }), { threshold: .3 }).observe(dash);
  $$('#dPer button').forEach(b => b.addEventListener('click', () => { $$('#dPer button').forEach(x => x.classList.toggle('on', x === b)); per = b.dataset.p; drawDash(true); }));
  $('#exportBtn').addEventListener('click', () => {
    const d = DATA[per];
    const rows = [['codigo', 'casa', 'visitas', 'contatos', 'noites_alugadas', 'receita_bruta_brl', 'status']];
    BARS.forEach(b => { const r = RENT.find(x => x[0] === b[0]); rows.push([b[0], b[1], Math.round(b[2] * d.k), Math.round(b[3] * d.k), r ? Math.round(r[2] * d.k) : 0, r ? Math.round(r[3] * d.k) : 0, 'disponivel']); });
    rows.push(['TRC-027', 'Casa do Jardim', 0, 0, 0, 0, 'vendido']);
    const csv = '﻿' + rows.map(r => r.join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'relatorio-imoveis-exemplo.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}

/* ---------- Google: a busca se digita sozinha ---------- */
const QUERIES = [
  { q: 'casa à venda trancoso 6 suítes', url: 'trancoso.com.br › venda › itapororoca', t: 'Villa com 6 suítes à venda em Itapororoca, Trancoso · TRC-021', d: 'Villa na mata atlântica a 400 m da praia de Itapororoca. 980 m², piscina de 25 m, casa de hóspedes. Atendimento em português, inglês, francês e holandês.' },
  { q: 'villa for sale trancoso bahia', url: 'trancoso.com.br › en › sale › itapororoca', t: '6-bedroom villa for sale in Itapororoca, Trancoso · TRC-021', d: 'A villa set in the Atlantic Forest, 400 m from Itapororoca beach. 980 m², 25 m pool, guest house. Price in BRL with USD and EUR reference.' },
  { q: 'villa à vendre trancoso brésil', url: 'trancoso.com.br › fr › vente › itapororoca', t: 'Villa de 6 suites à vendre à Itapororoca, Trancoso · TRC-021', d: 'Une villa au cœur de la forêt atlantique, à 400 m de la plage d’Itapororoca. 980 m², piscine de 25 m, maison d’amis.' },
];
const serpQ = $('#serpQ');
if (serpQ) {
  let qi = 0, running = false;
  const type = async () => {
    const it = QUERIES[qi];
    $('#r1').classList.add('wait'); $('#r2').classList.add('wait');
    serpQ.textContent = '';
    for (const ch of it.q) { serpQ.textContent += ch; await new Promise(r => setTimeout(r, reduced ? 0 : 55 + Math.random() * 50)); }
    $('#r1url').textContent = it.url; $('#r1t').textContent = it.t; $('#r1d').textContent = it.d;
    await new Promise(r => setTimeout(r, 450));
    $('#r1').classList.remove('wait'); setTimeout(() => $('#r2').classList.remove('wait'), 300);
    qi = (qi + 1) % QUERIES.length;
    setTimeout(type, 5200);
  };
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !running) { running = true; type(); } }), { threshold: .3 }).observe(serpQ);
}

/* ---------- laboratório da marca ---------- */
const logoIn = $('#logoIn');
if (logoIn) {
  logoIn.addEventListener('input', () => { const v = logoIn.value || 'Sua marca'; $('#pLogo').textContent = v; $('.brand__name').textContent = v; });
  $$('#sw button').forEach(b => b.addEventListener('click', () => {
    $$('#sw button').forEach(x => x.classList.toggle('on', x === b));
    document.documentElement.style.setProperty('--accent', b.dataset.a);
    document.documentElement.style.setProperty('--accent-2', b.dataset.b);
  }));
  $$('#fonts button').forEach(b => b.addEventListener('click', () => {
    $$('#fonts button').forEach(x => x.classList.toggle('on', x === b));
    document.documentElement.style.setProperty('--serif', b.dataset.f);
    hasGsap && ScrollTrigger.refresh();
  }));
}

/* ---------- escolha da opção ---------- */
const modal = $('#modal');
$$('[data-pick]').forEach(b => b.addEventListener('click', () => {
  const p = b.dataset.pick;
  $('#mMsg').textContent = p === 'Concierge' ? 'Queremos conversar sobre o Concierge.' : `Escolhemos a ${p}.`;
  modal.classList.add('in'); lenis && lenis.stop();
}));
const closeM = () => { modal.classList.remove('in'); lenis && lenis.start(); };
$('#mClose').addEventListener('click', closeM);
modal.addEventListener('click', e => { if (e.target === modal) closeM(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeM(); });
$('#mCopy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#mMsg').textContent); $('#mCopy span').textContent = 'Copiada'; } catch { $('#mCopy span').textContent = 'Selecione e copie'; }
  setTimeout(() => $('#mCopy span').textContent = 'Copiar mensagem', 2200);
});

/* ---------- começa ---------- */
const start = () => { openCurtain(); hasGsap && setTimeout(() => ScrollTrigger.refresh(), 400); };
let started = false;
const go = () => { if (started) return; started = true; start(); };
const heroImg = $('.hero__media img');
if (heroImg && !heroImg.complete) { heroImg.addEventListener('load', go); heroImg.addEventListener('error', go); setTimeout(go, 1500); } else go();
addEventListener('load', () => hasGsap && ScrollTrigger.refresh());
})();
