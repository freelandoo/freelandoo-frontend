"use client"

// features/meu-mundo/ui/status/stat-bars.tsx — as BARRAS DE STATUS da Visão
// Geral (2026-11-03). Pedido do Alex, com o desenho dele: uma linha por status
// (moldura dourada, ícone grande, nome em itálico, barra inclinada com marcas,
// "720 / 1000"), cada uma de uma cor — defesa, ataque, força, inteligência,
// destreza e velocidade, sem teto (a barra vai por faixas de 1000); no cabeçalho a placa NV + HP; no fim,
// a explicação de onde cada status influencia e como sobe.
//
// Força/inteligência/destreza/velocidade = o valor da vida (o mesmo da página
// Atributos). Defesa e ataque não são pontos na regra (são % do nível de
// aventura, heroLevelScale) — aqui viram 0–1000 só para a barra:
//   heroSheet de fight.ts: os mesmos números que a luta usa (sem o equipamento)
// e o % de verdade aparece pequeno ao lado do nome.
// Os textos da explicação seguem laminas/sim/fight.ts (statEffects,
// rankOdds, HERO_LEVEL) e o speedFactor do Jetpack.

import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Brain, Crosshair, Feather, Heart, Shield, Swords, Target, Zap } from "lucide-react"
import type { LifeFull } from "../../types"
import { useLocale } from "@/components/i18n/I18nProvider"
import { HERO_LEVEL, heroSheet } from "../../laminas/sim/fight"
import { anton } from "../hud/fight-plate"
import { archivo, cinzel, EVO, teko } from "./evo-skin"
import { currentUiFx } from "../kit/steam/fx-tier"

type Tr = (key: string, fallback: string) => string

export const STAT_MAX = 1000
/** Fim da faixa da barra: 1000, 2000, 3000… (os status não têm teto). */
export const statTop = (v: number, step = STAT_MAX) => Math.max(step, Math.ceil(v / step) * step)
const TRILHO = "rgba(4,4,8,.9)"
const CONTORNO = "rgba(196,200,214,.55)"
const MOLDURA = "rgba(214,167,91,.55)"
const CARD = "linear-gradient(180deg, rgba(22,26,34,.92), rgba(10,12,17,.92))"

/** Escurece um #rrggbb (o "fundo" do degradê). */
function darken(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (s: number) => Math.round(((n >> s) & 255) * (1 - k))
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}

const slant = (c: number) => `polygon(${c}px 0, 100% 0, calc(100% - ${c}px) 100%, 0 100%)`

/** Barra inclinada: trilho escuro, contorno de metal, enchimento em degradê com brilho, marcas inclinadas. */
function SlantBar({ f, color, h, ticks = 11 }: { f: number; color: string; h: number; ticks?: number }) {
  const target = Math.max(0, Math.min(1, f))
  // enche ao abrir (só transform; no "low" já nasce cheia)
  const [p, setP] = useState(() => (currentUiFx() === "low" ? target : 0))
  useEffect(() => {
    const id = requestAnimationFrame(() => setP(target))
    return () => cancelAnimationFrame(id)
  }, [target])
  const c = h * 0.7
  const b = 1.5
  return (
    <div className="relative w-full" style={{ height: h, filter: `drop-shadow(0 0 ${Math.round(h * 0.35)}px ${color}55)` }}>
      <div className="absolute inset-0" style={{ clipPath: slant(c), background: CONTORNO }} />
      <div className="absolute overflow-hidden" style={{ inset: b, clipPath: slant(c - b * 0.6), background: TRILHO }}>
        <div
          className="absolute inset-0"
          style={{
            clipPath: slant(c),
            background: `linear-gradient(180deg, ${color} 0%, ${color} 45%, ${darken(color, 0.45)} 100%)`,
            transform: `translateX(${(p - 1) * 100}%)`,
            transition: "transform 750ms cubic-bezier(.2,.8,.2,1)",
            willChange: "transform",
          }}
        >
          <div className="absolute inset-x-0 top-0" style={{ height: "34%", background: "linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,.12))" }} />
        </div>
        {Array.from({ length: ticks }, (_, i) => (
          <div
            key={i}
            className="absolute inset-y-0"
            style={{ left: `${((i + 1) * 100) / (ticks + 1)}%`, width: 1.5, background: "rgba(0,0,0,.42)", transform: "skewX(-32deg)" }}
          />
        ))}
      </div>
    </div>
  )
}

/** "720 / 1000" em itálico (Anton). */
function Value({ v, max, size }: { v: number; max: number; size: number }) {
  return (
    <span
      className={`${anton.className} inline-block shrink-0 whitespace-nowrap tabular-nums leading-none`}
      style={{ fontFamily: anton.style.fontFamily, fontSize: size, color: "#f5f1ed", transform: "skewX(-9deg)", textShadow: "0 2px 0 #000" }}
    >
      {v}
      <span style={{ fontSize: size * 0.78, color: "#d9dce4" }}> / {max}</span>
    </span>
  )
}

export interface StatRow {
  key: keyof typeof COLORS
  icon: ReactNode
  label: string
  value: number
  /** O valor de verdade quando não é ponto (o % da defesa/ataque). */
  note?: string
}

// hp = o rosa da barra de vida da luta (fight-plate)
const COLORS = { hp: "#FF168A", def: "#2F8BFF", atk: "#FF2E55", str: "#FF9A1F", int: "#B04DFF", dex: "#2EE85A", spd: "#FFD21F" } as const

/** As 6 linhas, na ordem pedida. `level` = nível de aventura (sem = nível 1). */
export function useStatRows(life: LifeFull, level: number | undefined, t: Tr): StatRow[] {
  const at = life.character.attributes
  const h = heroSheet(life.avatar, level ?? 1, at)
  return [
    // pedido do Alex (11/11): o HP mora aqui, com defesa e ataque (saiu do cabeçalho)
    { key: "hp", icon: <Heart />, label: t("stHp", "HP"), value: Math.round(h.hp) },
    { key: "def", icon: <Shield />, label: t("stDefense", "Defesa"), value: Math.round(h.def) },
    { key: "atk", icon: <Swords />, label: t("stAttack", "Ataque"), value: Math.round(h.atk) },
    { key: "str", icon: <Target />, label: t("atStrength", "Acuracidade"), value: h.acc },
    { key: "int", icon: <Brain />, label: t("atIntelligence", "Inteligência"), value: at.intelligence },
    { key: "dex", icon: <Crosshair />, label: t("attrDexterity", "Destreza"), value: at.dexterity ?? 0 },
    { key: "spd", icon: <Feather />, label: t("atSpeed", "Velocidade"), value: h.spd },
  ]
}

/** Ícone colorido com brilho. */
function Glyph({ color, size, children }: { color: string; size: number; children: ReactNode }) {
  return (
    <span className="flex shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full" style={{ width: size, height: size, color, filter: `drop-shadow(0 0 6px ${color}aa)` }}>
      {children}
    </span>
  )
}

/** Uma linha do desenho do Alex: moldura, ícone, nome, barra e "N / 1000". */
function StatLine({ row, small }: { row: StatRow; small: boolean }) {
  const v = Math.round(Math.max(0, row.value))
  const top = statTop(v)
  const color = COLORS[row.key]
  return (
    <div
      className="flex min-w-0 items-center"
      style={{
        gap: small ? 7 : 14,
        padding: small ? "8px 10px" : "10px 18px 10px 16px",
        borderRadius: small ? 8 : 10,
        background: CARD,
        boxShadow: `inset 0 0 0 1px ${MOLDURA}, inset 0 1px 0 rgba(255,255,255,.06), 0 2px 8px rgba(0,0,0,.4)`,
      }}
    >
      <Glyph color={color} size={small ? 24 : 36}>
        {row.icon}
      </Glyph>
      <div className="flex shrink-0 items-baseline" style={{ width: small ? 132 : 236, gap: small ? 4 : 8 }}>
        <span
          className={`${teko.className} inline-block min-w-0 truncate font-semibold uppercase leading-none`}
          style={{ fontSize: small ? 19 : 31, letterSpacing: "0.01em", color: EVO.branco, transform: "skewX(-8deg)", textShadow: "0 2px 0 #000", paddingTop: "0.12em" }}
        >
          {row.label}
        </span>
        {row.note && (
          <span className={`${archivo.className} shrink-0 font-bold tabular-nums`} style={{ fontSize: small ? 9.5 : 12.5, color }}>
            {row.note}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <SlantBar f={v / top} color={color} h={small ? 15 : 24} ticks={small ? 7 : 11} />
      </div>
      <div className="flex shrink-0 justify-end" style={{ width: small ? 70 : 118 }}>
        <Value v={v} max={top} size={small ? 16 : 26} />
      </div>
    </div>
  )
}

/** As 6 barras, uma embaixo da outra. */
export function StatBars({ life, level, t, small = false, onPick }: { life: LifeFull; level?: number; t: Tr; small?: boolean; onPick?: (key: StatRow["key"]) => void }) {
  const rows = useStatRows(life, level, t)
  return (
    <div className="grid" style={{ rowGap: small ? 6 : 8 }}>
      {rows.map((r) =>
        onPick ? (
          <button key={r.key} type="button" onClick={() => onPick(r.key)} className="block w-full text-left transition-transform duration-100 active:scale-[0.985]" aria-haspopup="dialog">
            <StatLine row={r} small={small} />
          </button>
        ) : (
          <StatLine key={r.key} row={r} small={small} />
        ),
      )}
    </div>
  )
}

/** Onde vale e como sobe, por atributo (o texto que antes ficava todo no fim da Visão geral). */
export function statGuideText(k: StatRow["key"], t: Tr): { where: string; how: string } {
  switch (k) {
    case "hp":
      return { where: t("sgHpWhere", "É a vida na luta: cada golpe que passa pela defesa tira daqui. Zerou, a luta acaba."), how: t("sgHpHow", "Começa no valor do personagem e sobe a cada nível de aventura.") }
    case "def":
      return { where: t("sgDefWhere", "Amortece o dano: disputa com o ataque de quem bate. Ataque 100 contra defesa 1000 passa só 10%."), how: t("sgDefHow2", "Começa no valor do personagem e sobe a cada nível de aventura. O equipamento do Armeiro e da Forja soma por cima.") }
    case "atk":
      return { where: t("sgAtkWhere", "A força do golpe: multiplica o dano e fura a defesa de quem apanha."), how: t("sgAtkHow2", "Começa no valor do personagem e sobe a cada nível de aventura. A arma e o refino na Forja somam por cima.") }
    case "str":
      return { where: t("sgStrWhere", "Chance de acertar: disputa com a velocidade de quem apanha. 100 contra 1000 acerta 10%. Conta para virar adulto."), how: t("sgStrHow2", "Treinando na academia (rende até 4 h por dia); whey, creatina, pré-treino e anabolizante aceleram. Depois de 1 dia sem treino cai 5 pontos por dia, até 60% do maior valor.") }
    case "int":
      return { where: t("sgIntWhere", "Mostra o aviso do golpe do inimigo mais cedo (até +35%) e é o que mais pesa na chance de golpe forte."), how: t("sgIntHow2", "Estudando na escola ou na universidade (rende até 5 h por dia). Depois de 1 dia sem estudar cai 1 ponto por dia, nunca abaixo de 90% do maior valor.") }
    case "dex":
      return { where: t("sgDexWhere", "Gasta menos fôlego no ataque e na esquiva (até −15%), recupera a arma mais rápido e ajuda no golpe forte."), how: t("sgDexHow2", "Jogando os minijogos e lutando. Depois de 1 dia sem jogar cai 5 pontos por dia, até 60% do maior valor.") }
    default:
      return { where: t("sgSpdWhere", "Esquiva, até sem apertar: disputa com a acuracidade de quem bate. Também dá ritmo aos golpes e ao passo; no Jetpack, a velocidade do voo."), how: t("sgSpdHow2", "Treinando na academia. Depois de 1 dia sem treino cai 5 pontos por dia, até 60% do maior valor; voltar ao topo é mais rápido.") }
  }
}

/**
 * Cartão do atributo (apresentação 03): sobe de baixo ao tocar numa barra da Ficha.
 * "Onde vale / Como sobe / De onde vem". Entra em 220 ms (transform), sai no toque fora,
 * no X ou no ESC. `origin` = as parcelas (treino, piso, nível, equipamento) quando houver.
 */
export function StatCard({ row, origin, t, onClose }: { row: StatRow; origin: [string, string][]; t: Tr; onClose: () => void }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true))
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", key)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener("keydown", key)
    }
  }, [onClose])
  const g = statGuideText(row.key, t)
  const color = COLORS[row.key]
  // portal: o STATUS tem transform (o fixed dele ficaria preso à moldura, atrás da navegação)
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center" role="dialog" aria-modal aria-label={row.label} onPointerDown={(e) => e.target === e.currentTarget && onClose()} style={{ background: on ? "rgba(6,8,12,.55)" : "rgba(6,8,12,0)", transition: "background 220ms" }}>
      <div
        className={`${archivo.className} w-full max-w-[520px] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3`}
        style={{ background: CARD, boxShadow: `inset 0 0 0 1px ${MOLDURA}, 0 -4px 0 #000`, transform: on ? "translateY(0)" : "translateY(100%)", transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)" }}
      >
        <div className="flex items-center gap-3">
          <Glyph color={color} size={28}>
            {row.icon}
          </Glyph>
          <span className={`${teko.className} min-w-0 flex-1 truncate text-[24px] font-semibold uppercase leading-none`} style={{ color: EVO.branco, paddingTop: "0.12em" }}>
            {row.label}
          </span>
          <span className={`${anton.className} text-[40px] leading-none tabular-nums`} style={{ color, fontFamily: anton.style.fontFamily }}>
            {Math.round(row.value)}
          </span>
          <button type="button" onClick={onClose} aria-label={t("stCardClose", "Fechar")} className="grid h-11 w-11 place-items-center text-[16px]" style={{ color: EVO.mudo }}>
            ✕
          </button>
        </div>
        <dl className="mt-3 grid gap-2 text-[13px] leading-[1.4]">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color }}>{t("sgWhere", "Onde vale:")}</dt>
            <dd style={{ color: EVO.branco }}>{g.where}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: EVO.douradoClaro }}>{t("sgHow", "Como sobe:")}</dt>
            <dd style={{ color: EVO.mudo }}>{g.how}</dd>
          </div>
          {origin.length > 0 && (
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: EVO.douradoClaro }}>{t("sgFrom", "De onde vem:")}</dt>
              <dd className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {origin.map(([k, v]) => (
                  <span key={k} className="whitespace-nowrap" style={{ color: EVO.mudo }}>
                    {k} <b className="tabular-nums" style={{ color: EVO.branco }}>{v}</b>
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>,
    document.body,
  )
}

/** A placa "NV. 6" do cabeçalho (com o XP do nível embaixo). */
export function LevelBadge({ level, into, need, t }: { level: number; into: number; need: number; t: Tr }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div
        className="flex items-baseline gap-1.5 px-5 py-1.5"
        style={{
          clipPath: "polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)",
          background: "linear-gradient(180deg, #2a2216, #0d0b08)",
          boxShadow: "inset 0 0 0 2px #E8B65B",
        }}
      >
        <span className={`${anton.className} inline-block leading-none`} style={{ fontFamily: anton.style.fontFamily, fontSize: 22, color: "#FFE9B8", transform: "skewX(-9deg)" }}>
          {t("stLvShort", "NV.")}
        </span>
        <span className={`${anton.className} inline-block leading-none`} style={{ fontFamily: anton.style.fontFamily, fontSize: 38, color: "#FFD23F", transform: "skewX(-9deg)", textShadow: "0 2px 0 #000" }}>
          {level}
        </span>
      </div>
      <span className={`${archivo.className} tabular-nums`} style={{ fontSize: 11, color: EVO.mudo }}>
        {need > 0 ? `${into} / ${need} XP` : "MAX"}
      </span>
    </div>
  )
}

/**
 * T3/B7 (2026-11-08): a placa de PODER do cabeçalho (fórmula do B7). O número é o que o servidor gravou
 * (tb_mm_character.power, regra única features/meu-mundo/power/power.ts).
 */
export function PowerPlate({ power, t, small = false }: { power: number; t: Tr; small?: boolean }) {
  const locale = useLocale()
  return (
    <div
      className="flex shrink-0 items-center gap-2 py-1.5 pl-4 pr-6"
      title={t("stPowerHint", "Força + velocidade + destreza + inteligência + acurácia + HP máx do nível + equipamento (1% de bônus = 10)")}
      style={{
        clipPath: "polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)",
        background: "linear-gradient(180deg, #2a2208, #0d0b04)",
        boxShadow: "inset 0 0 0 2px #FFD23F, inset 0 0 16px rgba(255,210,63,.3)",
      }}
    >
      <Glyph color="#FFD23F" size={small ? 18 : 26}>
        <Zap />
      </Glyph>
      <span className={`${anton.className} inline-block leading-none`} style={{ fontFamily: anton.style.fontFamily, fontSize: small ? 14 : 20, color: "#FFE9B8", transform: "skewX(-9deg)" }}>
        {t("stPower", "PODER")}
      </span>
      <span className={`${anton.className} inline-block tabular-nums leading-none`} style={{ fontFamily: anton.style.fontFamily, fontSize: small ? 20 : 30, color: "#FFD23F", transform: "skewX(-9deg)", textShadow: "0 2px 0 #000" }}>
        {Math.round(power).toLocaleString(locale)}
      </span>
    </div>
  )
}

/** O fim da página: onde cada status influencia e como sobe. */
export function StatGuide({ t, small = false }: { t: Tr; small?: boolean }) {
  const items: [keyof typeof COLORS, ReactNode, string, string, string][] = [
    [
      "hp",
      <Heart key="i" />,
      t("stHp", "HP"),
      t("sgHpWhere", "É a vida na luta: cada golpe que passa pela defesa tira daqui. Zerou, a luta acaba."),
      t("sgHpHow", "Começa no valor do personagem e sobe a cada nível de aventura."),
    ],
    [
      "def",
      <Shield key="i" />,
      t("stDefense", "Defesa"),
      t("sgDefWhere", "Amortece o dano: disputa com o ataque de quem bate. Ataque 100 contra defesa 1000 passa só 10%."),
      t("sgDefHow2", "Começa no valor do personagem e sobe a cada nível de aventura. O equipamento do Armeiro e da Forja soma por cima."),
    ],
    [
      "atk",
      <Swords key="i" />,
      t("stAttack", "Ataque"),
      t("sgAtkWhere", "A força do golpe: multiplica o dano e fura a defesa de quem apanha."),
      t("sgAtkHow2", "Começa no valor do personagem e sobe a cada nível de aventura. A arma e o refino na Forja somam por cima."),
    ],
    [
      "str",
      <Target key="i" />,
      t("atStrength", "Acuracidade"),
      t("sgStrWhere", "Chance de acertar: disputa com a velocidade de quem apanha. 100 contra 1000 acerta 10%. Conta para virar adulto."),
      t("sgStrHow2", "Treinando na academia (rende até 4 h por dia); whey, creatina, pré-treino e anabolizante aceleram. Depois de 1 dia sem treino cai 5 pontos por dia, até 60% do maior valor."),
    ],
    [
      "int",
      <Brain key="i" />,
      t("atIntelligence", "Inteligência"),
      t("sgIntWhere", "Mostra o aviso do golpe do inimigo mais cedo (até +35%) e é o que mais pesa na chance de golpe forte."),
      t("sgIntHow2", "Estudando na escola ou na universidade (rende até 5 h por dia). Depois de 1 dia sem estudar cai 1 ponto por dia, nunca abaixo de 90% do maior valor."),
    ],
    [
      "dex",
      <Crosshair key="i" />,
      t("attrDexterity", "Destreza"),
      t("sgDexWhere", "Gasta menos fôlego no ataque e na esquiva (até −15%), recupera a arma mais rápido e ajuda no golpe forte."),
      t("sgDexHow2", "Jogando os minijogos e lutando. Depois de 1 dia sem jogar cai 5 pontos por dia, até 60% do maior valor."),
    ],
    [
      "spd",
      <Feather key="i" />,
      t("atSpeed", "Velocidade"),
      t("sgSpdWhere", "Esquiva, até sem apertar: disputa com a acuracidade de quem bate. Também dá ritmo aos golpes e ao passo; no Jetpack, a velocidade do voo."),
      t("sgSpdHow2", "Treinando na academia. Depois de 1 dia sem treino cai 5 pontos por dia, até 60% do maior valor; voltar ao topo é mais rápido."),
    ],
  ]
  return (
    <div style={{ padding: small ? 10 : "14px 18px", borderRadius: small ? 8 : 10, background: CARD, boxShadow: `inset 0 0 0 1px ${MOLDURA}` }}>
      <h3 className={`${cinzel.className} font-bold uppercase leading-tight`} style={{ fontSize: small ? 12.5 : 15, letterSpacing: "0.08em", color: "#FFD68A", textShadow: "0 1px 0 #000" }}>
        {t("sgTitle", "Como funcionam os status")}
      </h3>
      <div className={`mt-2 grid ${small ? "gap-2.5" : "grid-cols-2 gap-x-6 gap-y-3"}`}>
        {items.map(([k, icon, label, where, how]) => (
          <div key={k} className="flex items-start" style={{ gap: small ? 8 : 10 }}>
            <Glyph color={COLORS[k]} size={small ? 18 : 22}>
              {icon}
            </Glyph>
            <div className={`${archivo.className} min-w-0 leading-snug`} style={{ fontSize: small ? 11 : 13 }}>
              <div className={`${teko.className} font-semibold uppercase leading-none`} style={{ fontSize: small ? 16 : 20, color: COLORS[k] }}>
                {label}
              </div>
              <div style={{ color: EVO.branco }}>
                <b>{t("sgWhere", "Onde vale:")}</b> {where}
              </div>
              <div style={{ color: EVO.mudo }}>
                <b style={{ color: EVO.douradoClaro }}>{t("sgHow", "Como sobe:")}</b> {how}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className={`${archivo.className} mt-3 leading-snug`} style={{ fontSize: small ? 10.5 : 12.5, color: EVO.mudo }}>
        {t(
          "sgFoot",
          "Cada nível de aventura também soma +{n} em acuracidade, inteligência, destreza e velocidade (vale na luta). A prática de cada dia tem limite; vencer rende mais que perder, e com energia alta e estresse baixo rende mais.",
        ).replace("{n}", String(HERO_LEVEL.attr))}
      </p>
    </div>
  )
}
