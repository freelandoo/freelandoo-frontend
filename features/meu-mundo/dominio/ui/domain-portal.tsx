"use client"

// features/meu-mundo/dominio/ui/domain-portal.tsx — lore v2 D1 + apresentação 15: o
// PORTAL DOS DOMÍNIOS como MAPA DE FASES (Anexo A §7.3).
//
// Abre no "E" debaixo do anel do lado leste da praça. A praça continua viva atrás (sem
// véu no meio, só sombra em cima e embaixo). Em cima, a barra única e a fileira dos seis
// Domínios (capítulos da travessia). No meio, os 10 setores como PLACAS NUMERADAS numa
// linha: vencido = aceso na cor do Domínio, o próximo = aro pulsando, fechado = apagado,
// o setor 10 = placa rubi do chefe. Lugar da história (Pedraverde) = desvio para baixo
// com o ícone de livro; depois do 10, a passagem para o próximo Domínio. Tocar numa
// placa abre o PAINEL da fase: objetivo, recomendado (Poder e nível, contra o seu),
// ambiente e prêmios — e o botão de entrar. Tudo vem do servidor (GET /domains): o
// aparelho não decide se está aberto. Trilha E, E12: o painel mostra a TABELA DE SAQUE do
// setor que o servidor sorteia (garantido, chance e o bônus da primeira vitória) e o que o 10 abre.
//
// Custo: DOM parado; só a placa do próximo setor anima (transform/opacity) e nada no
// `low` nem com movimento reduzido.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowRight, BookOpen, Check, Crown, Loader2, Lock, Swords } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getDomains, type DomainId, type DomainInfo, type DomainLootRow, type DomainSector, type DomainSectorLoot, type DomainsState } from "../../data"
import { TopBar } from "../../ui/kit/top-bar"
import { SP } from "../../ui/kit/steam/steam-tokens"
import { TAP, TX, TYPE } from "../../ui/kit/type-scale"
import { anton } from "../../ui/hud/fight-plate"
import { archivo } from "../../ui/status/evo-skin"

type Tr = (key: string, fallback: string) => string

const NAME_PT: Record<DomainId, string> = {
  floresta: "Floresta da Lua",
  canion: "Cânion das Tempestades",
  gelo: "Mar de Gelo",
  fabrica: "Fábrica de Bronze",
  vulcao: "Vulcão de Kragor",
  orbital: "Cidade Orbital",
}
const GOD_PT: Record<string, string> = { noctis: "Noctis", zephyra: "Zéphyra", maru: "Marú", aeryn: "Aeryn", kragor: "Kragor", iris: "Íris" }
/** Cor do tema (placa vencida, filete do capítulo). */
const TINT: Record<DomainId, string> = { floresta: "#3FF2C4", canion: "#FF7A59", gelo: "#8FD8FF", fabrica: "#E5BE70", vulcao: "#FF5A3A", orbital: "#B48CFF" }
const ROMAN = ["I", "II", "III", "IV", "V", "VI"]
/** Placa do chefe: rubi (a mesma família do botão de luta da cidade, etapa 12). */
const BOSS = { plate: "linear-gradient(180deg, #C2243A 0%, #8E1B2A 60%, #5A0F19 100%)", rim: "#FF526A" }

export const domainName = (t: Tr, id: DomainId | string) => t(`domName_${id}`, NAME_PT[id as DomainId] ?? id)
export const godName = (t: Tr, god: string) => t(`domGod_${god}`, GOD_PT[god] ?? god)

/** D2: as criaturas da lore (historia/v2/04-mundo-exploravel.md). */
const FOE_PT: Record<string, string> = {
  mariposa: "Mariposas Cinzentas",
  cervo: "Cervo Oco",
  coruja: "Coruja de Mil Olhos",
  sonambulo: "Sonâmbulo",
  lobo: "Lobos de Ferrugem",
  selene: "Selene de Sombra",
  noctis: "Noctis",
  // D5: o Cânion das Tempestades (§2)
  abutre: "Abutres de Pó",
  chacal: "Chacais de Vento",
  mensageiro: "Mensageiro Sem Rosto",
  escorpiao: "Escorpião Para-raios",
  harpia: "Harpias",
  carta: "A Carta",
  zephyra: "Zéphyra",
  // Domínios v2: Mar de Gelo (§3), Fábrica de Bronze (§4), Vulcão de Kragor (§5), Cidade Orbital (§6)
  peixe: "Peixes-Lanterna Cegos",
  caranguejo: "Caranguejos-Âncora",
  afogado: "Afogados da Maré",
  serpente: "Serpentes do Rio",
  ciborgue: "Ciborgue",
  ondina: "Ondina, a Barqueira",
  maru: "Marú",
  rato: "Ratos de Engrenagem",
  aranha: "Aranhas-Relógio",
  cobaia: "Cobaias",
  sucata: "Golens de Sucata",
  garras: "Dama das Garras",
  esteira: "A Esteira",
  aeryn: "Aeryn",
  salamandra: "Salamandras de Brasa",
  mineiro: "Mineiros Fundidos",
  touro: "Touros de Lava",
  lutador: "Lutadores do Poço",
  golem: "Golem de Pedra",
  brutamontes: "Brutamontes",
  kragor: "Kragor",
  pomba: "Pombas Prismáticas",
  camaleao: "Camaleões Rachados",
  pintor: "Pintores Sem Cor",
  espelho: "Espelhos",
  cavaleiro: "Cavaleiro Dourado",
  arco: "O Arco Partido",
  iris: "Íris",
}
export const foeName = (t: Tr, id: string) => t(`domFoe_${id}`, FOE_PT[id] ?? id)

/** Por que está fechado, em uma linha (null = aberto). */
export function lockText(t: Tr, d: DomainInfo): string | null {
  if (!d.lock) return null
  if (d.lock.code === "trainer") return t("domLockTrainer", "Abre no nível {n} do treinador").replace("{n}", String(d.lock.level))
  return t("domLockCrossing", "Atravesse antes: {name}").replace("{name}", domainName(t, d.lock.from))
}

const STAGE_PT: Record<DomainSector["stage"], string> = { entrada: "Entrada", fundo: "Fundo", palacio: "Palácio" }
const PLACE_ABOUT_PT: Record<string, string> = { pedraverde: "A clareira onde o Golem está sentado. A história do capítulo passa por aqui." }

/** Quem o setor tem, pelo nome da lore (Domínio sem fatia própria: "Guardião do setor N"). */
function sectorFoe(t: Tr, s: DomainSector) {
  return s.foe ? foeName(t, s.foe.id) : t("domGuardian", "Guardião do setor {n}").replace("{n}", String(s.n))
}

type Pick = { kind: "sector"; n: number } | { kind: "place"; id: string }

/** A placa acesa ao abrir: o próximo setor a vencer (o mapa abre "na fase seguinte"). */
function defaultPick(d: DomainInfo): Pick {
  const next = d.sectors.find((s) => s.open && !s.cleared)
  return { kind: "sector", n: next?.n ?? (d.crossed ? d.sectors.length : 1) }
}

function calmMotion() {
  if (typeof window === "undefined") return true
  return document.documentElement.getAttribute("data-mm-fx") === "low" || window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function DomainPortal({ onClose, onEnter }: { onClose: () => void; onEnter: (id: DomainId) => void }) {
  const t = useTranslations("MeuMundo") as Tr
  const [state, setState] = useState<DomainsState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cur, setCur] = useState<DomainId | null>(null)
  const [pick, setPick] = useState<Pick | null>(null)
  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setError(null)
    const r = await getDomains(token)
    if (r.ok) {
      setState(r.data)
      // o portal "leva ao primeiro": abre no primeiro aberto e não atravessado
      const first = r.data.domains.find((d) => d.open && !d.crossed) ?? r.data.domains[0]
      if (first) {
        setCur(first.id)
        setPick(defaultPick(first))
      }
    } else setError(r.error)
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const dom = state?.domains.find((d) => d.id === cur) ?? null
  const choose = (d: DomainInfo) => {
    setCur(d.id)
    setPick(defaultPick(d))
  }

  return (
    <div className={`${archivo.className} fixed inset-0 z-[90] flex flex-col`} role="dialog" aria-modal="true" aria-label={t("centerDomains", "Portal dos Domínios")}>
      <style>{PORTAL_CSS}</style>
      {/* a praça segue viva atrás: só sombra em cima (barra + capítulos) e embaixo (painel) */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[42%]" style={{ background: "linear-gradient(180deg, rgba(8,10,13,0.92) 0%, rgba(8,10,13,0.7) 55%, rgba(8,10,13,0) 100%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%]" style={{ background: "linear-gradient(0deg, rgba(8,10,13,0.94) 0%, rgba(8,10,13,0.75) 50%, rgba(8,10,13,0) 100%)" }} />
      <TopBar
        title={t("centerDomains", "Portal dos Domínios")}
        onBack={onClose}
        extra={
          state ? (
            <span className={`${TX.label} shrink-0 pr-1 text-right font-bold uppercase tracking-[0.12em]`} style={{ color: SP.goldHi }}>
              {t("domTrainerShort", "Treinador {n}").replace("{n}", String(state.trainer))}
              {state.bypass && <span style={{ color: SP.cyan }}> · {t("domAdmin", "Admin: passa direto")}</span>}
            </span>
          ) : null
        }
      />
      {!state || !dom ? (
        <div className="relative grid flex-1 place-items-center" style={{ color: SP.muted }}>
          {error ? (
            <button type="button" onClick={() => void load()} className={`${TX.body} px-4 font-bold`} style={{ minHeight: TAP, background: SP.goldPlate, color: SP.ink }}>
              {error}
            </button>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin" aria-label={t("domEntering", "Entrando…")} />
          )}
        </div>
      ) : (
        <>
          <ChapterRail domains={state.domains} cur={dom.id} t={t} onPick={choose} />
          <DomainTitle d={dom} t={t} />
          <Track key={dom.id} d={dom} t={t} pick={pick} onPick={setPick} next={state.domains[state.domains.indexOf(dom) + 1] ?? null} />
          {pick && <PhasePanel d={dom} pick={pick} power={state.power} next={state.domains[state.domains.indexOf(dom) + 1] ?? null} t={t} onEnter={() => onEnter(dom.id)} />}
        </>
      )}
    </div>
  )
}

const PORTAL_CSS = `
.mm-oct { --cut: 28%; clip-path: polygon(var(--cut) 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, var(--cut) 100%, 0 calc(100% - var(--cut)), 0 var(--cut)) }
button.mm-oct { --cut: 12px }
@keyframes mmdp-pulse { 0% { transform: scale(1); opacity: .85 } 100% { transform: scale(1.45); opacity: 0 } }
@keyframes mmdp-in { from { transform: translateY(10px); opacity: 0 } to { transform: none; opacity: 1 } }
.mmdp-pulse { animation: mmdp-pulse 1.4s cubic-bezier(.22,1,.36,1) infinite }
.mmdp-in { animation: mmdp-in .35s cubic-bezier(.22,1,.36,1) both }
:root[data-mm-fx="low"] .mmdp-pulse, :root[data-mm-fx="low"] .mmdp-in { animation: none }
@media (prefers-reduced-motion: reduce) { .mmdp-pulse, .mmdp-in { animation: none } }
`

/** Os seis Domínios em fila (capítulos). Fechado continua tocável: mostra o mapa e o cadeado. */
function ChapterRail({ domains, cur, t, onPick }: { domains: DomainInfo[]; cur: DomainId; t: Tr; onPick: (d: DomainInfo) => void }) {
  return (
    <nav className="relative flex shrink-0 gap-1 overflow-x-auto px-3 pt-2 [scrollbar-width:none]" aria-label={t("domChapters", "Domínios da travessia")}>
      {domains.map((d, i) => {
        const on = d.id === cur
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onPick(d)}
            aria-current={on ? "true" : undefined}
            className="flex shrink-0 items-center gap-1.5 px-2.5 transition-transform duration-100 active:scale-[0.96]"
            style={{
              height: TAP,
              color: on ? SP.text : d.open ? SP.muted : "#6E6A62",
              borderBottom: `2px solid ${on ? TINT[d.id] : "transparent"}`,
              background: on ? "rgba(10,13,17,0.6)" : "transparent",
            }}
          >
            <span className={`${anton.className}`} style={{ fontFamily: anton.style.fontFamily, fontSize: TYPE.title, color: on ? TINT[d.id] : undefined }}>
              {ROMAN[i]}
            </span>
            <span className={`${TX.label} whitespace-nowrap font-bold uppercase tracking-[0.1em]`}>{domainName(t, d.id)}</span>
            {d.crossed ? <Check className="h-3.5 w-3.5" style={{ color: TINT[d.id] }} aria-label={t("domCrossed", "Atravessado")} /> : !d.open && <Lock className="h-3.5 w-3.5" aria-hidden />}
          </button>
        )
      })}
    </nav>
  )
}

function DomainTitle({ d, t }: { d: DomainInfo; t: Tr }) {
  const lock = lockText(t, d)
  return (
    <div className="relative shrink-0 px-4 pt-3 mmdp-in" key={d.id}>
      <p className={`${TX.label} font-bold uppercase tracking-[0.18em]`} style={{ color: TINT[d.id], textShadow: "0 1px 0 #000" }}>
        {t("domGodOf", "Domínio de {god}").replace("{god}", godName(t, d.god))}
      </p>
      <h3 className={`${anton.className} uppercase leading-none text-[24px] md:text-[40px]`} style={{ fontFamily: anton.style.fontFamily, color: SP.text, textShadow: "0 2px 0 #000" }}>
        {domainName(t, d.id)}
      </h3>
      <p className={`${TX.body} mt-1 flex items-center gap-1.5 font-semibold`} style={{ color: lock ? SP.goldHi : SP.text, textShadow: "0 1px 0 #000" }}>
        {lock ? (
          <>
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {lock}
          </>
        ) : d.crossed ? (
          t("domCrossed", "Atravessado")
        ) : d.best > 0 ? (
          t("domProgress", "Setor {n} de 10 vencido").replace("{n}", String(d.best))
        ) : (
          t("domFresh", "Nenhum setor vencido")
        )}
      </p>
    </div>
  )
}

/**
 * A linha dos setores. Celular: rola de lado (passo de 72 px) e abre com a placa escolhida
 * à vista; PC: cabe inteira (passo de 104 px). Altura do zigue-zague: 28 px.
 */
function Track({ d, t, pick, onPick, next }: { d: DomainInfo; t: Tr; pick: Pick | null; onPick: (p: Pick) => void; next: DomainInfo | null }) {
  const box = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(72)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setStep(el.clientWidth >= 1000 ? 104 : 72)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const calm = calmMotion()
  const pad = 44
  const yOf = (i: number) => (i % 2 === 0 ? 0 : 28)
  const xOf = (i: number) => pad + i * step
  const n = d.sectors.length
  const width = xOf(n) + pad + 40
  const baseY = 64
  // a placa escolhida à vista ao abrir (celular)
  useEffect(() => {
    const el = box.current
    if (!el || pick?.kind !== "sector") return
    el.scrollLeft = Math.max(0, xOf(pick.n - 1) - el.clientWidth / 2)
    // só ao trocar de Domínio (o Track remonta com a key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])
  const pts = d.sectors.map((_, i) => `${xOf(i)},${baseY + yOf(i)}`)
  pts.push(`${xOf(n)},${baseY + yOf(n)}`)
  const doneUpTo = Math.max(0, d.best - 1)
  const tint = TINT[d.id]
  return (
    <div ref={box} className="relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none]" aria-label={t("domTrack", "Setores")}>
      <div className="relative mx-auto" style={{ width, height: 230 }}>
        <svg className="pointer-events-none absolute inset-0" width={width} height={230} aria-hidden>
          {/* trilha inteira apagada; o trecho vencido aceso na cor do Domínio */}
          <polyline points={pts.join(" ")} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={7} />
          <polyline points={pts.join(" ")} fill="none" stroke="#5E5546" strokeWidth={3} strokeDasharray="2 6" />
          {d.best > 0 && <polyline points={pts.slice(0, doneUpTo + 1 + (d.crossed ? 1 : 0)).join(" ")} fill="none" stroke={tint} strokeWidth={3} />}
          {(d.places ?? []).map((p) => {
            const i = p.sector - 1
            return <line key={p.id} x1={xOf(i)} y1={baseY + yOf(i)} x2={xOf(i)} y2={baseY + yOf(i) + 92} stroke="#8A7A5C" strokeWidth={2} strokeDasharray="3 5" />
          })}
        </svg>
        {d.sectors.map((s, i) => (
          <SectorNode
            key={s.n}
            s={s}
            x={xOf(i)}
            y={baseY + yOf(i)}
            boss={s.n === n}
            tint={tint}
            on={pick?.kind === "sector" && pick.n === s.n}
            here={s.open && !s.cleared && !d.lock}
            delay={calm ? 0 : i * 0.03}
            label={s.n === n ? t("domBoss", "Chefe") : null}
            aria={`${t("domSectorTag", "Setor {n}").replace("{n}", String(s.n))} · ${sectorFoe(t, s)}`}
            onPick={() => onPick({ kind: "sector", n: s.n })}
          />
        ))}
        {(d.places ?? []).map((p) => {
          const i = p.sector - 1
          const on = pick?.kind === "place" && pick.id === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick({ kind: "place", id: p.id })}
              aria-pressed={on}
              className="absolute flex -translate-x-1/2 flex-col items-center gap-1 mmdp-in"
              style={{ left: xOf(i), top: baseY + yOf(i) + 92 - 20 }}
            >
              <span className="mm-oct grid h-10 w-10 place-items-center" style={{ background: on ? SP.goldPlate : SP.plateHi, color: on ? SP.ink : SP.goldHi, outline: on ? `2px solid ${SP.goldHi}` : undefined }}>
                <BookOpen className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className={`${TX.label} whitespace-nowrap font-bold uppercase tracking-[0.1em]`} style={{ color: SP.goldHi, textShadow: "0 1px 0 #000" }}>
                {t(`domPlace_${p.id}`, p.id)}
              </span>
            </button>
          )
        })}
        {/* depois do 10: a passagem para o próximo (ou o fim da travessia) */}
        <div className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1" style={{ left: xOf(n), top: baseY + yOf(n) }}>
          <span className="grid h-8 w-8 place-items-center" style={{ color: d.crossed ? tint : "#6E6A62" }}>
            <ArrowRight className="h-5 w-5" aria-hidden />
          </span>
          <span className={`${TX.label} max-w-[84px] text-center font-bold uppercase tracking-[0.08em]`} style={{ color: d.crossed ? SP.text : "#8A857A", textShadow: "0 1px 0 #000" }}>
            {next ? domainName(t, next.id) : t("domTheEnd", "Fim da travessia")}
          </span>
        </div>
      </div>
    </div>
  )
}

function SectorNode({
  s,
  x,
  y,
  boss,
  tint,
  on,
  here,
  delay,
  label,
  aria,
  onPick,
}: {
  s: DomainSector
  x: number
  y: number
  boss: boolean
  tint: string
  on: boolean
  here: boolean
  delay: number
  label: string | null
  aria: string
  onPick: () => void
}) {
  const size = boss ? 64 : 52
  const bg = boss ? BOSS.plate : s.cleared ? tint : s.open ? SP.plateHi : "#14181E"
  const fg = boss ? "#FFF1F1" : s.cleared ? SP.ink : s.open ? SP.text : "#6E6A62"
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      aria-label={aria}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center mmdp-in"
      style={{ left: x, top: y, animationDelay: `${delay}s` }}
    >
      {/* marca em cima: vencido = visto; fechado = cadeado */}
      <span className="mb-1 grid h-4 place-items-center" aria-hidden>
        {s.cleared ? <Check className="h-4 w-4" style={{ color: tint }} strokeWidth={3} /> : !s.open ? <Lock className="h-3.5 w-3.5" style={{ color: "#6E6A62" }} /> : boss ? <Crown className="h-4 w-4" style={{ color: BOSS.rim }} /> : null}
      </span>
      <span className="relative grid place-items-center" style={{ width: size, height: size }}>
        {here && <span aria-hidden className="mm-oct mmdp-pulse absolute inset-0" style={{ background: boss ? BOSS.rim : SP.goldHi }} />}
        <span aria-hidden className="mm-oct absolute inset-0" style={{ background: on ? SP.goldHi : here ? SP.gold : boss ? BOSS.rim : "#3A342A" }} />
        <span
          className={`mm-oct ${anton.className} absolute grid place-items-center tabular-nums`}
          style={{ inset: on ? 3 : 2, background: bg, color: fg, fontFamily: anton.style.fontFamily, fontSize: TYPE.number, opacity: s.open || s.cleared || boss ? 1 : 0.8 }}
        >
          {s.n}
        </span>
      </span>
      {label && (
        <span className={`${TX.label} mt-1 font-bold uppercase tracking-[0.14em]`} style={{ color: BOSS.rim, textShadow: "0 1px 0 #000" }}>
          {label}
        </span>
      )}
    </button>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className={`${TX.label} w-[92px] shrink-0 pt-0.5 font-bold uppercase tracking-[0.12em]`} style={{ color: SP.muted }}>
        {k}
      </dt>
      <dd className={`${TX.body} min-w-0 flex-1`} style={{ color: SP.text }}>
        {children}
      </dd>
    </div>
  )
}

const qtyText = (q: [number, number]) => (q[0] === q[1] ? `${q[0]}×` : `${q[0]}–${q[1]}×`)
const pctText = (p: number) => `${Math.round(p * 1000) / 10}%`.replace(".", ",")
const itemName = (t: Tr, r: DomainLootRow) => t(`gear_${r.id}`, r.name)

/** E12: a tabela do setor em três linhas curtas (por vitória · chance · primeira vitória). */
function LootRows({ loot, tint, t }: { loot: DomainSectorLoot; tint: string; t: Tr }) {
  return (
    <>
      <span className="block">
        <span className="font-bold" style={{ color: SP.muted }}>{t("domLootSure", "Por vitória")}: </span>
        {loot.sure.map((r) => `${qtyText(r.qty)} ${itemName(t, r)}`).join(" · ")}
      </span>
      {loot.chance.length > 0 && (
        <span className="block">
          <span className="font-bold" style={{ color: SP.muted }}>{t("domLootChance", "Chance")}: </span>
          {loot.chance.map((r) => `${itemName(t, r)} ${pctText(r.p ?? 0)}`).join(" · ")}
        </span>
      )}
      {loot.first.length > 0 && (
        <span className="block" style={{ color: loot.firstDone ? SP.muted : tint }}>
          <span className="font-bold">{t("domLootFirst", "Primeira vitória")}: </span>
          {loot.firstDone ? t("domLootFirstDone", "já recebida") : loot.first.map((r) => `${qtyText(r.qty)} ${itemName(t, r)}`).join(" · ")}
        </span>
      )}
    </>
  )
}

/** O painel da fase (Anexo A §7.3): objetivos · recomendado · ambiente · prêmios · entrar. */
function PhasePanel({ d, pick, power, next, t, onEnter }: { d: DomainInfo; pick: Pick; power: number; next: DomainInfo | null; t: Tr; onEnter: () => void }) {
  const lock = lockText(t, d)
  const dn = domainName(t, d.id)
  let eyebrow: string
  let title: string
  let rows: React.ReactNode
  let state: { text: string; tone: "ok" | "warn" | "muted" } | null = null
  if (pick.kind === "place") {
    const p = (d.places ?? []).find((q) => q.id === pick.id)
    const beside = d.sectors[(p?.sector ?? 1) - 1]
    eyebrow = t("domPlaceTag", "Lugar da história · ao lado do setor {n}").replace("{n}", String(p?.sector ?? 1))
    title = t(`domPlace_${pick.id}`, pick.id)
    rows = (
      <>
        <Row k={t("domPanelAbout", "O que é")}>{t(`domPlaceAbout_${pick.id}`, PLACE_ABOUT_PT[pick.id] ?? "")}</Row>
        <Row k={t("domPanelEnv", "Ambiente")}>{`${t(`domStage_${beside?.stage ?? "fundo"}`, STAGE_PT[beside?.stage ?? "fundo"])} · ${dn}`}</Row>
      </>
    )
    if (beside && !beside.open && !lock) state = { text: t("domPlaceLocked", "Abre junto com o setor {n}").replace("{n}", String(beside.n)), tone: "warn" }
  } else {
    const s = d.sectors[pick.n - 1] ?? d.sectors[0]
    const boss = s.n === d.sectors.length
    const foe = sectorFoe(t, s)
    eyebrow = `${t("domSectorTag", "Setor {n}").replace("{n}", String(s.n))} · ${t(`domStage_${s.stage}`, STAGE_PT[s.stage])}${boss ? ` · ${t("domBoss", "Chefe")}` : ""}`
    title = foe
    const short = power < s.power
    rows = (
      <>
        <Row k={t("domPanelGoal", "Objetivo")}>{(boss ? t("domGoalBoss", "Vencer {foe} e atravessar") : t("domGoal", "Vencer {foe}")).replace("{foe}", foe)}</Row>
        <Row k={t("domPanelRec", "Recomendado")}>
          <span className="tabular-nums">{t("domRecLine", "Poder {p} · Nv. {lv}").replace("{p}", String(s.power)).replace("{lv}", String(s.level))}</span>
          <span className="tabular-nums font-bold" style={{ color: short ? SP.cyan : SP.green }}>
            {" · "}
            {t("domYourPowerShort", "seu {n}").replace("{n}", String(power))}
          </span>
        </Row>
        <Row k={t("domPanelEnv", "Ambiente")}>{`${t(`domStage_${s.stage}`, STAGE_PT[s.stage])} · ${dn}`}</Row>
        <Row k={t("domPanelPrize", "Prêmios")}>
          {s.loot ? (
            <>
              <span className="block">{t("domPrizesXp", "XP de aventura e Esmeraldas")}</span>
              <LootRows loot={s.loot} tint={TINT[d.id]} t={t} />
            </>
          ) : (
            t("domPrizes", "XP de aventura, Esmeraldas e chance de item")
          )}
          {boss && (
            <span className="block font-bold" style={{ color: TINT[d.id] }}>
              {next ? t("domPrizeCross", "Abre a passagem: {name}").replace("{name}", domainName(t, next.id)) : t("domTheEnd", "Fim da travessia")}
            </span>
          )}
        </Row>
      </>
    )
    if (s.cleared) state = { text: t("domFarm", "Setor vencido: lute de novo para treinar"), tone: "ok" }
    else if (!s.open && !lock) state = { text: t("domSectorLocked", "Vença o setor {n} antes").replace("{n}", String(s.n - 1)), tone: "warn" }
  }
  return (
    <section
      key={`${d.id}-${pick.kind}-${pick.kind === "sector" ? pick.n : pick.id}`}
      className="relative mx-auto w-full shrink-0 px-4 pt-3 mmdp-in md:mb-4 md:mr-4 md:w-[420px]"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))", background: SP.plate, borderTop: `2px solid ${SP.goldDeep}`, boxShadow: "0 -6px 0 rgba(0,0,0,0.35)" }}
      aria-live="polite"
    >
      <p className={`${TX.label} font-bold uppercase tracking-[0.16em]`} style={{ color: TINT[d.id] }}>
        {eyebrow}
      </p>
      <h4 className={`${anton.className} mt-0.5 uppercase leading-none`} style={{ fontFamily: anton.style.fontFamily, fontSize: TYPE.number, color: SP.text }}>
        {title}
      </h4>
      <dl className="mt-3 flex flex-col gap-2">{rows}</dl>
      {state && (
        <p className={`${TX.body} mt-3 font-semibold`} style={{ color: state.tone === "ok" ? SP.green : SP.goldHi }}>
          {state.text}
        </p>
      )}
      <div className="mt-3">
        {lock ? (
          <p className={`${TX.body} flex items-center gap-2 font-semibold`} style={{ minHeight: TAP, color: SP.goldHi }}>
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            {lock}
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={onEnter}
              className={`${anton.className} mm-oct flex w-full items-center justify-center gap-2 uppercase tracking-[0.08em] transition-transform duration-100 active:scale-[0.97]`}
              style={{ height: 52, background: SP.goldPlate, color: SP.ink, fontFamily: anton.style.fontFamily, fontSize: TYPE.title }}
            >
              <Swords className="h-5 w-5" aria-hidden />
              {d.best > 0 ? t("domEnterAgain", "Voltar ao começo") : t("domEnter", "Entrar")}
            </button>
            <p className={`${TX.label} mt-1.5 text-center`} style={{ color: SP.muted }}>
              {t("domStartNote", "A travessia começa na entrada; os setores ficam em ordem no caminho.")}
            </p>
          </>
        )}
      </div>
    </section>
  )
}
