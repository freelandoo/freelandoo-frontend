"use client";

import { useEffect } from "react";

import {
  NARROW_MAX_PX,
  OPENING,
  actWindows,
  frameSrc,
  type FrameSet,
} from "./content/frames";

/**
 * O MOTOR DA ABERTURA — um laço de `requestAnimationFrame`, e mais nada.
 *
 * Ele governa DUAS coisas com a MESMA leitura de posição: o quadro do vídeo
 * desenhado no `<canvas>` e a opacidade dos três atos que se cruzam por cima.
 * São o mesmo gesto — a rolagem — e separá-los em dois laços faria o texto
 * andar num compasso e a imagem noutro, com o desencontro aparecendo só na
 * máquina fraca.
 *
 * ── POR QUE NÃO O ScrollTrigger, SE O RESTO DO TEMA É GSAP ────────────────
 *
 * Porque o ScrollTrigger CACHEIA o início e o fim de cada gatilho no
 * `refresh()`, e esta é a primeira coisa da página. A Archivo com eixo `wdth`
 * troca as métricas quando assenta, o `svh` do celular muda quando a barra do
 * navegador some, e a abertura tem três telas de altura: qualquer um dos três
 * desloca o intervalo e o vídeo passa a terminar antes (ou depois) da rolagem
 * — sem erro nenhum, só desencontrado. O `scroll-motion.tsx` já paga esse
 * imposto com um `refresh()` agendado; aqui o custo de acertar é menor: uma
 * leitura de `getBoundingClientRect()` de UM elemento por quadro, sempre
 * atual, imune às três coisas de uma vez. E fica desacoplado — a abertura
 * continua de pé mesmo que o contexto do GSAP seja desfeito.
 *
 * ── AS REGRAS QUE MORDEM EM SILÊNCIO ──────────────────────────────────────
 *
 * ⚠️ O PALCO EXISTE SEM O VÍDEO. `data-scrub="on"` é escrito sempre que há
 * movimento permitido — não depende de existir quadro nenhum. Com
 * `OPENING.count === 0` o `<canvas>` fica transparente e o fundo do tema
 * aparece por baixo: os três atos continuam se cruzando na rolagem. É isto que
 * torna o vídeo um ENCAIXE e não uma reescrita.
 *
 * ⚠️ SEM JAVASCRIPT O ATRIBUTO NUNCA É ESCRITO, e os três atos ficam
 * empilhados como três blocos de texto normais. É a mesma disciplina do
 * `data-motion` do tema: o robô e quem tem JS bloqueado leem o site inteiro,
 * inclusive o `<h1>`.
 *
 * ⚠️ QUADRO QUE FALTA NÃO É ERRO. `onerror` só devolve a vaga da fila: um
 * arquivo ausente (a pasta ainda não existe, o upload saiu pela metade)
 * resolve no vizinho mais próximo já carregado. A abertura degrada para menos
 * quadros, nunca para tela preta.
 *
 * ⚠️ `pointer-events` E `visibility` ACOMPANHAM A OPACIDADE. Um ato invisível
 * continua ocupando a mesma célula da grade: sem isto, o ato 3 — que está por
 * cima na ordem do DOM — engoliria os cliques dos botões do ato 1, e o site
 * abriria com dois CTAs que não respondem. `visibility: hidden` também tira o
 * botão escondido da ordem de tabulação, coisa que `pointer-events` sozinho
 * não faz.
 */
export default function OpeningMotion() {
  useEffect(() => {
    const found = document.querySelector<HTMLElement>(".tpl-ecoluz [data-open-stage]");
    if (!found) return;
    // ⚠️ A REDECLARAÇÃO NÃO É REDUNDANTE. O laço abaixo é uma `function`
    // içada, e o TypeScript não leva o estreitamento do `if` acima para dentro
    // dela — sem esta linha, o `getBoundingClientRect()` do laço não compila
    // (TS18047) e a saída fácil seria um `!`, que é uma afirmação sem prova.
    const stage: HTMLElement = found;

    const acts = Array.from(stage.querySelectorAll<HTMLElement>("[data-open-act]"));
    if (!acts.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Movimento reduzido: nada de palco. Os três atos ficam empilhados e
    // legíveis, que é o que a preferência pede — não uma versão mais curta do
    // mesmo efeito.
    if (reduced) return;

    stage.setAttribute("data-scrub", "on");

    /* ── O VÍDEO ──────────────────────────────────────────────────────────
       Tudo daqui para baixo é opcional: sem quadros, o laço governa só os
       atos e o canvas nunca é tocado. */

    const canvas = stage.querySelector<HTMLCanvasElement>("[data-open-canvas]");
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;

    // ⚠️ "Economia de dados" é escolha explícita de quem navega, e uma
    // sequência de quadros é o arquivo mais pesado do site. Respeitar aqui é
    // barato: o palco continua inteiro, só sem o fundo em movimento.
    const wantsFrames = OPENING.count > 0 && !!canvas && conn?.saveData !== true;

    const set: FrameSet = window.innerWidth <= NARROW_MAX_PX ? "narrow" : "wide";
    const step = set === "narrow" ? Math.max(1, OPENING.narrowStep) : 1;
    const store: (HTMLImageElement | undefined)[] = new Array(OPENING.count);

    let alive = true;
    let ctx: CanvasRenderingContext2D | null = null;
    let lastImg: HTMLImageElement | null = null;
    let queued = 0;

    /* ── O CARREGAMENTO, EM DUAS PASSADAS ─────────────────────────────────
       ⚠️ A ORDEM DA FILA É A FEATURE. Carregado do primeiro ao último, o
       arraste só responde no trecho já baixado e a abertura parece travada
       enquanto o resto chega. Pedindo primeiro um quadro esparso ao longo de
       TODA a sequência, a rolagem inteira responde em segundos — grosseira,
       mas contínua —, e a segunda passada só adensa o que já se move. */
    const order: number[] = [];
    if (wantsFrames) {
      const coarse = 8 * step;
      for (let i = 0; i < OPENING.count; i += coarse) order.push(i);
      for (let i = 0; i < OPENING.count; i += step) {
        if (i % coarse !== 0) order.push(i);
      }
    }

    let cursor = 0;
    let inFlight = 0;
    const MAX_PARALLEL = 6;

    function request() {
      if (!queued) queued = window.requestAnimationFrame(tick);
    }

    function pump() {
      while (alive && inFlight < MAX_PARALLEL && cursor < order.length) {
        const idx = order[cursor];
        cursor += 1;
        inFlight += 1;
        const img = new Image();
        img.decoding = "async";
        const done = () => {
          inFlight -= 1;
          if (alive) pump();
        };
        img.onload = () => {
          store[idx] = img;
          // O quadro que acabou de chegar pode ser melhor que o desenhado
          // agora — pede um passo do laço em vez de esperar a próxima rolagem.
          request();
          done();
        };
        img.onerror = done;
        img.src = frameSrc(idx, set);
      }
    }

    /** O quadro pedido, ou o vizinho mais próximo que já existe. */
    function nearest(i: number): HTMLImageElement | undefined {
      const hit = store[i];
      if (hit) return hit;
      for (let d = 1; d < OPENING.count; d += 1) {
        const before = i - d;
        if (before >= 0 && store[before]) return store[before];
        const after = i + d;
        if (after < OPENING.count && store[after]) return store[after];
      }
      return undefined;
    }

    /**
     * ⚠️ O ENQUADRAMENTO É FEITO NA MÃO. `object-fit` não existe para o que se
     * desenha num canvas: sem esta conta a imagem sai esticada, e a distorção
     * só aparece na proporção de tela que ninguém testou.
     */
    function paint(img: HTMLImageElement) {
      if (!canvas || !ctx) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (!cw || !ch || !iw || !ih) return;
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }

    function resize() {
      if (!canvas) return;
      // ⚠️ O DPR É LIMITADO A 2. O custo de um canvas é POR PIXEL, e num
      // aparelho de DPR 3 uma tela cheia passa de oito milhões deles por
      // desenho — a mesma conta que fez o fundo WebGPU da plataforma sair em
      // 2026-09-09. Acima de 2 ninguém distingue uma imagem em movimento sob
      // um véu.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      lastImg = null; // a caixa mudou: o desenho de antes não vale mais
    }

    /* ── O LAÇO ───────────────────────────────────────────────────────────
       Uma leitura de posição, três atos e (se houver) um quadro. */

    // ⚠️ AS JANELAS SAEM DO VÍDEO, NÃO DE UMA DIVISÃO IGUAL. Cada ato tem um
    // pedaço do plano contínuo que lhe pertence (`ACT_CUES`, em segundos, no
    // contrato dos quadros): o texto troca quando a IMAGEM troca. São
    // calculadas UMA vez — elas não mudam com a rolagem, e recalculá-las a
    // cada quadro seria a conta mais cara deste laço sem trocar um pixel.
    //
    // ⚠️ E ELAS PODEM TER LARGURAS DIFERENTES — foi por isso que `FADE_IN` e
    // `FADE_OUT` saíram daqui. Como constantes, eram fração da janela: a mesma
    // travessia durava mais no ato longo e menos no curto. Agora cada janela
    // traz a própria `fade`, derivada de um tempo de VÍDEO fixo.
    const total = acts.length;
    const windows = actWindows(total);
    const lastOpacity = new Array<number>(total).fill(-1);

    function tick() {
      queued = 0;
      if (!alive) return;

      const rect = stage.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const progress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;

      for (let i = 0; i < total; i += 1) {
        const win = windows[i];
        const width = win.end - win.start;
        const local = width > 0 ? (progress - win.start) / width : 0;
        let opacity: number;

        if (local < 0) {
          // Antes da vez. O primeiro ato é a exceção: ele já nasce aceso,
          // porque é o primeiro quadro que a pessoa vê da página.
          opacity = i === 0 ? 1 : 0;
        } else if (local > 1) {
          // Depois da vez. O último não apaga — se apagasse, a passagem para a
          // seção seguinte seria uma tela vazia.
          opacity = i === total - 1 ? 1 : 0;
        } else if (i > 0 && win.fade > 0 && local < win.fade) {
          opacity = local / win.fade;
        } else if (i < total - 1 && win.fade > 0 && local > 1 - win.fade) {
          opacity = (1 - local) / win.fade;
        } else {
          opacity = 1;
        }

        // Escrever estilo que não mudou continua invalidando o estilo do
        // elemento. Com três atos e sessenta quadros por segundo, pular o que
        // não mudou é quase toda a economia deste laço.
        if (Math.abs(opacity - lastOpacity[i]) < 0.004) continue;
        lastOpacity[i] = opacity;

        const el = acts[i];
        const away = 1 - opacity;
        const shift = local < 0.5 ? away * 26 : away * -26;
        el.style.opacity = String(opacity);
        el.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
        el.style.visibility = opacity <= 0.01 ? "hidden" : "visible";
        el.style.pointerEvents = opacity >= 0.6 ? "auto" : "none";
      }

      if (wantsFrames && ctx) {
        const idx = Math.min(
          OPENING.count - 1,
          Math.max(0, Math.round(progress * (OPENING.count - 1))),
        );
        const img = nearest(idx);
        // ⚠️ A COMPARAÇÃO É PELA IMAGEM, NÃO PELO ÍNDICE. Enquanto a sequência
        // está esparsa, vários índices resolvem no mesmo arquivo — comparando
        // índice, o mesmo desenho seria refeito a cada pixel de rolagem. E
        // haveria um segundo defeito: um quadro que chegasse DEPOIS nunca
        // seria desenhado, porque o índice já teria sido marcado como pronto.
        if (img && img !== lastImg) {
          paint(img);
          lastImg = img;
        }
      }
    }

    function onResize() {
      resize();
      request();
    }

    if (wantsFrames && canvas) {
      ctx = canvas.getContext("2d", { alpha: true });
      stage.setAttribute("data-frames", "on");
      resize();
      pump();
    }

    tick();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    // As fontes assentando mudam a altura dos atos — e com ela o centro do
    // palco. Redesenhar depois disso custa um quadro.
    if (document.fonts?.ready) document.fonts.ready.then(request).catch(() => {});

    return () => {
      alive = false;
      if (queued) window.cancelAnimationFrame(queued);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", onResize);
      stage.removeAttribute("data-scrub");
      stage.removeAttribute("data-frames");
      for (const el of acts) {
        el.style.opacity = "";
        el.style.transform = "";
        el.style.visibility = "";
        el.style.pointerEvents = "";
      }
    };
  }, []);

  return null;
}
