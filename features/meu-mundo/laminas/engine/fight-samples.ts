// features/meu-mundo/laminas/engine/fight-samples.ts — os arquivos de som da luta (áudio S1, 2026-11-11).
//
// Cada método toca o arquivo aprovado daquele momento e devolve true; sem arquivo (não aprovado,
// não baixou ainda) devolve false e quem chamou toca o sintetizador de antes (audio.ts /
// strike-audio.ts). Só apresentação: quem decide o QUE aconteceu e QUANDO é o FightEvent da
// simulação (sim/fight.ts), e o impacto toca no evento "hit" (o contato), não no botão.
// Boxe (ringue) usa os sons do ringue; a luta das Lâminas usa os da assinatura de quem joga.

import { FIGHT, fightPreload, godRoar, mob, playAny, playSample, preloadSamples, skill, ult, type Voice } from "../../engine/audio"

export interface FightSamplesOpts {
  /** Id da assinatura de quem joga (abilities/signatures.ts) e a família de efeito dela. */
  sig: string | null
  family: string | null
  /** Tipos de monstro da luta (MobKind). */
  kinds: string[]
  /** Deus chefe do setor (fases), se houver. */
  boss?: string | null
  /** Boxe: sons do ringue. */
  ring: boolean
}

const BOXE = {
  punch: "jogo-boxe-soco",
  block: "jogo-boxe-bloqueio",
  bell: "jogo-boxe-sino",
  count: "jogo-boxe-contagem",
  fall: "jogo-boxe-queda",
}

export function fightSamples(o: FightSamplesOpts) {
  const sig = o.sig ?? "aventura"
  const fam = o.family ?? "steel"
  const u = ult(sig)
  const s = skill(fam)
  if (o.ring) preloadSamples(Object.values(BOXE))
  else preloadSamples(fightPreload(sig, fam, o.kinds, o.boss))
  const p = (a: string, gain = 1) => !!playSample(a, { gain })
  let lastHurt = 0
  let charging: Voice | null = null

  return {
    swing: (combo: number) => !o.ring && p(FIGHT.swing[combo % FIGHT.swing.length], 0.75),
    /** Contato confirmado (evento "hit" em monstro). */
    hit: (heavy: boolean, crit: boolean) =>
      o.ring ? p(BOXE.punch, heavy ? 1 : 0.7) : p(heavy ? FIGHT.hitHeavy : FIGHT.hitLight, heavy ? 1 : 0.8) && (!crit || p(FIGHT.crit, 0.7) || true),
    /** O monstro sentiu (no máximo um a cada 0,25 s, para não virar metralhadora). */
    hurt: (kind: string) => {
      const now = performance.now()
      if (o.ring || now - lastHurt < 250) return false
      lastHurt = now
      return p(mob(kind).hurt, 0.6)
    },
    death: (kind: string) => (o.ring ? p(BOXE.fall) : p(mob(kind).death, 0.9) && (p(FIGHT.ko, 0.7) || true)),
    /** Eu levei (com ou sem escudo). */
    took: (heavy: boolean, shield: boolean) =>
      o.ring ? p(shield ? BOXE.block : BOXE.punch, heavy ? 1 : 0.7) : shield ? p(s.shieldHit, 0.9) : p(heavy ? FIGHT.hitHeavy : FIGHT.hitLight, 0.85),
    fall: () => (o.ring ? p(BOXE.fall) : p(FIGHT.ko)),
    dodge: () => !o.ring && p(FIGHT.dodge, 0.8),
    miss: () => !o.ring && p(FIGHT.miss, 0.7),
    ready: () => !o.ring && p(FIGHT.ready, 0.6),
    denied: () => !o.ring && p(FIGHT.denied, 0.6),
    end: (win: boolean) => (o.ring ? p(BOXE.bell) : p(win ? FIGHT.win : FIGHT.lose)),
    slash: () => !o.ring && p(s.slashCast),
    slashHit: () => !o.ring && p(s.slashImpact, 0.9),
    dash: () => !o.ring && p(s.dash),
    shieldUp: () => !o.ring && p(s.shieldUp),
    shieldDown: () => !o.ring && p(s.shieldDown, 0.8),
    /** Poder Máximo carregando (evento "power"): a energia acumulando, que corta no disparo. */
    charge: () => {
      if (o.ring) return false
      charging?.stop(0.05)
      charging = playSample(u.charge, { gain: 0.9, fadeIn: 0.08 })
      return !!charging
    },
    /**
     * Poder Máximo disparou (evento "powerFire"), pedido do Alex (2026-11-11): "carrega um pouco
     * no início e depois solta um estrondo, com pressão, como se fosse várias pressões".
     * A carga corta; o impacto da assinatura + o estrondo dela (explosão, terremoto) + uma camada
     * geral sorteada; depois quatro ondas de pressão em sequência, cada uma um pouco mais fraca.
     */
    ultFire: () => {
      if (o.ring) return false
      charging?.stop(0.12)
      charging = null
      const a = p(u.impact)
      const b = p(u.quake, 1)
      playAny([...FIGHT.max], { gain: 0.6, at: 0.06 })
      const waves: [number, number][] = [[0.22, 1], [0.55, 0.85], [0.95, 0.7], [1.4, 0.55]]
      waves.forEach(([at, gain], i) => playSample(FIGHT.pressure[i % FIGHT.pressure.length], { gain, at, vary: 0.06 }))
      return a || b
    },
    fireballOut: () => !o.ring && p(FIGHT.fireballOut, 0.8),
    fireballBoom: () => !o.ring && p(FIGHT.fireballBoom, 0.9),
    /** Monstro começa o ataque (aviso) e solta (golpe). */
    mobWarn: (kind: string) => !o.ring && p(mob(kind).warn, 0.7),
    mobStrike: (kind: string) => !o.ring && p(mob(kind).strike, 0.85),
    /** Troca de fase do deus chefe: o grito dele. */
    roar: (god: string) => !o.ring && p(godRoar(god)),
  }
}

export type FightSamples = ReturnType<typeof fightSamples>
