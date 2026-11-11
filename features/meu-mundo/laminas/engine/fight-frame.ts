// features/meu-mundo/laminas/engine/fight-frame.ts — entrada e saída da luta (apresentação 11, 2026-11-11).
//
// Só apresentação (Anexo A §6): nada aqui muda dano, tempo da regra ou a gravação. A câmera é a
// do jogo, misturada pelo AbilityDirector (abilities/director.ts) com estes dois roteiros; as
// peças de tela são DOM por cima do canvas, animando só transform e opacity.
//
// ENTRADA (do toque em INICIAR LUTA, tempo de tela):
//   0,00 · 0,36 · ease-in-out  chicote: corte seco num close de lado e a câmera gira até o plano
//                              de abertura; riscos de velocidade atravessam a tela
//   0,36 · 1,14 · linear       plano de abertura: os dois lutadores em quadro, câmera recuando
//   1,50                       a regra começa (a luta nasce parada e só anda aqui); HUD volta
//                              em 0,22 s e a câmera devolve o controle em ~0,5 s
//   Um toque pula direto para 1,50.
//
// SAÍDA (do fim da regra, tempo de tela):
//   0,00 · 0,20               normal (o último golpe termina); a HUD some em 0,14 s
//   0,20 · 1 quadro           defeito colorido (faixas deslocadas)
//   0,20 · 1,40               sem cor + borrão radial soltando; câmera lenta 0,35 e close 3/4
//                             de frente em quem venceu; letreiro passando (0,30 · 1,25)
//   1,35 · 0,25               a cor volta
//   1,60                      resultado em coluna
// Derrota: sem defeito, sem borrão e sem letreiro; só sem cor e câmera lenta 0,5, resultado em 1,40.

import type { AbilityScript, CamKey } from "../abilities/director"

/** Do toque até a regra andar (s de tela). */
export const INTRO_S = 1.5
/** Do fim da regra até o resultado (s de tela). */
export const OUTRO_WIN_S = 1.6
export const OUTRO_LOSE_S = 1.4
/** A saída começa este tanto depois do fim da regra. */
export const OUTRO_LEAD_S = 0.2

const WHIP_MS = 360
const GLITCH_MS = 40

/** O roteiro da entrada. `tall` = celular em pé: plano por cima do ombro em vez do plano de lado. */
export function introScript(tall: boolean, done: () => void): AbilityScript {
  // dist e alturas relativos ao corpo (director.ts); lead = quanto o olhar avança para o inimigo
  // por cima do ombro, baixo: quem joga grande na frente, o inimigo no fundo (o olhar nunca passa
  // da câmera: dist × far > lead). Deitado abre mais de lado para os dois caberem na largura.
  const camera: CamKey[] = tall
    ? [
        { t: 0, yaw: 64, dist: 1.9, high: 0.62, look: 0.62, lead: 0.4, fov: 0.62 },
        { t: 0.36, yaw: 24, dist: 3.4, high: 0.5, look: 0.55, lead: 2.0, fov: 0.9 },
        { t: INTRO_S, yaw: 15, dist: 3.9, high: 0.56, look: 0.55, lead: 2.4, fov: 0.88 },
      ]
    : [
        { t: 0, yaw: 150, dist: 1.9, high: 0.8, look: 0.86, lead: 0, fov: 0.55 },
        { t: 0.36, yaw: 42, dist: 4.6, high: 0.46, look: 0.5, lead: 2.6, fov: 0.82 },
        { t: INTRO_S, yaw: 32, dist: 5.2, high: 0.52, look: 0.5, lead: 3.0, fov: 0.8 },
      ]
  return {
    id: "intro",
    dur: INTRO_S,
    time: [{ t: 0, k: 1 }],
    camera,
    cues: [],
    step: () => {},
    finish: done,
    closeUntil: INTRO_S,
    cut: true,
  }
}

/** O roteiro da saída: câmera lenta e close 3/4 de frente em quem joga. Fica até a tela fechar. */
export function outroScript(win: boolean): AbilityScript {
  const slow = win ? 0.35 : 0.5
  const lead = OUTRO_LEAD_S
  // fim do trecho lento, no tempo do roteiro (que anda `slow` por segundo de tela)
  const end = lead + ((win ? OUTRO_WIN_S : OUTRO_LOSE_S) - lead) * slow
  const camera: CamKey[] = win
    ? [
        { t: 0, yaw: 120, dist: 3.4, high: 0.66, look: 0.7, lead: 0, fov: 0.74 },
        { t: end, yaw: 158, dist: 2.6, high: 0.72, look: 0.78, lead: 0, fov: 0.66, head: 1 },
      ]
    : [
        { t: 0, yaw: 60, dist: 4.2, high: 0.9, look: 0.4, lead: 0, fov: 0.8 },
        { t: end, yaw: 40, dist: 4.8, high: 1.05, look: 0.3, lead: 0, fov: 0.8 },
      ]
  return {
    id: "outro",
    // não fecha sozinho: a tela do resultado cobre e a luta é desmontada ao sair
    dur: 600,
    time: [
      { t: 0, k: 1 },
      { t: lead, k: 1 },
      { t: lead + 0.02, k: slow },
      { t: end, k: slow },
      { t: end + 0.1, k: 1 },
    ],
    camera,
    cues: [],
    step: () => {},
    finish: () => {},
    // o trecho lento conta como close: quem fica entre a câmera e o corpo sai de quadro
    closeUntil: end,
  }
}

const add = (layer: HTMLElement, css: string) => {
  const el = document.createElement("div")
  el.style.cssText = `position:absolute;pointer-events:none;will-change:transform,opacity;${css}`
  layer.appendChild(el)
  return el
}
const done = (el: HTMLElement, a: Animation) => {
  a.onfinish = () => el.remove()
  a.oncancel = () => el.remove()
}

/** Riscos de velocidade do chicote: atravessam a tela no sentido do giro (0,36 s). */
export function whipStreaks(layer: HTMLElement, dir: 1 | -1) {
  const el = add(
    layer,
    "inset:-10% -40%;opacity:0;background:repeating-linear-gradient(180deg,rgba(255,240,214,.0) 0 13px,rgba(255,240,214,.55) 13px 15px,rgba(255,240,214,0) 15px 31px,rgba(255,226,170,.32) 31px 32px,rgba(255,240,214,0) 32px 47px);-webkit-mask:linear-gradient(90deg,transparent,#000 30%,#000 70%,transparent);mask:linear-gradient(90deg,transparent,#000 30%,#000 70%,transparent)",
  )
  done(
    el,
    el.animate(
      [
        { transform: `translateX(${-18 * dir}%) scaleX(.7)`, opacity: 0 },
        { transform: `translateX(${-4 * dir}%) scaleX(1)`, opacity: 0.9, offset: 0.3 },
        { transform: `translateX(${16 * dir}%) scaleX(1.3)`, opacity: 0 },
      ],
      { duration: WHIP_MS, easing: "cubic-bezier(.4,0,.2,1)" },
    ),
  )
}

/** Um quadro de defeito: faixas coloridas deslocadas sobre a cena (~1 quadro). */
export function glitchFrame(layer: HTMLElement) {
  const bands = [
    ["#ff2a6d", 0, 18, 14],
    ["#22e6ff", 26, 12, -18],
    ["#b6ff3a", 44, 9, 10],
    ["#ff2a6d", 61, 15, -12],
    ["#22e6ff", 82, 11, 16],
  ] as const
  for (const [c, top, h, dx] of bands) {
    const el = add(layer, `left:-5%;right:-5%;top:${top}%;height:${h}%;background:${c};mix-blend-mode:screen;opacity:0`)
    done(
      el,
      el.animate(
        [
          { transform: `translateX(${dx}px)`, opacity: 0.62, offset: 0 },
          { transform: `translateX(${dx}px)`, opacity: 0.62, offset: 0.99 },
          { opacity: 0, offset: 1 },
        ],
        { duration: GLITCH_MS, easing: "steps(1,end)" },
      ),
    )
  }
}

/**
 * Nível `low` (sem o passe de tela): a cena "sem cor" é um véu cinza no modo saturação, que
 * tira a cor do que está embaixo sem shader novo. Entra em 0,12 s e sai nos últimos 0,25 s.
 */
export function grayVeil(layer: HTMLElement, ms: number) {
  // fora da camada de efeitos (ela tem z-index e isola a mistura): logo antes dela, por cima do canvas
  const el = document.createElement("div")
  el.style.cssText = "position:absolute;inset:0;pointer-events:none;will-change:opacity;background:#8a8a8a;mix-blend-mode:saturation;opacity:0"
  if (layer.parentElement) layer.parentElement.insertBefore(el, layer)
  else layer.appendChild(el)
  const a = 120 / ms
  const b = 1 - 250 / ms
  done(
    el,
    el.animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: a },
        { opacity: 1, offset: b },
        { opacity: 0, offset: 1 },
      ],
      { duration: ms, easing: "linear" },
    ),
  )
}

/**
 * O letreiro da vitória passando pela cena sem cor (Anexo A §6; em pé: 72 px, uma linha),
 * com duas faixas de latão atravessando na diagonal (no lugar das manchas da referência).
 */
export function victorySign(layer: HTMLElement, text: string, font: string) {
  const ms = (OUTRO_WIN_S - OUTRO_LEAD_S - 0.15) * 1000
  for (const [i, top, rot, delay] of [
    [0, 30, -14, 50],
    [1, 58, -14, 300],
  ] as const) {
    const el = add(layer, `left:-30%;right:-30%;top:${top}%;height:${i ? 9 : 14}px;background:linear-gradient(90deg,transparent,#8c4d0d 15%,#ffc64f 50%,#8c4d0d 85%,transparent);opacity:0;box-shadow:0 0 0 2px rgba(0,0,0,.35)`)
    done(
      el,
      el.animate(
        [
          { transform: `rotate(${rot}deg) translateX(-70%)`, opacity: 0 },
          { transform: `rotate(${rot}deg) translateX(-20%)`, opacity: 0.85, offset: 0.25 },
          { transform: `rotate(${rot}deg) translateX(70%)`, opacity: 0 },
        ],
        { duration: 600, delay, easing: "cubic-bezier(.3,.6,.3,1)", fill: "backwards" },
      ),
    )
  }
  const el = add(
    layer,
    `left:0;right:0;top:40%;text-align:center;white-space:nowrap;font:400 72px/1 ${font};letter-spacing:.02em;color:#f5ecd8;-webkit-text-stroke:2px rgba(60,38,10,.55);paint-order:stroke fill;text-shadow:0 4px 0 rgba(0,0,0,.35);opacity:0`,
  )
  el.textContent = text
  done(
    el,
    el.animate(
      [
        { transform: "translate3d(-9%,0,0)", opacity: 0, offset: 0 },
        { transform: "translate3d(-6%,0,0)", opacity: 0.92, offset: 0.12 },
        { transform: "translate3d(4%,0,0)", opacity: 0.85, offset: 0.76 },
        { transform: "translate3d(8%,0,0)", opacity: 0, offset: 1 },
      ],
      { duration: ms, delay: 100, easing: "linear", fill: "backwards" },
    ),
  )
}
