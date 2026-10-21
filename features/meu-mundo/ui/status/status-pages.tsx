// features/meu-mundo/ui/status/status-pages.tsx — o CONTEÚDO dos seis modais
// do STATUS do hóspede (mm3d-13), na silhueta dos modais do STATUS do EVO
// Brazil: cabeçalho com o selo kanji, STATUS, o subtítulo da página, o retrato
// redondo, o nome e a linha de resumo; embaixo, os blocos de cada página.
//
// Nenhum número é calculado aqui: tudo vem de GET /meu-mundo/admin/life
// (meuMundoLife.js no backend). Aqui só se escolhe palavra e cor para o
// número (faixas de leitura: "TENSO", "CANSADO"…).

import { useState, type ReactNode } from "react"
import {
  Activity,
  BedDouble,
  BookOpen,
  Brain,
  Briefcase,
  Clock,
  Coffee,
  Droplet,
  Dumbbell,
  Flame,
  FlaskConical,
  Heart,
  HeartPulse,
  Hospital,
  Pill,
  Skull,
  Smile,
  Sprout,
  Square,
  Syringe,
  Utensils,
  Wind,
  Zap,
} from "lucide-react"
import type { LifeActivity, LifeCharacter, LifeFull, LifeItem, LifeItemKind } from "../../types"
import { Bar, Chamfer, EVO, Gauge, Plate, Ring, Tag, archivo, kanji, teko, toneFor } from "./evo-skin"

type Tr = (key: string, fallback: string) => string

export const PAGES = ["overview", "body", "attributes", "routine", "market", "history"] as const
export type PageId = (typeof PAGES)[number]

export interface PageActions {
  busy: boolean
  activity: (kind: "studying" | "training" | "working" | "idle", hours?: number) => void
  consume: (item: string) => void
  newcomer: () => void
}

export interface PageProps {
  page: PageId
  life: LifeFull
  name: string
  portrait: string
  compact: boolean
  t: Tr
  act: PageActions
}

// ─── leitura das faixas (palavra e cor para cada número) ─────────────────────
const r0 = (v: number) => Math.round(v)
export function hoursText(h: number | null) {
  if (h == null) return ""
  const total = Math.max(0, Math.round(h * 60))
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return hh ? `${hh}h${mm ? String(mm).padStart(2, "0") : ""}` : `${mm}min`
}

function energyTag(v: number, t: Tr) {
  if (v >= 70) return t("stEnergyHigh", "Disposto")
  if (v >= 40) return t("stEnergyOk", "Bem")
  if (v >= 15) return t("stEnergyTired", "Cansado")
  return t("stEnergyExhausted", "Exausto")
}
function stressTag(v: number, t: Tr) {
  if (v < 20) return t("stStressCalm", "Calmo")
  if (v < 40) return t("stStressEasy", "Tranquilo")
  if (v < 60) return t("stStressTense", "Tenso")
  if (v < 80) return t("stStressHigh", "Estressado")
  return t("stStressLimit", "No limite")
}
function moodTag(v: number, t: Tr) {
  if (v >= 70) return t("stMoodHappy", "Feliz")
  if (v >= 40) return t("stMoodOk", "Normal")
  if (v >= 20) return t("stMoodSad", "Triste")
  return t("stMoodDown", "Deprimido")
}
function healthTag(v: number, t: Tr) {
  if (v >= 80) return t("stHealthGreat", "Ótima")
  if (v >= 60) return t("stHealthGood", "Boa")
  if (v >= 35) return t("stHealthWeak", "Fraca")
  return t("stHealthBad", "Grave")
}
function satietyTag(v: number, t: Tr) {
  if (v >= 75) return t("stFull", "Satisfeito")
  if (v >= 40) return t("stFed", "Alimentado")
  if (v >= 15) return t("stHungry", "Com fome")
  return t("stStarving", "Faminto")
}
export function conditionLabel(l: string, t: Tr) {
  return (
    {
      otima: t("condGreat", "Ótima"),
      boa: t("condGood", "Boa"),
      regular: t("condRegular", "Regular"),
      ruim: t("condBad", "Ruim"),
      critica: t("condCritical", "Crítica"),
    } as Record<string, string>
  )[l] ?? l
}
export function activityLabel(k: LifeActivity | string, t: Tr) {
  return (
    {
      idle: t("actIdle", "À toa"),
      lying: t("actLying", "Deitado"),
      sleeping: t("actSleeping", "Dormindo"),
      studying: t("actStudying", "Estudando"),
      training: t("actTraining", "Treinando"),
      working: t("actWorking", "Trabalhando"),
      hospital: t("actHospital", "Internado"),
    } as Record<string, string>
  )[k] ?? k
}
const ACT_ICON: Record<string, ReactNode> = {
  idle: <Square className="h-5 w-5" />,
  lying: <BedDouble className="h-5 w-5" />,
  sleeping: <BedDouble className="h-5 w-5" />,
  studying: <BookOpen className="h-5 w-5" />,
  training: <Dumbbell className="h-5 w-5" />,
  working: <Briefcase className="h-5 w-5" />,
  hospital: <Hospital className="h-5 w-5" />,
}
function causeLabel(c: string | null, t: Tr) {
  if (!c) return ""
  return (
    {
      infarto: t("causeInfarct", "Infarto"),
      overdose: t("causeOverdose", "Overdose"),
      exaustao: t("causeExhaustion", "Exaustão"),
      fome: t("causeHunger", "Fome"),
      sono: t("causeSleep", "Dias sem dormir"),
      diabetes: t("causeDiabetes", "Diabetes sem tratamento"),
      hipertensao: t("causeHypertension", "Pressão alta sem tratamento"),
      dieta: t("causeDiet", "Má alimentação"),
      estresse: t("causeStress", "Estresse extremo"),
      complicacoes: t("causeComplications", "Complicações no hospital"),
    } as Record<string, string>
  )[c] ?? c
}
const TRAITS = ["discipline", "anxiety", "optimism", "appetite", "resilience", "metabolism"] as const
function traitName(k: (typeof TRAITS)[number], t: Tr) {
  return {
    discipline: t("trDiscipline", "Disciplina"),
    anxiety: t("trAnxiety", "Ansiedade"),
    optimism: t("trOptimism", "Otimismo"),
    appetite: t("trAppetite", "Apetite"),
    resilience: t("trResilience", "Resistência"),
    metabolism: t("trMetabolism", "Metabolismo"),
  }[k]
}
/** O traço que mais se afasta do meio vira o "jeito" dele (como o CENTRADO do EVO). */
export function personalityLabel(p: LifeCharacter["personality"], t: Tr) {
  const words: Record<string, [string, string]> = {
    discipline: [t("ptLazy", "Preguiçoso"), t("ptDisciplined", "Disciplinado")],
    anxiety: [t("ptSerene", "Sereno"), t("ptAnxious", "Ansioso")],
    optimism: [t("ptGloomy", "Pessimista"), t("ptOptimist", "Otimista")],
    appetite: [t("ptPicky", "Come pouco"), t("ptGlutton", "Comilão")],
    resilience: [t("ptFragile", "Frágil"), t("ptTough", "Resistente")],
    metabolism: [t("ptSlow", "Metabolismo lento"), t("ptFast", "Acelerado")],
  }
  let best: (typeof TRAITS)[number] = "discipline"
  for (const k of TRAITS) if (Math.abs(p[k] - 0.5) > Math.abs(p[best] - 0.5)) best = k
  if (Math.abs(p[best] - 0.5) < 0.12) return t("ptBalanced", "Equilibrado")
  return words[best][p[best] >= 0.5 ? 1 : 0]
}
function quote(c: LifeCharacter, t: Tr) {
  const v = c.vitals
  if (c.status === "dead") return t("qDead", "Ele se foi.")
  if (c.status === "hospital") return t("qHospital", "Ele está internado.")
  if (v.satiety <= 10) return t("qHungry", "Ele está com fome.")
  if (v.energy < 15) return t("qExhausted", "Ele está exausto.")
  if (v.energy < 30) return t("qTired", "Ele está cansado.")
  if (v.stress >= 80) return t("qStressed", "Ele está muito estressado.")
  if (v.health < 40) return t("qUnwell", "Ele não está bem.")
  if (v.mood >= 70) return t("qHappy", "Ele está feliz.")
  return t("qFine", "Ele está bem.")
}
export function itemName(it: LifeItem, t: Tr) {
  return t(`item_${it.id}`, it.name)
}
function effectName(id: string, t: Tr) {
  return (
    {
      albumin: t("effAlbumin", "Albumina"),
      whey: t("effWhey", "Whey protein"),
      preworkout: t("effPreworkout", "Pré-treino"),
      creatine: t("effCreatine", "Creatina"),
      multivit: t("effMultivit", "Multivitamínico"),
      metformin: t("effMetformin", "Metformina"),
      losartan: t("effLosartan", "Losartana"),
      calm: t("effCalm", "Calmante"),
      coffee: t("effCoffee", "Café"),
      energy_drink: t("effEnergyDrink", "Energético"),
      stim: t("effStim", "Estimulante"),
      anabolic: t("effAnabolic", "Anabolizante"),
    } as Record<string, string>
  )[id] ?? id
}
function eventText(kind: string, data: Record<string, unknown>, t: Tr, items: Map<string, LifeItem>) {
  const item = typeof data.item === "string" ? items.get(data.item) : null
  switch (kind) {
    case "born":
      return t("evBorn", "Chegou um novo hóspede (geração {n}).").replace("{n}", String(data.generation ?? ""))
    case "meal":
      return t("evMeal", "Refeição das {h} h: {item}.").replace("{h}", String(data.meal)).replace("{item}", item ? itemName(item, t) : "")
    case "meal_missed":
      return t("evMealMissed", "Perdeu a refeição das {h} h.").replace("{h}", String(data.meal))
    case "consume":
      return t("evConsume", "Consumiu {item}.").replace("{item}", item ? itemName(item, t) : String(data.item ?? ""))
    case "activity":
      return data.hours
        ? t("evActivityHours", "{act} por {h}.").replace("{act}", activityLabel(String(data.kind), t)).replace("{h}", hoursText(Number(data.hours)))
        : t("evActivity", "{act}.").replace("{act}", activityLabel(String(data.kind), t))
    case "activity_end":
      return t("evActivityEnd", "Terminou: {act}.").replace("{act}", activityLabel(String(data.kind), t))
    case "collapse":
      return t("evCollapse", "Desmaiou de exaustão e dormiu no chão.")
    case "routine_meal":
      return t("evRoutineMeal", "Rotina: comprou e comeu {item} ({n} moedas).")
        .replace("{item}", item ? itemName(item, t) : String(data.item ?? ""))
        .replace("{n}", String(data.price ?? ""))
    case "routine_pause":
      return (
        data.reason === "energy"
          ? t("evPauseEnergy", "Rotina: sem energia, foi dormir {h} e depois volta a {act}.")
          : data.reason === "stress"
            ? t("evPauseStress", "Rotina: estressado, deitou {h} e depois volta a {act}.")
            : data.reason === "night"
              ? t("evPauseNight", "Rotina: hora de dormir ({h}); amanhã volta a {act}.")
              : t("evPauseCap", "Rotina: já rendeu o máximo de {act} hoje; descansa {h}.")
      )
        .replace("{h}", hoursText(Number(data.hours)))
        .replace("{act}", activityLabel(String(data.during), t).toLowerCase())
    case "hospital_in":
      return t("evHospitalIn", "Foi internado no hospital.")
    case "hospital_out":
      return t("evHospitalOut", "Teve alta do hospital.")
    case "diabetes":
      return t("evDiabetes", "Desenvolveu diabetes.")
    case "hypertension":
      return t("evHypertension", "Desenvolveu pressão alta.")
    case "heart_attack":
      return t("evHeartAttack", "Teve um infarto.")
    case "death":
      return t("evDeath", "Morreu: {cause}.").replace("{cause}", causeLabel(String(data.cause ?? ""), t))
    default:
      return kind
  }
}
function eventIcon(kind: string) {
  if (kind === "meal" || kind === "meal_missed" || kind === "consume" || kind === "routine_meal") return <Utensils className="h-5 w-5" />
  if (kind === "hospital_in" || kind === "hospital_out") return <Hospital className="h-5 w-5" />
  if (kind === "heart_attack" || kind === "hypertension") return <HeartPulse className="h-5 w-5" />
  if (kind === "diabetes") return <Droplet className="h-5 w-5" />
  if (kind === "death") return <Skull className="h-5 w-5" />
  if (kind === "collapse") return <Zap className="h-5 w-5" />
  return <Clock className="h-5 w-5" />
}
function timeOf(iso: string, offsetMin: number) {
  const d = new Date(new Date(iso).getTime() + offsetMin * 60000)
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

// ─── peças comuns ─────────────────────────────────────────────────────────────
const SUBTITLE: Record<PageId, [string, string]> = {
  overview: ["stPageOverview", "Visão geral"],
  body: ["stPageBody", "Corpo e saúde"],
  attributes: ["stPageAttributes", "Atributos e personalidade"],
  routine: ["stPageRoutine", "Rotina de hoje"],
  market: ["stPageMarket", "Mercado e farmácia"],
  history: ["stPageHistory", "Diário e linha do tempo"],
}
export const pageTitle = (p: PageId, t: Tr) => t(SUBTITLE[p][0], SUBTITLE[p][1])

function Portrait({ src, size, round = false }: { src: string; size: number; round?: boolean }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{
        width: size,
        height: round ? size : size * 1.25,
        borderRadius: round ? "50%" : 0,
        background: "radial-gradient(circle at 50% 40%, #ffe15a 0%, #ffc21a 45%, #ff8a00 100%)",
        boxShadow: round ? `0 0 0 3px ${EVO.douradoEscuro}, 0 0 18px ${EVO.magenta}66` : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- retrato pequeno, local, só no jogo (admin) */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover object-top" draggable={false} />
    </div>
  )
}

function Header({ life, name, portrait, page, compact, t }: Omit<PageProps, "act">) {
  const c = life.character
  const days = Math.max(1, Math.floor((new Date(life.now).getTime() - new Date(c.bornAt).getTime()) / 86400000) + 1)
  return (
    <div className="flex items-center gap-4 border-b pb-3" style={{ borderColor: `${EVO.magenta}55` }}>
      <div
        className={`${kanji.className} flex shrink-0 flex-col items-center justify-center leading-none`}
        style={{
          width: compact ? 44 : 62,
          height: compact ? 72 : 104,
          fontSize: compact ? 28 : 40,
          color: EVO.douradoClaro,
          border: `2px solid ${EVO.douradoEscuro}`,
          background: "rgba(0,0,0,0.35)",
        }}
        aria-hidden
      >
        <span>心</span>
        <span className="mt-1">体</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className={`${teko.className} font-bold uppercase leading-[0.85]`} style={{ fontSize: compact ? 54 : 92, color: EVO.branco, letterSpacing: "0.01em" }}>
          {t("stTitle", "Status")}
        </div>
        <div
          className={`${teko.className} truncate font-medium uppercase`}
          style={{ fontSize: compact ? 18 : 28, letterSpacing: compact ? "0.18em" : "0.32em", color: EVO.douradoClaro }}
        >
          {pageTitle(page, t)}
        </div>
        {compact && (
          <div className="mt-1 flex items-center gap-2">
            <Portrait src={portrait} size={34} round />
            <span className={`${teko.className} truncate text-[22px] font-semibold uppercase leading-none`} style={{ color: EVO.branco }}>
              {name}
            </span>
            <span className={`${archivo.className} truncate text-[13px]`} style={{ color: EVO.mudo }}>
              {t("stGeneration", "Geração {n}").replace("{n}", String(c.generation))} · {t("stCoins", "{n} moedas").replace("{n}", String(life.wallet.coins))}
            </span>
          </div>
        )}
      </div>
      {!compact && (
        <div className="flex min-w-0 items-center gap-4">
          <Portrait src={portrait} size={110} round />
          <div className="min-w-0">
            <div className={`${teko.className} truncate text-[58px] font-bold uppercase leading-[0.85]`} style={{ color: EVO.branco }}>
              {name}
            </div>
            <div className={`${teko.className} text-[26px] font-medium uppercase tracking-[0.2em]`} style={{ color: EVO.ambar }}>
              {t("stGeneration", "Geração {n}").replace("{n}", String(c.generation))} • {personalityLabel(c.personality, t)}
            </div>
            <div className={`${archivo.className} text-[16px]`} style={{ color: EVO.branco }}>
              {t("stDaysLived", "{n} dias de vida").replace("{n}", String(days))} • {t("stCoins", "{n} moedas").replace("{n}", String(life.wallet.coins))} •{" "}
              {t("stToday", "Hoje: {c}").replace("{c}", conditionLabel(c.today.label, t))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Uma linha de indicador: anel + rótulo + número + barra (+ etiqueta e texto). */
function Meter({
  icon,
  color,
  label,
  value,
  max = 100,
  barColor,
  tag,
  note,
  compact,
}: {
  icon: ReactNode
  color: string
  label: string
  value: number
  max?: number
  barColor?: string
  tag?: string
  note?: string
  compact: boolean
}) {
  return (
    <Chamfer cut={16}>
      <div className="flex items-center gap-4 px-4 py-3">
        <Ring color={color} size={compact ? 40 : 48}>
          {icon}
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`${teko.className} text-[20px] font-medium uppercase tracking-[0.18em]`} style={{ color: EVO.branco }}>
              {label}
            </span>
            {tag && <Tag>{tag}</Tag>}
          </div>
          <div className={`${teko.className} font-bold leading-none`} style={{ fontSize: compact ? 30 : 38, color: EVO.branco }}>
            {r0(value)} <span style={{ color: EVO.mudo }}>/ {r0(max)}</span>
          </div>
          <div className="mt-1.5">
            <Bar value={value} max={max} color={barColor ?? color} />
          </div>
          {note && (
            <div className={`${archivo.className} mt-1.5 text-[15px]`} style={{ color: EVO.mudo }}>
              {note}
            </div>
          )}
        </div>
      </div>
    </Chamfer>
  )
}

/** Linha "nome ……… valor" (as TAXAS E MODIFICADORES do anexo). */
function Row({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-2" style={{ borderColor: EVO.linha }}>
      <span className={`${archivo.className} text-[17px]`} style={{ color: EVO.branco }}>
        {label}
      </span>
      <span className={`${teko.className} text-[24px] font-semibold`} style={{ color: tone ?? EVO.douradoClaro }}>
        {value}
      </span>
    </div>
  )
}

function GoldButton({ children, onClick, disabled, active }: { children: ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${teko.className} inline-flex items-center justify-center gap-2 px-4 pb-1 pt-2 text-[22px] font-semibold uppercase leading-none tracking-wider transition-transform active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40`}
      style={{
        clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
        background: active ? EVO.magenta : `linear-gradient(180deg, ${EVO.carvao2}, ${EVO.preto})`,
        color: active ? EVO.branco : EVO.douradoClaro,
        boxShadow: `inset 0 0 0 2px ${active ? EVO.rosaClaro : EVO.douradoEscuro}`,
      }}
    >
      {children}
    </button>
  )
}

// ─── as páginas ───────────────────────────────────────────────────────────────
function Overview({ life, portrait, compact, t, act }: PageProps) {
  const c = life.character
  const v = c.vitals
  const a = c.activity
  const total = a.until ? (new Date(a.until).getTime() - new Date(a.startedAt).getTime()) / 3600000 : null
  const progress = total && a.remainingH != null ? Math.max(0, Math.min(1, 1 - a.remainingH / total)) : null
  if (c.status === "dead") {
    return (
      <div className={`grid gap-5 ${compact ? "" : "grid-cols-[minmax(0,560px)_1fr]"}`}>
        <div className="flex justify-center">
          <div style={{ filter: "grayscale(1) brightness(0.55)" }}>
            <Portrait src={portrait} size={compact ? 220 : 380} />
          </div>
        </div>
        <Plate title={t("stDeadTitle", "Seu hóspede morreu")}>
          <div className="flex items-start gap-4">
            <Ring color={EVO.perigo} size={56}>
              <Skull className="h-7 w-7" />
            </Ring>
            <div>
              <div className={`${teko.className} text-[40px] font-bold uppercase leading-none`} style={{ color: EVO.branco }}>
                {causeLabel(c.deathCause, t)}
              </div>
              <p className={`${archivo.className} mt-2 text-[17px]`} style={{ color: EVO.mudo }}>
                {t("stDeadText", "A casa e as moedas continuam suas. Um novo hóspede pode chegar agora.")}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <GoldButton onClick={act.newcomer} disabled={act.busy} active>
              {t("stNewcomer", "Receber novo hóspede")}
            </GoldButton>
          </div>
        </Plate>
      </div>
    )
  }
  return (
    <div className={`grid h-full gap-5 ${compact ? "" : "grid-cols-[minmax(0,560px)_1fr]"}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-1 items-center justify-center">
          <Portrait src={portrait} size={compact ? 200 : 330} />
        </div>
        <Chamfer cut={16}>
          <div className="flex items-center gap-4 px-4 py-3">
            <Ring color={EVO.ambar} size={56}>
              {ACT_ICON[a.kind]}
            </Ring>
            <div className="min-w-0 flex-1">
              <div className={`${teko.className} text-[18px] uppercase tracking-[0.2em]`} style={{ color: EVO.mudo }}>
                {t("stNow", "Agora")}
              </div>
              <div className={`${teko.className} text-[30px] font-bold uppercase leading-none`} style={{ color: EVO.branco }}>
                {activityLabel(a.kind, t)}
                {a.remainingH != null && (
                  <span style={{ color: EVO.ambar }}>
                    {" "}
                    · {t("stRemaining", "faltam {h}").replace("{h}", hoursText(a.remainingH))}
                  </span>
                )}
              </div>
              {progress != null && (
                <div className="mt-2">
                  <Bar value={progress * 100} color={`linear-gradient(90deg, ${EVO.ambarFundo}, ${EVO.ambar})`} />
                </div>
              )}
            </div>
          </div>
        </Chamfer>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start gap-3 py-1">
          <span className={`${teko.className} text-[54px] font-bold leading-[0.6]`} style={{ color: EVO.magenta }}>
            “
          </span>
          <div>
            <div className={`${teko.className} text-[30px] font-semibold uppercase leading-none`} style={{ color: EVO.branco }}>
              {quote(c, t)}
            </div>
            <div className={`${archivo.className} mt-1 text-[17px] uppercase`} style={{ color: EVO.mudo }}>
              {t("stMoodIs", "Humor: {m}").replace("{m}", moodTag(v.mood, t))} · {t("stHungerIs", "Fome: {m}").replace("{m}", satietyTag(v.satiety, t))}
            </div>
          </div>
        </div>
        <div className={`grid gap-3 ${compact ? "" : "grid-cols-2"}`}>
          <Meter compact={compact} icon={<Heart className="h-6 w-6" />} color={EVO.perigo} label={t("stHealth", "Saúde")} value={v.health} max={Math.max(1, v.vitality)} barColor={toneFor(v.health)} tag={healthTag(v.health, t)} />
          <Meter compact={compact} icon={<Zap className="h-6 w-6" />} color={EVO.ambar} label={t("stEnergy", "Energia")} value={v.energy} barColor={`linear-gradient(90deg, ${EVO.ambarFundo}, ${EVO.ambar})`} tag={energyTag(v.energy, t)} />
          <Meter compact={compact} icon={<Activity className="h-6 w-6" />} color={EVO.roxo} label={t("stStress", "Estresse")} value={v.stress} barColor={toneFor(v.stress, "low")} tag={stressTag(v.stress, t)} />
          <Meter compact={compact} icon={<Utensils className="h-6 w-6" />} color={EVO.bom} label={t("stSatiety", "Saciedade")} value={v.satiety} barColor={toneFor(v.satiety)} tag={satietyTag(v.satiety, t)} />
        </div>
        <Chamfer cut={16}>
          <div className="flex items-center gap-4 px-4 py-3">
            <Ring color={EVO.douradoClaro} size={48}>
              <Smile className="h-6 w-6" />
            </Ring>
            <div className={`${archivo.className} text-[17px]`} style={{ color: EVO.branco }}>
              <span className={`${teko.className} text-[22px] font-semibold uppercase tracking-wider`} style={{ color: EVO.ambar }}>
                {t("stPersonality", "Personalidade")}:{" "}
              </span>
              <span className={`${teko.className} text-[22px] font-semibold uppercase tracking-wider`}>{personalityLabel(c.personality, t)}</span>
              <div style={{ color: EVO.mudo }}>
                {t("stTodayLine", "Condição de hoje: {c} ({n}/100). Ritmo: {p}.")
                  .replace("{c}", conditionLabel(c.today.label, t))
                  .replace("{n}", String(c.today.score))
                  .replace("{p}", c.pace >= 1 ? t("paceNormal", "normal") : c.pace >= 0.6 ? t("paceTired", "cansado") : t("paceExhausted", "exausto"))}
              </div>
            </div>
          </div>
        </Chamfer>
        <Plate title={t("stMeals", "Refeições de hoje")}>
          <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-4"}`}>
            {c.meals.map((m) => {
              const color = m.state === "eaten" ? EVO.bom : m.state === "missed" ? EVO.perigo : m.state === "open" ? EVO.magenta : EVO.mudoEscuro
              return (
                <div key={m.at} className="flex items-center gap-3 px-3 py-2" style={{ boxShadow: `inset 0 0 0 1px ${color}88`, background: "rgba(0,0,0,0.35)" }}>
                  <Utensils className="h-5 w-5 shrink-0" style={{ color }} />
                  <div>
                    <div className={`${teko.className} text-[26px] font-bold leading-none`} style={{ color: EVO.branco }}>
                      {t("mealAt", "{h} h").replace("{h}", String(m.at))}
                    </div>
                    <div className={`${teko.className} text-[16px] uppercase tracking-wider`} style={{ color }}>
                      {m.state === "eaten"
                        ? t("mealEaten", "Comeu")
                        : m.state === "missed"
                          ? t("mealMissed", "Perdeu")
                          : m.state === "open"
                            ? t("mealOpen", "Agora")
                            : t("mealLater", "Depois")}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Plate>
      </div>
    </div>
  )
}

function BodyPage({ life, compact, t }: PageProps) {
  const c = life.character
  const b = c.body
  const h = c.health
  const hint = { normal: t("bodyNormal", "Normal"), slim: t("bodySlim", "Magro"), fat: t("bodyFat", "Gordo"), strong: t("bodyStrong", "Forte"), sergio: "Sergio" }[b.bodyHint]
  const dis = (s: "none" | "controlled" | "uncontrolled") =>
    s === "none" ? <Tag tone="bom">{t("disNone", "Não tem")}</Tag> : s === "controlled" ? <Tag>{t("disControlled", "Controlada")}</Tag> : <Tag tone="perigo">{t("disUncontrolled", "Sem remédio")}</Tag>
  return (
    <div className={`grid gap-4 ${compact ? "" : "grid-cols-[1.05fr_1fr]"}`}>
      <div className="flex flex-col gap-4">
        <Plate title={t("stBody", "Corpo")}>
          <div className={`grid gap-x-6 ${compact ? "" : "grid-cols-2"}`}>
            <Row label={t("stWeight", "Peso")} value={`${b.weightKg.toFixed(1)} kg`} />
            <Row label={t("stHeight", "Altura")} value={`${b.heightM.toFixed(2)} m`} />
            <Row label={t("stBmi", "IMC")} value={b.bmi.toFixed(1)} tone={b.bmi >= 30 || b.bmi < 18.5 ? EVO.perigo : b.bmi >= 25 ? EVO.ambar : EVO.bom} />
            <Row label={t("stFat", "Gordura corporal")} value={`${b.fatPct.toFixed(1)}%`} tone={b.fatPct >= 30 ? EVO.perigo : b.fatPct >= 22 ? EVO.ambar : EVO.bom} />
            <Row label={t("stLean", "Massa magra")} value={`${b.leanKg.toFixed(1)} kg`} />
            <Row label={t("stBodyHint", "Tipo físico")} value={hint} />
          </div>
        </Plate>
        <Plate title={t("stExams", "Exames")}>
          <div className={`grid gap-x-6 ${compact ? "" : "grid-cols-2"}`}>
            <Row label={t("stGlucose", "Glicemia")} value={`${h.glucose} mg/dL`} tone={h.glucose >= 180 ? EVO.perigo : h.glucose >= 126 ? EVO.ambar : EVO.bom} />
            <Row label={t("stPressure", "Pressão")} value={`${h.systolic}/${h.diastolic}`} tone={h.systolic >= 150 ? EVO.perigo : h.systolic >= 130 ? EVO.ambar : EVO.bom} />
            <Row label={t("stAwake", "Acordado há")} value={hoursText(h.awakeHours)} tone={h.awakeHours > 30 ? EVO.perigo : h.awakeHours > 18 ? EVO.ambar : undefined} />
            <Row label={t("stDiet", "Qualidade da dieta")} value={`${h.diet > 0 ? "+" : ""}${r0(h.diet)}`} tone={h.diet < -30 ? EVO.perigo : h.diet < 0 ? EVO.ambar : EVO.bom} />
          </div>
          <div className="mt-3 grid gap-3">
            <div>
              <div className={`${teko.className} flex justify-between text-[20px] uppercase tracking-[0.16em]`} style={{ color: EVO.branco }}>
                <span>{t("stCardiac", "Carga no coração")}</span>
                <span style={{ color: EVO.douradoClaro }}>{r0(h.cardiac)}%</span>
              </div>
              <Bar value={h.cardiac} color={toneFor(h.cardiac, "low")} />
            </div>
            <div>
              <div className={`${teko.className} flex justify-between text-[20px] uppercase tracking-[0.16em]`} style={{ color: EVO.branco }}>
                <span>{t("stToxicity", "Toxicidade")}</span>
                <span style={{ color: EVO.douradoClaro }}>{r0(h.toxicity)}</span>
              </div>
              <Bar value={h.toxicity} max={120} color={toneFor((h.toxicity / 120) * 100, "low")} />
            </div>
          </div>
        </Plate>
      </div>
      <div className="flex flex-col gap-4">
        <Plate title={t("stDiseases", "Doenças")}>
          <div className="grid gap-3">
            {(
              [
                [<Droplet key="d" className="h-6 w-6" />, t("stDiabetes", "Diabetes"), h.diabetes, h.diabetesRisk],
                [<HeartPulse key="p" className="h-6 w-6" />, t("stHypertension", "Pressão alta"), h.hypertension, h.bpRisk],
              ] as const
            ).map(([icon, label, state, risk]) => (
              <div key={label} className="flex items-center gap-4">
                <Ring color={state === "uncontrolled" ? EVO.perigo : EVO.rosa}>{icon}</Ring>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`${teko.className} text-[22px] font-semibold uppercase tracking-[0.14em]`} style={{ color: EVO.branco }}>
                      {label}
                    </span>
                    {dis(state)}
                  </div>
                  {state === "none" && (
                    <>
                      <div className={`${archivo.className} mb-1 text-[15px]`} style={{ color: EVO.mudo }}>
                        {t("stRisk", "Risco: {n}%").replace("{n}", String(r0(risk)))}
                      </div>
                      <Bar value={risk} color={toneFor(risk, "low")} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Plate>
        <Plate title={t("stVitality", "Vitalidade")}>
          <div className="flex items-center gap-5">
            <Gauge value={c.vitals.vitality} label={t("stVitalityUnit", "de 100")} color={toneFor(c.vitals.vitality)} />
            <p className={`${archivo.className} text-[16px]`} style={{ color: EVO.mudo }}>
              {t("stVitalityText", "É o teto da saúde. Cada internação deixa uma sequela (−8) e um infarto, −20. Volta devagar com a saúde acima de 80. Internado com vitalidade 20 ou menos, ele não resiste.")}
            </p>
          </div>
        </Plate>
      </div>
    </div>
  )
}

function Attributes({ life, compact, t }: PageProps) {
  const c = life.character
  const at = c.attributes
  const max = life.catalog.attributes?.max ?? 1000
  const useful = at.usefulToday
  // [ícone, cor, nome, valor, máximo da barra, piso (traço dourado), texto, sufixo]
  const rows = [
    [<Brain key="i" className="h-6 w-6" />, EVO.azul, t("atIntelligence", "Inteligência"), at.intelligence, max, at.floors?.intelligence, t("atIntelligenceText2", "Sobe estudando (rende até 5 h por dia). O que ele aprende fica: nunca cai abaixo de 90% do maior valor."), ""],
    [<Dumbbell key="f" className="h-6 w-6" />, EVO.perigo, t("atStrength", "Força"), at.strength, max, at.floors?.strength, t("atStrengthText2", "Sobe treinando (rende até 4 h por dia); whey, creatina, pré-treino e anabolizante aceleram. Sem treino cai até 60% do maior valor."), ""],
    [<Wind key="v" className="h-6 w-6" />, EVO.bom, t("atSpeed", "Velocidade"), at.speed, max, at.floors?.speed, t("atSpeedText2", "Sobe treinando. Sem treino cai até 60% do maior valor; voltar ao topo é mais rápido."), ""],
    [<Sprout key="r" className="h-6 w-6" />, EVO.rosa, t("atFertility", "Fertilidade"), at.fertility, 100, undefined, t("atFertilityText", "Cai com anabolizante, obesidade, estresse, doença e toxicidade."), "%"],
  ] as const
  return (
    <div className={`grid gap-4 ${compact ? "" : "grid-cols-[1.3fr_1fr]"}`}>
      <Plate title={t("stAttributes", "Atributos")} aside={<span className={`${archivo.className} text-[14px]`} style={{ color: EVO.mudo }}>{t("stAttrScale2", "De 0 a {max} · traço = piso").replace("{max}", String(max))}</span>}>
        <div className="grid">
          {rows.map(([icon, color, label, value, top, floor, text, unit]) => (
            <div key={label} className="flex items-center gap-4 border-b py-3" style={{ borderColor: EVO.linha }}>
              <Ring color={color}>{icon}</Ring>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <span className={`${teko.className} w-40 shrink-0 text-[24px] font-semibold uppercase tracking-[0.12em]`} style={{ color: EVO.branco }}>
                    {label}
                  </span>
                  <span className={`${teko.className} w-20 text-[36px] font-bold leading-none`} style={{ color: EVO.branco }}>
                    {r0(value)}
                    {unit}
                  </span>
                  <div className="flex-1">
                    <Bar value={value} max={top} mark={floor} color={color} />
                  </div>
                </div>
                <div className={`${archivo.className} text-[15px]`} style={{ color: EVO.mudo }}>
                  {text}
                </div>
              </div>
            </div>
          ))}
          {useful && (
            <div className="flex flex-wrap gap-2 pt-3">
              {(["studying", "training"] as const).map((k) => (
                <Tag key={k} tone={useful[k].done >= useful[k].cap ? "mudo" : "ouro"}>
                  {t("atUsefulToday", "{act} hoje: {done}/{cap} h úteis")
                    .replace("{act}", activityLabel(k, t))
                    .replace("{done}", String(Math.round(useful[k].done * 10) / 10))
                    .replace("{cap}", String(useful[k].cap))}
                </Tag>
              ))}
            </div>
          )}
        </div>
      </Plate>
      <div className="flex flex-col gap-4">
        <Plate title={t("stPersonality", "Personalidade")}>
          {TRAITS.map((k) => (
            <div key={k} className="py-1.5">
              <div className={`${teko.className} flex justify-between text-[20px] uppercase tracking-[0.14em]`} style={{ color: EVO.branco }}>
                <span>{traitName(k, t)}</span>
                <span style={{ color: EVO.douradoClaro }}>{r0(c.personality[k] * 100)}</span>
              </div>
              <Bar value={c.personality[k] * 100} color={`linear-gradient(90deg, ${EVO.ritual}, ${EVO.magenta})`} height={8} />
            </div>
          ))}
        </Plate>
        <Plate title={t("stEffects", "Efeitos no corpo")}>
          {c.effects.length === 0 ? (
            <p className={`${archivo.className} text-[16px]`} style={{ color: EVO.mudo }}>
              {t("stNoEffects", "Nenhum suplemento, remédio ou estimulante agindo agora.")}
            </p>
          ) : (
            c.effects.map((e) => <Row key={e.id} label={effectName(e.id, t)} value={t("stEffectLeft", "mais {h}").replace("{h}", hoursText(e.remainingH))} />)
          )}
        </Plate>
      </div>
    </div>
  )
}

const HOUR_CHOICES = [1, 2, 4, 8, 12, 24, 48, 72]

function Routine({ life, compact, t, act }: PageProps) {
  const c = life.character
  const a = c.activity
  const busy = act.busy || c.status !== "alive"
  const mealTag = (s: string) =>
    s === "eaten" ? <Tag tone="bom">{t("mealEaten", "Comeu")}</Tag> : s === "missed" ? <Tag tone="perigo">{t("mealMissed", "Perdeu")}</Tag> : s === "open" ? <Tag>{t("mealOpen", "Agora")}</Tag> : <Tag tone="mudo">{t("mealLater", "Depois")}</Tag>
  const kinds = [
    ["studying", <BookOpen key="s" className="h-5 w-5" />],
    ["training", <Dumbbell key="t" className="h-5 w-5" />],
    ["working", <Briefcase key="w" className="h-5 w-5" />],
  ] as const
  return (
    <div className={`grid gap-4 ${compact ? "" : "grid-cols-[1fr_1.15fr]"}`}>
      <div className="flex flex-col gap-4">
        <Plate title={t("stMeals", "Refeições de hoje")}>
          {c.meals.map((m) => (
            <div key={m.at} className="flex items-center gap-4 border-b py-2.5" style={{ borderColor: EVO.linha }}>
              <Ring color={m.state === "missed" ? EVO.perigo : m.state === "eaten" ? EVO.bom : EVO.ambar} size={42}>
                <Utensils className="h-5 w-5" />
              </Ring>
              <span className={`${teko.className} flex-1 text-[28px] font-semibold uppercase tracking-wider`} style={{ color: EVO.branco }}>
                {t("mealAt", "{h} h").replace("{h}", String(m.at))}
              </span>
              {mealTag(m.state)}
            </div>
          ))}
          <p className={`${archivo.className} mt-2 text-[15px]`} style={{ color: EVO.mudo }}>
            {t("stMealsText", "Cada refeição vale por 2 h. Entre no jogo e dê comida (página Mercado). Perder refeição deixa ele triste e estressado.")}
          </p>
        </Plate>
        <Plate title={t("stHoursToday", "Horas de hoje")}>
          <div className="flex items-center gap-5">
            <Gauge value={c.today.score} label={conditionLabel(c.today.label, t)} size={150} color={c.today.score >= 60 ? EVO.bom : c.today.score >= 40 ? EVO.ambar : EVO.perigo} />
            <div className="min-w-0 flex-1">
              {(["sleeping", "studying", "training", "working", "lying", "hospital"] as const)
                .filter((k) => (c.today.hours[k] ?? 0) > 0.01)
                .map((k) => (
                  <Row key={k} label={activityLabel(k, t)} value={hoursText(c.today.hours[k])} />
                ))}
            </div>
          </div>
        </Plate>
      </div>
      <Plate title={t("stDoNow", "O que ele faz agora")}>
        <Chamfer cut={14} border={`${EVO.magenta}88`}>
          <div className="flex items-center gap-4 px-4 py-3">
            <Ring color={EVO.magenta} size={50}>
              {ACT_ICON[a.kind]}
            </Ring>
            <div className="min-w-0 flex-1">
              <div className={`${teko.className} text-[32px] font-bold uppercase leading-none`} style={{ color: EVO.branco }}>
                {activityLabel(a.kind, t)}
              </div>
              <div className={`${archivo.className} text-[15px]`} style={{ color: EVO.mudo }}>
                {a.resume && a.remainingH != null
                  ? t("stRoutinePause", "Pausa da rotina: em {h} volta a {act}.")
                      .replace("{h}", hoursText(a.remainingH))
                      .replace("{act}", activityLabel(a.resume.kind, t).toLowerCase())
                  : a.remainingH != null
                  ? t("stUntil", "Faltam {h}. Ele continua mesmo com o jogo fechado.").replace("{h}", hoursText(a.remainingH))
                  : a.kind === "hospital"
                    ? t("stHospitalText", "Internado até se recuperar (saúde 60).")
                    : t("stIdleText", "Sem nada marcado.")}
              </div>
            </div>
            {(a.kind === "studying" || a.kind === "training" || a.kind === "working" || a.resume) && (
              <GoldButton onClick={() => act.activity("idle")} disabled={busy}>
                {t("stStop", "Parar")}
              </GoldButton>
            )}
          </div>
        </Chamfer>
        <div className="mt-4 grid gap-3">
          {kinds.map(([kind, icon]) => (
            <div key={kind} className="flex flex-wrap items-center gap-2 border-b pb-3" style={{ borderColor: EVO.linha }}>
              <span
                className={`${teko.className} flex w-44 items-center gap-2 text-[24px] font-semibold uppercase tracking-wider`}
                style={{ color: a.kind === kind ? EVO.magenta : EVO.douradoClaro, textShadow: a.kind === kind ? `0 0 10px ${EVO.magenta}` : undefined }}
              >
                {icon}
                {activityLabel(kind, t)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {HOUR_CHOICES.map((h) => (
                  <GoldButton key={h} onClick={() => act.activity(kind, h)} disabled={busy}>
                    {h}h
                  </GoldButton>
                ))}
              </div>
            </div>
          ))}
          <p className={`${archivo.className} text-[15px]`} style={{ color: EVO.mudo }}>
            {t("stRoutineText2", "É uma rotina: ele rende as primeiras horas do dia (estudo 5 h, treino 4 h), descansa, dorme às 23 h e volta às 7 h. Na hora da refeição compra comida com as moedas. Constância de dias rende mais que maratona.")}
          </p>
        </div>
      </Plate>
    </div>
  )
}

const MARKET_GROUPS: [string, string, LifeItemKind[], ReactNode][] = [
  ["mkHealthy", "Comida saudável", ["food", "drink"], <Utensils key="u" className="h-5 w-5" />],
  ["mkJunk", "Lanches e porcarias", ["food", "drink"], <Flame key="f" className="h-5 w-5" />],
  ["mkSupplements", "Suplementos", ["supplement"], <FlaskConical key="s" className="h-5 w-5" />],
  ["mkMedicine", "Remédios", ["medicine"], <Pill key="m" className="h-5 w-5" />],
  ["mkStimulants", "Estimulantes", ["stimulant"], <Coffee key="c" className="h-5 w-5" />],
  ["mkAnabolic", "Anabolizantes", ["anabolic"], <Syringe key="a" className="h-5 w-5" />],
]

function Market({ life, compact, t, act }: PageProps) {
  const items = life.catalog.items
  const c = life.character
  const [tab, setTab] = useState<string>("mkHealthy")
  const groupOf = (it: LifeItem) =>
    it.kind === "food" || it.kind === "drink"
      ? it.nutri >= 4
        ? "mkHealthy"
        : "mkJunk"
      : MARKET_GROUPS.find((g) => g[0] !== "mkHealthy" && g[0] !== "mkJunk" && g[2].includes(it.kind))?.[0]
  const busy = act.busy || c.status !== "alive"
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`${teko.className} text-[30px] font-bold uppercase leading-none`} style={{ color: EVO.branco }}>
          {t("mkWallet", "Carteira")}: <span style={{ color: EVO.douradoClaro }}>{t("stCoins", "{n} moedas").replace("{n}", String(life.wallet.coins))}</span>
        </div>
        <span className={`${archivo.className} text-[15px]`} style={{ color: EVO.mudo }}>
          {t("mkHint", "Saudável é caro e porcaria é barata. Trabalhar rende moedas.")}
        </span>
      </div>
      {/* abas de categoria (os chips do EVO) */}
      <div className="flex flex-wrap gap-2">
        {MARKET_GROUPS.map(([key, fallback, , icon]) => (
          <GoldButton key={key} onClick={() => setTab(key)} active={tab === key}>
            {icon}
            {t(key, fallback)}
          </GoldButton>
        ))}
      </div>
      <div>
        {MARKET_GROUPS.filter(([key]) => key === tab).map(([key, fallback, , icon]) => {
          const list = items.filter((it) => groupOf(it) === key)
          return (
            <Plate key={key} pad="p-3" title={t(key, fallback)} aside={<span style={{ color: EVO.ambar }}>{icon}</span>}>
              <div className={`grid gap-x-6 ${compact ? "" : "grid-cols-2"}`}>
                {list.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 border-b py-1.5" style={{ borderColor: EVO.linha }}>
                    <div className="min-w-0 flex-1">
                      <div className={`${archivo.className} truncate text-[17px] font-semibold`} style={{ color: EVO.branco }}>
                        {itemName(it, t)}
                      </div>
                      <div className={`${archivo.className} truncate text-[14px]`} style={{ color: EVO.mudo }}>
                        {[
                          it.kcal ? `${it.kcal} kcal` : null,
                          it.nutri >= 4 ? t("mkGood", "faz bem") : it.nutri <= -4 ? t("mkBad", "faz mal") : null,
                          it.effect ? t("mkLasts", "dura {h}").replace("{h}", hoursText(it.effect.hours)) : null,
                          it.tox ? t("mkTox", "tóxico") : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <GoldButton onClick={() => act.consume(it.id)} disabled={busy || life.wallet.coins < it.price}>
                      {it.price}
                    </GoldButton>
                  </div>
                ))}
              </div>
            </Plate>
          )
        })}
      </div>
    </div>
  )
}

function History({ life, compact, t }: PageProps) {
  const items = new Map(life.catalog.items.map((i) => [i.id, i]))
  const off = life.catalog.clock.offsetMin
  return (
    <div className={`grid gap-4 ${compact ? "" : "grid-cols-[1fr_1.2fr]"}`}>
      <Plate title={t("stDiary", "Diário")}>
        {life.days.map((d) => (
          <div key={d.day} className="flex items-center gap-3 border-b py-2" style={{ borderColor: EVO.linha }}>
            <span className={`${teko.className} w-24 text-[24px] font-semibold`} style={{ color: EVO.branco }}>
              {d.day.slice(8, 10)}/{d.day.slice(5, 7)}
            </span>
            <div className={`${archivo.className} min-w-0 flex-1 text-[14px]`} style={{ color: EVO.mudo }}>
              {t("stDiaryLine", "Dormiu {s} · {m} refeições · perdeu {x}")
                .replace("{s}", hoursText(d.hours.sleeping ?? 0))
                .replace("{m}", String(d.mealsEaten))
                .replace("{x}", String(d.mealsMissed))}
            </div>
            <Tag tone={d.condition.score >= 60 ? "bom" : d.condition.score >= 40 ? "ouro" : "perigo"}>{conditionLabel(d.condition.label, t)}</Tag>
          </div>
        ))}
      </Plate>
      <Plate title={t("stTimeline", "Linha do tempo")}>
        {life.events.length === 0 && (
          <p className={`${archivo.className} text-[16px]`} style={{ color: EVO.mudo }}>
            {t("stNoEvents", "Nada aconteceu ainda.")}
          </p>
        )}
        {life.events.slice(0, compact ? 30 : 9).map((e, i) => (
          <div key={`${e.at}-${i}`} className="flex items-center gap-3 border-b py-2" style={{ borderColor: EVO.linha }}>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center" style={{ border: `2px solid ${EVO.perigo}`, color: EVO.perigo }}>
              {eventIcon(e.kind)}
            </span>
            <div className="min-w-0 flex-1">
              <div className={`${teko.className} text-[18px] font-semibold uppercase tracking-wider`} style={{ color: EVO.douradoClaro }}>
                {timeOf(e.at, off)}
              </div>
              <div className={`${archivo.className} truncate text-[15px]`} style={{ color: EVO.branco }}>
                {eventText(e.kind, e.data, t, items)}
              </div>
            </div>
          </div>
        ))}
      </Plate>
    </div>
  )
}

export function StatusPage(props: PageProps) {
  const body =
    props.page === "overview" ? (
      <Overview {...props} />
    ) : props.page === "body" ? (
      <BodyPage {...props} />
    ) : props.page === "attributes" ? (
      <Attributes {...props} />
    ) : props.page === "routine" ? (
      <Routine {...props} />
    ) : props.page === "market" ? (
      <Market {...props} />
    ) : (
      <History {...props} />
    )
  // Celular: a altura é a do conteúdo (o card rola); computador: a do modal.
  return (
    <div className={`${archivo.className} flex flex-col gap-4 ${props.compact ? "" : "h-full"}`}>
      <Header {...props} />
      <div className={props.compact ? "" : "min-h-0 flex-1 overflow-hidden"}>{body}</div>
    </div>
  )
}
