// features/meu-mundo/engine/cena-codigo/palcos.ts — os PALCOS DE LUTA dos Domínios sem kit do Tripo
// (os 6: Floresta, Cânion, Gelo, Fábrica, Vulcão, Orbital), montados com as MESMAS peças em código das cenas abertas.
//
// O círculo da luta (ARENA_R = 11 m, no centro) fica livre; em volta, anéis de peças do tema, cada lugar
// com a sua cara (entrada = a chegada do Domínio; fundo = o miolo; palácio = a porta do deus), o chão
// pintado na paleta do Domínio (com o detalhe de chao-detalhe.ts, pelo nome `<domínio>-palco-…`) e o
// horizonte do tema. Floresta e Cânion saíram do kit do Tripo em 2026-11-14 (pedido do Alex): agora
// nenhum palco de Domínio carrega modelo 3D.
// Um palco = uma Cena: 1 malha por bloco de 32 m (finishCena), como as cenas abertas.

import { noise, type RGB } from "./kit"
import { Cena, ground } from "./kit-cena"
import { mix, smooth } from "./kit-natureza"
import * as G from "./cenas/tema-gelo"
import * as V from "./cenas/tema-vulcao"
import * as F from "./cenas/tema-fabrica"
import * as O from "./cenas/tema-orbital"
import * as PV from "./pecas/vulcao"
import * as PO from "./pecas/orbital"
import * as FL from "./cenas/tema-floresta"
import * as CA from "./cenas/tema-canion"
import * as PF from "./pecas/floresta-lua"
import * as PC from "./pecas/canion"

export type PalcoDominio = "floresta" | "canion" | "gelo" | "fabrica" | "vulcao" | "orbital"
export type PalcoLugar = "entrada" | "fundo" | "palacio"
export const PALCO_DOMINIOS: readonly PalcoDominio[] = ["floresta", "canion", "gelo", "fabrica", "vulcao", "orbital"]
export const temPalco = (d: string): d is PalcoDominio => (PALCO_DOMINIOS as readonly string[]).includes(d)

/** Raio do círculo da luta (laminas/sim/fight.ts ARENA_R) — nada entra aqui. */
const R0 = 11

/** n peças num anel de raio r (com sobra de ângulo e de raio), virada para o centro: fn(x, z, ang, k). */
function anel(n: number, r: number, off: number, seed: number, fn: (x: number, z: number, ang: number, k: number) => void, jit = 1.4) {
  for (let k = 0; k < n; k++) {
    const a = ((k + off) / n) * Math.PI * 2 + (noise(k * 1.7, seed, 0.3) - 0.5) * 0.3
    const rr = r + (noise(k * 2.3, seed, 1.1) - 0.5) * jit
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr
    fn(x, z, Math.atan2(-x, -z), k)
  }
}

function chao(c: Cena, color: (x: number, z: number) => RGB) {
  ground(c, { x0: -80, z0: -80, x1: 80, z1: 80, step: c.lod ? 5 : 4, color })
}

// ── Floresta da Lua ──────────────────────────────────────────────────────────
// Peças copiadas das três cenas (pecas/floresta-lua.ts), chamadas direto: o atalho do tema guarda a "minúcia"
// da última cena aberta (estado do módulo) e o palco não tem caminho.
function floresta(c: Cena, lugar: PalcoLugar, lod: number) {
  const perto = !lod
  chao(c, (x, z) => {
    const d = Math.hypot(x, z)
    let col = mix(FL.GRAMA, FL.GRAMA_ESC, smooth(0.45, 0.8, noise(x * 0.08, 1.3, z * 0.08)) * 0.7)
    col = mix(col, FL.GRAMA_CL, smooth(0.6, 0.9, noise(x * 0.21, 4.1, z * 0.21)) * 0.35)
    // a clareira: terra batida dentro do círculo, que some na grama depois dele
    return mix(col, mix(FL.TRILHA, FL.TERRA_ESC, noise(x * 0.3, 2.2, z * 0.3) * 0.5), smooth(R0 + 3, R0 - 2, d) * 0.75)
  })
  if (lugar === "entrada") {
    // a boca da mata: o arco de pedras atrás de quem chega, cogumelos, flores e tufos na beira, rochedos e o anel de árvores
    PF.arcoPedras(c, 0, -(R0 + 8), 0, 3, lod)
    anel(9, R0 + 3, 0.2, 201, (x, z, _a, k) => PF.cogumeloLua(c, x, z, 1.4 + noise(k, 2, 1) * 0.8, k + 1, lod))
    anel(10, R0 + 2, 0.6, 203, (x, z, _a, k) => PF.florLua(c, x, z, 1 + noise(k, 3, 2) * 0.4, k + 1, lod, 3))
    if (perto) anel(12, R0 + 5.5, 0.35, 205, (x, z, _a, k) => PF.tufoPrata(c, x, z, 1.1, k + 1, lod))
    anel(6, R0 + 8, 0.8, 207, (x, z, _a, k) => PF.rochedoMusgo(c, x, z, 2.6 + noise(k, 1, 4), 1.7 + noise(k, 4, 1) * 0.6, k + 1, lod))
    anel(9, R0 + 17, 0.1, 209, (x, z, _a, k) => PF.arvoreLua(c, x, z, 14 + noise(k, 5, 3) * 4, k + 1, lod, PF.COPA, perto))
    anel(7, R0 + 29, 0.45, 211, (x, z, _a, k) => PF.arvoreLua(c, x, z, 18 + noise(k, 6, 3) * 4, k + 11, lod, PF.COPA_FUNDO, false))
    anel(5, R0 + 15, 0.3, 213, (x, z, _a, k) => PF.lanternaCasulo(c, x, z, 4.2 + (k % 2), 1.5, 2.6, k + 1))
  } else if (lugar === "fundo") {
    // a mata fechada: árvores mais perto e mais altas, troncos caídos, rochedos, cogumelos e flores acesas
    anel(7, R0 + 12, 0.1, 221, (x, z, _a, k) => PF.arvoreLua(c, x, z, 17 + noise(k, 5, 3) * 5, k + 21, lod, PF.COPA, perto))
    anel(5, R0 + 4, 0.3, 223, (x, z, a, k) => PF.troncoCaidoLua(c, x, z, 5 + noise(k, 1, 1), a + Math.PI / 2, k + 1, lod))
    anel(6, R0 + 7, 0.65, 225, (x, z, _a, k) => PF.rochedoMusgo(c, x, z, 3 + noise(k, 1, 4), 2 + noise(k, 4, 1) * 0.8, k + 7, lod))
    anel(8, R0 + 2.6, 0.5, 227, (x, z, _a, k) => PF.cogumeloLua(c, x, z, 1.6 + noise(k, 2, 1), k + 5, lod))
    anel(10, R0 + 1.8, 0.85, 229, (x, z, _a, k) => PF.florLua(c, x, z, 1.1, k + 9, lod, 3))
    anel(9, R0 + 24, 0.4, 231, (x, z, _a, k) => PF.arvoreLua(c, x, z, 20 + noise(k, 6, 3) * 5, k + 31, lod, PF.COPA_FUNDO, false))
    anel(6, R0 + 11, 0.6, 233, (x, z, _a, k) => PF.lanternaCasulo(c, x, z, 5 + (k % 3), 1.6, 3, k + 3))
  } else {
    // Pedraverde: colunata de menires com runa, arcos de pedras, os platôs com o trio de árvores ao fundo
    anel(8, R0 + 5, 0.5, 241, (x, z, a, k) => PF.menirRuna(c, x, z, 5 + noise(k, 3, 3), a, k + 1, lod), 0)
    anel(4, R0 + 11, 0.125, 243, (x, z, a, k) => PF.arcoPedras(c, x, z, a, k + 3, lod), 0)
    anel(3, R0 + 24, 0.4, 245, (x, z, a, k) => PF.trioPlato(c, x, z, a, k + 7, lod))
    anel(12, R0 + 2.2, 0.25, 247, (x, z, _a, k) => PF.florLua(c, x, z, 1.1, k + 13, lod, 3))
    anel(6, R0 + 8, 0.8, 249, (x, z, _a, k) => PF.cogumeloLua(c, x, z, 2, k + 9, lod))
    anel(8, R0 + 34, 0.1, 251, (x, z, _a, k) => PF.arvoreLua(c, x, z, 22 + noise(k, 6, 3) * 5, k + 41, lod, PF.COPA_FUNDO, false))
  }
  FL.fundoFloresta(c, 13)
}

// ── Cânion das Tempestades ───────────────────────────────────────────────────
function canion(c: Cena, lugar: PalcoLugar, lod: number) {
  chao(c, (x, z) => {
    const d = Math.hypot(x, z)
    let col = mix(CA.CAPIM, CA.CAPIM_SECO, smooth(0.4, 0.8, noise(x * 0.07, 3.3, z * 0.07)))
    col = mix(col, CA.CAPIM_ESC, smooth(0.65, 0.9, noise(x * 0.19, 1.7, z * 0.19)) * 0.4)
    // o terreiro da luta: terra e areia dentro do círculo
    return mix(col, mix(CA.TERRA, CA.AREIA, noise(x * 0.25, 6.1, z * 0.25)), smooth(R0 + 3, R0 - 2, d) * 0.8)
  })
  if (lugar === "entrada") {
    // a garganta: o arco natural atrás de quem chega, paredões em anel, rochas, arbustos amarelos e pampas
    PC.arcoNatural(c, 0, -(R0 + 9), 0, 8, 9, lod)
    anel(5, R0 + 17, 0.1, 301, (x, z, _a, k) => PC.penhasco(c, x, z, 7, 5.5, 9 + (k % 2) * 2, k + 1, lod, true))
    anel(9, R0 + 4, 0.35, 303, (x, z, a, k) => PC.rochaVermelha(c, x, z, 1.2 + noise(k, 2, 2) * 0.8, a, k + 1, lod))
    anel(8, R0 + 3, 0.7, 305, (x, z, _a, k) => PC.arbustoAmarelo(c, x, z, 1.3, k + 1, lod, k % 3 ? PC.AMARELO : PC.OCRE))
    anel(10, R0 + 2, 0.15, 307, (x, z, _a, k) => PC.pampa(c, x, z, 1.6, k + 1, lod))
    anel(5, R0 + 9, 0.55, 309, (x, z, _a, k) => PC.arvore(c, x, z, 5 + (k % 2), k + 1, lod, k % 4 === 0 ? "betula" : "redonda"))
  } else if (lugar === "fundo") {
    // o miolo: paredões mais altos e perto, agulhas com cristal, o moinho em ruína, cristais ciano na beira
    anel(6, R0 + 14, 0.2, 311, (x, z, _a, k) => PC.penhasco(c, x, z, 7.5, 6, 12 + (k % 3) * 2, k + 11, lod, true))
    anel(4, R0 + 7, 0.6, 313, (x, z, _a, k) => PC.agulhaBlocos(c, x, z, 8 + (k % 3) * 1.5, k + 3, lod, k % 2 === 0))
    anel(8, R0 + 4, 0.4, 315, (x, z, a, k) => PC.rochaVermelha(c, x, z, 1.4 + noise(k, 2, 2), a, k + 21, lod))
    anel(2, R0 + 24, 0.15, 317, (x, z, a, k) => PC.moinhoRuina(c, x, z, 9, a, k + 1, lod))
    anel(8, R0 + 2.5, 0.8, 319, (x, z, _a, k) => PC.cristalCiano(c, x, z, 0.8 + noise(k, 1, 1) * 0.4, k + 1, lod))
    anel(6, R0 + 5.5, 0.05, 321, (x, z, _a, k) => PC.arvore(c, x, z, 5.5, k + 9, lod, "vento"))
  } else {
    // o palácio de Zéphyra: colunata de arcos em ruína, pedestais de cristal, a Pista do Céu em volta no alto (15 m: acima da câmera da luta) e raios
    anel(6, R0 + 6, 1 / 12, 331, (x, z, a) => PC.arcoRuina(c, x, z, a + Math.PI / 2, lod), 0)
    anel(6, R0 + 3, 0.5, 333, (x, z, a) => PC.pedestalCristal(c, x, z, a, lod), 0)
    anel(5, R0 + 30, 0.3, 335, (x, z, _a, k) => PC.penhasco(c, x, z, 8, 6, 14 + (k % 2) * 3, k + 31, lod, true))
    const pts: [number, number, number][] = []
    for (let k = 0; k <= 16; k++) {
      const a = (k / 16) * Math.PI * 2
      pts.push([Math.cos(a) * (R0 + 20), 15 + Math.sin(a * 2) * 2, Math.sin(a) * (R0 + 20)])
    }
    CA.trilhoCeu(c, pts, lod, () => true)
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5
      CA.raio(c, Math.cos(a) * 70, Math.sin(a) * 70, 46, 20, k + 1)
    }
  }
  CA.fundoCanion(c, 15)
  PC.horizonteCanion(c, 15, lugar === "palacio" ? CA.NEVOA_TEMP : CA.NEVOA_DIA, lugar === "palacio")
}

// ── Mar de Gelo ──────────────────────────────────────────────────────────────
function gelo(c: Cena, lugar: PalcoLugar, lod: number) {
  chao(c, (x, z) => {
    const d = Math.hypot(x, z)
    let col = mix(G.NEVE, G.NEVE_SOMBRA, smooth(0.5, 0.8, noise(x * 0.08, 0.7, z * 0.08)) * 0.6)
    if (lugar !== "entrada") col = mix(col, G.GELO_CL, smooth(R0 + 6, R0 + 18, d) * 0.5)
    return col
  })
  if (lugar === "entrada") {
    // a costa: cerca de mourões com corda e lanterna, rochas nevadas, cristais, postes de bandeira, galeões ao fundo
    const ps: ReturnType<typeof G.mourao>[] = []
    anel(14, R0 + 3, 0, 3, (x, z, a, k) => ps.push(G.mourao(c, x, z, 1.2, a, k % 3 === 0, lod, k)), 0)
    for (let k = 0; k < ps.length; k++) G.corda(c, ps[k], ps[(k + 1) % ps.length], lod)
    anel(9, R0 + 7, 0.3, 5, (x, z, _a, k) => G.rochaNeve(c, x, z, 1.8 + noise(k, 2, 3) * 1.4, k, lod))
    anel(8, R0 + 9, 0.7, 7, (x, z, _a, k) => G.cristalGelo(c, x, z, 1.4 + noise(k, 4, 1), k, lod))
    anel(4, R0 + 12, 0.15, 9, (x, z, a) => G.posteBandeira(c, x, z, a, lod))
    anel(3, R0 + 24, 0.5, 11, (x, z, a, k) => G.navio(c, x, z, a + 1.2, 20 + k * 2, { seed: k, adorna: 0.15, empina: 0.1 }, lod))
    anel(10, R0 + 34, 0.2, 13, (x, z, _a, k) => G.iceberg(c, x, z, 5 + noise(k, 1, 2) * 4, k, lod))
    if (!lod) anel(18, R0 + 1.8, 0.4, 15, (x, z, _a, k) => G.capimGelo(c, x, z, 0.7, k, lod))
  } else if (lugar === "fundo") {
    // a caverna de gelo: colunas, arcos, corais e cristais
    anel(7, R0 + 8, 0.2, 21, (x, z, _a, k) => G.colunaGelo(c, x, z, 9 + noise(k, 3, 1) * 5, 1.6 + noise(k, 1, 4) * 0.6, k, lod))
    anel(4, R0 + 14, 0.65, 23, (x, z, a, k) => G.arcoCaverna(c, x, z, a + Math.PI / 2, 9, 8, k, lod))
    anel(12, R0 + 3.5, 0.1, 25, (x, z, _a, k) => G.coral(c, x, z, 1.4 + noise(k, 2, 2), k % 2 ? [0.96, 0.5, 0.7] : [0.92, 0.94, 1], k % 2 ? [0.6, 0.22, 0.4] : [0.6, 0.66, 0.8], k, lod, k % 3 ? "y" : "cand"))
    anel(10, R0 + 6, 0.55, 27, (x, z, _a, k) => G.cristalGelo(c, x, z, 1.6 + noise(k, 5, 2) * 1.4, k, lod))
    anel(8, R0 + 26, 0.1, 29, (x, z, _a, k) => G.iceberg(c, x, z, 7 + noise(k, 1, 2) * 5, k, lod))
  } else {
    // a porta do palácio de pérola: colunas altas, ruínas de arco com concha, cristais grandes
    anel(8, R0 + 6, 0.5, 31, (x, z, _a, k) => G.colunaGelo(c, x, z, 13 + noise(k, 3, 1) * 3, 1.5, k, lod))
    anel(6, R0 + 13, 0, 33, (x, z, a, k) => G.ruinaArco(c, x, z, a + Math.PI / 2, { vao: 7, h: 8, concha: k % 2 === 0, seed: k }, lod))
    anel(10, R0 + 3, 0.25, 35, (x, z, _a, k) => G.cristalGelo(c, x, z, 2.2 + noise(k, 5, 2), k, lod, undefined, true, true))
    anel(9, R0 + 30, 0.4, 37, (x, z, _a, k) => G.iceberg(c, x, z, 8 + noise(k, 1, 2) * 5, k, lod))
  }
  G.horizonteGelo(c, { seed: 4, nevoa: G.NEVOA })
}

// ── Vulcão de Kragor ─────────────────────────────────────────────────────────
function vulcao(c: Cena, lugar: PalcoLugar, lod: number) {
  chao(c, (x, z) => {
    const d = Math.hypot(x, z)
    let col = mix(V.PEDRA, V.PEDRA_ESC, smooth(0.4, 0.75, noise(x * 0.08, 5.2, z * 0.08)))
    col = mix(col, V.BASALTO, smooth(R0 + 4, R0 + 16, d) * 0.6)
    // debaixo das lajes: LAVA (só aparece na junta — as trincas acesas da ref 3)
    return mix(col, [1, 0.42, 0.08], smooth(R0 + 13, R0 + 10, d))
  })
  // o piso de lajes poligonais lilás-ardósia da ref, do centro até depois do círculo
  PV.lajesPoligonais(c, -R0 - 12, -R0 - 12, R0 + 12, R0 + 12, 1.9, 7, (x, z) => Math.hypot(x, z) < R0 + 10.5, lod)
  if (lugar === "entrada") {
    // a mina: boca na rocha, vagonetes, barris, postes de lanterna, rochas
    anel(3, R0 + 12, 0.15, 41, (x, z, a) => V.bocaMina(c, x, z, a, lod))
    anel(4, R0 + 5, 0.6, 43, (x, z, a) => V.vagonete(c, x, z, a + Math.PI / 2, lod))
    anel(10, R0 + 3, 0.3, 45, (x, z, _a, k) => V.barril(c, x, z, 1.1, k, lod))
    anel(6, R0 + 7, 0.85, 47, (x, z, a) => V.posteLanterna(c, x, z, 4, a, lod))
    anel(12, R0 + 18, 0.4, 49, (x, z, _a, k) => V.pedraEsc(c, x, z, 3 + noise(k, 2, 1) * 2.5, k))
    anel(8, R0 + 9, 0.05, 51, (x, z, _a, k) => V.cristalFogo(c, x, z, 1.2 + noise(k, 3, 2) * 0.8, k, lod))
  } else if (lugar === "fundo") {
    // as forjas: arcos de forja, bigornas, braseiros, lanças, colunas hexagonais
    anel(4, R0 + 9, 0.1, 61, (x, z, a) => V.forjaArco(c, x, z, a, lod))
    anel(6, R0 + 4, 0.45, 63, (x, z, a) => V.bigorna(c, x, z, a, lod))
    anel(8, R0 + 2.5, 0.75, 65, (x, z) => V.braseiro(c, x, z, 1.1, lod))
    anel(4, R0 + 6, 0.3, 67, (x, z, a) => V.rackLancas(c, x, z, a, lod))
    anel(7, R0 + 17, 0.6, 69, (x, z, _a, k) => V.colunas(c, x, z, 3.5, 7 + noise(k, 2, 2) * 5, k, lod))
    anel(2, R0 + 24, 0.2, 71, (x, z, a) => V.guindaste(c, x, z, a, lod))
  } else {
    // o salão de Kragor: martelos gigantes, braseiros, colunas hexagonais altas, cristais de fogo
    anel(4, R0 + 8, 0.12, 81, (x, z, a) => V.marteloGigante(c, x, z, a, lod))
    anel(10, R0 + 2.5, 0.5, 83, (x, z) => V.braseiro(c, x, z, 1.3, lod))
    anel(8, R0 + 14, 0.35, 85, (x, z, _a, k) => V.colunas(c, x, z, 4, 11 + noise(k, 2, 2) * 6, k, lod))
    anel(12, R0 + 5, 0.8, 87, (x, z, _a, k) => V.cristalFogo(c, x, z, 1.6 + noise(k, 3, 2), k, lod))
  }
  V.fundoVulcao(c, 5)
}

// ── Fábrica de Bronze ────────────────────────────────────────────────────────
function fabrica(c: Cena, lugar: PalcoLugar, lod: number) {
  chao(c, (x, z) => {
    const d = Math.hypot(x, z)
    let col = mix(F.CHAPA, F.CHAPA_ESC, smooth(0.45, 0.8, noise(x * 0.07, 2.4, z * 0.07)) * 0.7)
    col = mix(col, F.CHAPA_CL, smooth(R0 + 1, R0 - 1, d) * 0.25)
    return col
  })
  if (lugar === "entrada") {
    // o pátio: galpões com chaminé em volta, caixotes, barris, lampiões
    anel(6, R0 + 16, 0.1, 91, (x, z, a, k) => F.galpao(c, x, z, 12, 9, 7 + (k % 3) * 2, a, k, lod, true))
    anel(10, R0 + 4, 0.35, 93, (x, z, a, k) => F.caixote(c, x, z, 1.1 + (k % 3) * 0.2, a + k, 0, true))
    anel(8, R0 + 6, 0.7, 95, (x, z) => F.barril(c, x, z, 1, lod))
    anel(6, R0 + 2.5, 0.2, 97, (x, z) => F.lampiao(c, x, z, 3.6, lod))
  } else if (lugar === "fundo") {
    // a linha de produção: esteiras em volta, engrenagens grandes em pé, canos de cobre, fornos
    anel(6, R0 + 6, 0.25, 101, (x, z, a, k) => F.esteira(c, x, z, 8, a + Math.PI / 2, k, lod))
    anel(5, R0 + 13, 0.6, 103, (x, z, a, k) => F.engrenagem(c, x, 4 + (k % 2) * 2, z, 3 + (k % 3), a, lod))
    anel(3, R0 + 11, 0.05, 105, (x, z, a) => F.forno(c, x, z, 1.4, a, lod))
    anel(8, R0 + 9, 0.45, 107, (x, z) => F.cano(c, [x, 0, z], [x, 6, z], 0.35, lod))
    anel(5, R0 + 24, 0.3, 109, (x, z, a, k) => F.galpao(c, x, z, 14, 10, 9, a, k + 7, lod, true))
  } else {
    // a fortaleza da águia: fornos grandes, engrenagens gigantes, bandeiras, chaminés com fumaça
    anel(4, R0 + 9, 0.12, 111, (x, z, a) => F.forno(c, x, z, 2, a, lod))
    anel(6, R0 + 16, 0.5, 113, (x, z, a, k) => F.engrenagem(c, x, 6, z, 5 + (k % 2), a, lod))
    anel(6, R0 + 4, 0.3, 115, (x, z, a) => F.bandeira(c, x, 5, z, a, 1.2))
    anel(5, R0 + 22, 0.8, 117, (x, z, _a, k) => F.chamineFumaca(c, x, z, 0, 18 + (k % 3) * 4, k, lod))
    anel(8, R0 + 2.5, 0.05, 119, (x, z) => F.lampiao(c, x, z, 3.8, lod))
  }
  F.horizonteFabrica(c, 6, F.NEVOA_TARDE)
}

// ── Cidade Orbital ───────────────────────────────────────────────────────────
function orbital(c: Cena, lugar: PalcoLugar, lod: number) {
  chao(c, (x, z) => {
    const d = Math.hypot(x, z)
    let col = mix(O.MARMORE, O.MARMORE_S, smooth(0.5, 0.82, noise(x * 0.07, 3.1, z * 0.07)) * 0.5)
    // anel dourado em volta do círculo da luta
    col = mix(col, O.OURO, smooth(0.5, 0.1, Math.abs(d - (R0 + 1.6))) * 0.6)
    return col
  })
  if (lugar === "entrada") {
    // a praça: prédios brancos e ouro em volta, árvores redondas, canteiros de cristal
    anel(7, R0 + 17, 0.1, 121, (x, z, a, k) => O.predio(c, x, z, 10, 8, 10 + (k % 3) * 4, a, k, lod))
    anel(8, R0 + 5, 0.4, 123, (x, z, _a, k) => O.arvore(c, x, z, 4 + (k % 2), k, lod))
    anel(6, R0 + 8, 0.75, 125, (x, z, a, k) => O.canteiro(c, x, z, 3, 1.6, a, k, lod))
  } else if (lugar === "fundo") {
    // o céu da cidade: ilhas flutuantes, cristais, obeliscos
    anel(6, R0 + 18, 0.2, 131, (x, z, _a, k) => O.ilha(c, x, 8 + (k % 3) * 4, z, 4 + (k % 2) * 2, k, lod))
    anel(10, R0 + 5, 0.55, 133, (x, z, _a, k) => O.cristal(c, x, z, 2.5 + (k % 3), k, lod))
    anel(5, R0 + 9, 0.05, 135, (x, z, _a, k) => O.obelisco(c, x, z, 7 + (k % 2) * 3, k, lod))
  } else {
    // o Palácio Prisma: os portais em arco copiados em volta (passagem para o centro), torres de cristal com
    // anéis ao fundo, obeliscos, canteiros de cristal e árvores (as peças polidas das cenas)
    anel(4, R0 + 12, 0.125, 141, (x, z, a) => PO.portalArco(c, x, z, a, 8, lod), 0)
    anel(3, R0 + 34, 0.4, 143, (x, z, _a, k) => PO.torreCristalAneis(c, x, z, 34 + (k % 2) * 10, k + 3, lod))
    anel(8, R0 + 3, 0.25, 145, (x, z, _a, k) => O.obelisco(c, x, z, 4.5 + (k % 2) * 1.5, k, lod), 0)
    anel(8, R0 + 7, 0.62, 147, (x, z, a, k) => PO.canteiroCristal(c, x, z, a + Math.PI / 2, { seed: k }, lod), 0)
    anel(8, R0 + 18, 0.6, 149, (x, z, _a, k) => PO.arvoreRedonda(c, x, z, 4.5 + (k % 2), k, lod))
  }
  O.fundoOrbital(c, 7)
}

/** Monta o palco do Domínio `dom` no lugar `lugar` (`lod` 0 = perto). O nome começa pelo Domínio (detalhe do chão). */
export function montarPalco(dom: PalcoDominio, lugar: PalcoLugar, lod = 0): Cena {
  const c = new Cena(`${dom}-palco-${lugar}`, lod, 32, -16)
  if (dom === "floresta") floresta(c, lugar, lod)
  else if (dom === "canion") canion(c, lugar, lod)
  else if (dom === "gelo") gelo(c, lugar, lod)
  else if (dom === "vulcao") vulcao(c, lugar, lod)
  else if (dom === "fabrica") fabrica(c, lugar, lod)
  else orbital(c, lugar, lod)
  return c
}
