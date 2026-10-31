// features/meu-mundo/ui/status/status-pages.tsx — o CONTEÚDO dos seis modais
// do STATUS do hóspede (mm3d-13), na silhueta dos modais do STATUS do EVO
// Brazil: cabeçalho com STATUS, o subtítulo da página, o retrato
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
  Lock,
  Pill,
  Shirt,
  Skull,
  Smile,
  Sparkles,
  Sprout,
  Square,
  Swords,
  Syringe,
  Utensils,
  Wind,
  Zap,
} from "lucide-react"
import type { LifeActivity, LifeCharacter, LifeFull, LifeItem, LifeItemKind } from "../../types"
import { Bar, Chamfer, EVO, Gauge, Plate, Ring, Tag, archivo, teko, toneFor } from "./evo-skin"
import { MM } from "../hud/tokens"
import { Arc, Card, effectText, toneColor } from "../fridge/shelf"
import { effectsOf, thumbOf } from "../fridge/fridge-logic"
import { faceForPortrait } from "../portraits"
import { GOD_NAMES, isGod, type GodBody } from "../../gods"

type Tr = (key: string, fallback: string) => string

export const PAGES = ["overview", "body", "attributes", "routine", "market", "history"] as const
export type PageId = (typeof PAGES)[number]

export interface PageActions {
  busy: boolean
  activity: (kind: "studying" | "training" | "working" | "idle", hours?: number) => void
  /** Mercado → geladeira (mm3d-28): compra e guarda; comer é na geladeira da casa. */
  buy: (item: string) => void
  /** Está no supermercado (mm3d-37c): fora dele o Mercado só mostra. */
  canBuy: boolean
  newcomer: () => void
  /** Abre o vestuário (botão SKIN embaixo da foto, mm3d-16). */
  openSkins: () => void
  /** Adquirir Poléns pelo checkout oficial (mm3d-30). */
  openPolens?: () => void
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
      praying: t("actPraying", "Rezando"),
      jail: t("actJail", "Preso"),
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
  praying: <Sparkles className="h-5 w-5" />,
  jail: <Lock className="h-5 w-5" />,
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
      velhice: t("causeOldAge", "Velhice"),
    } as Record<string, string>
  )[c] ?? c
}
/** Funeral e herança (mm3d-34) na tela de morte: o que o servidor decidiu em `afterlife`. */
function afterlifeLines(c: LifeCharacter, coins: number, t: Tr): { funeral: string; heir: string; button: string } | null {
  const a = c.afterlife
  if (!a) return null
  if (a.natural && a.inherit)
    return {
      funeral: t("stFuneralFree", "Morreu de velhice: a Freelandoo pagou o funeral."),
      heir: t("stHeirInherit", "O novo hóspede herda 20%: inteligência {i}, força {s}, velocidade {v}.")
        .replace("{i}", String(Math.round(a.inherit.intelligence)))
        .replace("{s}", String(Math.round(a.inherit.strength)))
        .replace("{v}", String(Math.round(a.inherit.speed))),
      button: t("stNewcomer", "Receber novo hóspede"),
    }
  return {
    // Cobra até o que houver na carteira (nunca negativa): mostra o que vai sair de fato.
    funeral: t("stFuneralPaid", "O funeral custa {n} moedas e é você quem paga.").replace("{n}", String(Math.min(a.funeral.coins, Math.floor(coins)))),
    heir: t("stHeirNone", "Sem herança: o novo hóspede começa do zero."),
    button: t("stNewcomerPay", "Pagar funeral e receber novo hóspede"),
  }
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
/**
 * As duas moedas, separadas (mm3d-30): as do jogo e Poléns (a moeda paga da
 * Freelandoo, da carteira oficial). Poléns ainda não lidos não aparecem;
 * indisponível mostra "—" — nunca um zero que não foi confirmado.
 */
export function walletText(life: LifeFull, t: Tr) {
  const coins = t("stCoins", "{n} moedas").replace("{n}", String(life.wallet.coins))
  const p = life.wallet.polens
  if (p === undefined) return coins
  return `${coins} · ${p === null ? t("stPolensOff", "Poléns —") : t("stPolens", "{n} Poléns").replace("{n}", String(p))}`
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
      injury: t("effInjury", "Lesão do boxe"),
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
    case "meal_part":
      return t("evMealPart", "Parte da refeição das {h} h: {item}.").replace("{h}", String(data.meal)).replace("{item}", item ? itemName(item, t) : "")
    case "meal_lost":
      return t("evMealLost", "A refeição das {h} h ficou para trás (a penalidade terminou).").replace("{h}", String(data.meal))
    case "buy":
      return t("evBuy", "Comprou {n}× {item} para a geladeira ({p} moedas).")
        .replace("{n}", String(data.qty ?? 1))
        .replace("{item}", item ? itemName(item, t) : String(data.item ?? ""))
        .replace("{p}", String(data.price ?? ""))
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
      if (data.from === "fridge") return t("evRoutineFridge", "Rotina: comeu {item} da geladeira.").replace("{item}", item ? itemName(item, t) : String(data.item ?? ""))
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
      return data.reason === "boxe" ? t("evHospitalInBoxe", "Saiu da arena de boxe direto para o hospital.") : t("evHospitalIn", "Foi internado no hospital.")
    case "boxe":
      return (
        data.outcome === "win"
          ? t("evBoxeWin", "Venceu uma luta de boxe ({how}).")
          : data.outcome === "loss"
            ? t("evBoxeLoss", "Perdeu uma luta de boxe ({how}).")
            : t("evBoxeDraw", "Empatou uma luta de boxe.")
      )
        .replace(
          "{how}",
          data.method === "ko"
            ? t("evBoxeKo", "nocaute")
            : data.method === "tko"
              ? t("evBoxeTko", "nocaute técnico")
              : data.method === "towel"
                ? t("evBoxeTowel", "toalha")
                : t("evBoxePoints", "pontos"),
        )
        .concat(Number(data.coins) > 0 ? " " + t("evBoxeCoins", "+{n} moedas.").replace("{n}", String(data.coins)) : "")
    case "hospital_out":
      return t("evHospitalOut", "Teve alta do hospital.")
    case "diabetes":
      return t("evDiabetes", "Desenvolveu diabetes.")
    case "hypertension":
      return t("evHypertension", "Desenvolveu pressão alta.")
    case "heart_attack":
      return t("evHeartAttack", "Teve um infarto.")
    case "adult":
      return t("evAdult", "Virou adulto: +20% em inteligência, força e velocidade; saúde 100.")
    case "skin_bought":
      return (Number(data.price) > 0 ? t("evSkinAcquired", "Adquiriu a skin {skin} ({n} moedas).") : t("evSkinAcquiredFree", "Adquiriu a skin {skin}."))
        .replace("{skin}", data.skin === "sergio" ? "Sergio" : data.skin === "feminina" ? t("skinFeminina", "Personagem feminina") : data.skin === "ekaterina" ? "Ekaterina" : isGod(String(data.skin)) ? GOD_NAMES[data.skin as GodBody] : String(data.skin ?? ""))
        .replace("{n}", String(data.price ?? ""))
    case "death":
      return t("evDeath", "Morreu: {cause}.").replace("{cause}", causeLabel(String(data.cause ?? ""), t))
    default:
      return kind
  }
}
function eventIcon(kind: string) {
  if (kind === "meal" || kind === "meal_missed" || kind === "meal_part" || kind === "meal_lost" || kind === "consume" || kind === "routine_meal" || kind === "buy")
    return <Utensils className="h-5 w-5" />
  if (kind === "hospital_in" || kind === "hospital_out") return <Hospital className="h-5 w-5" />
  if (kind === "heart_attack" || kind === "hypertension") return <HeartPulse className="h-5 w-5" />
  if (kind === "diabetes") return <Droplet className="h-5 w-5" />
  if (kind === "death") return <Skull className="h-5 w-5" />
  if (kind === "collapse") return <Zap className="h-5 w-5" />
  if (kind === "skin_bought") return <Shirt className="h-5 w-5" />
  if (kind === "boxe") return <Swords className="h-5 w-5" />
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
        boxShadow: round ? `0 0 0 2px ${MM.ruby}` : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- retrato pequeno, local, só no jogo (admin) */}
      <img src={round ? faceForPortrait(src) : src} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" draggable={false} />
    </div>
  )
}

function Header({ life, name, portrait, page, compact, t }: Omit<PageProps, "act">) {
  const c = life.character
  const days = Math.max(1, Math.floor((new Date(life.now).getTime() - new Date(c.bornAt).getTime()) / 86400000) + 1)
  // Celular: uma faixa só (~44 px) — retrato, STATUS e a página; nome à direita.
  if (compact) {
    return (
      <div className="flex shrink-0 items-center gap-2 border-b pb-1.5" style={{ borderColor: MM.border }}>
        <Portrait src={portrait} size={28} round />
        <div className="min-w-0 flex-1">
          <div className={`${teko.className} font-bold uppercase leading-[0.9]`} style={{ fontSize: 24, color: EVO.branco }}>
            {t("stTitle", "Status")}
          </div>
          <div className={`${archivo.className} truncate text-[10.5px] font-medium uppercase leading-tight tracking-[0.08em]`} style={{ color: EVO.douradoClaro }}>
            {pageTitle(page, t)}
          </div>
        </div>
        <div className="min-w-0 max-w-[42%] text-right">
          <div className={`${teko.className} truncate text-[16px] font-semibold uppercase leading-none`} style={{ color: EVO.branco }}>
            {name}
          </div>
          <div className={`${archivo.className} truncate text-[10px] leading-tight`} style={{ color: EVO.mudo }}>
            {t("stGeneration", "Geração {n}").replace("{n}", String(c.generation))} · {walletText(life, t)}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-4 border-b pb-3" style={{ borderColor: MM.border }}>
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
              {t("stGeneration", "Geração {n}").replace("{n}", String(c.generation))} · {walletText(life, t)}
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
              {t("stDaysLived", "{n} dias de vida").replace("{n}", String(days))} • {walletText(life, t)} •{" "}
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
      className={`${archivo.className} inline-flex min-h-11 items-center justify-center gap-2 px-4 text-[15px] font-semibold leading-none transition-transform duration-[140ms] active:scale-[0.97] disabled:cursor-not-allowed`}
      style={{
        borderRadius: MM.radius.button,
        background: disabled ? MM.card : active ? MM.rubyFill : MM.surface,
        color: disabled ? MM.disabledText : EVO.branco,
        border: `1px solid ${disabled ? MM.border : active ? MM.rubyBorder : MM.goldBorder}`,
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
    const lines = afterlifeLines(c, life.wallet.coins, t)
    const after = lines && { ...lines, free: !!c.afterlife?.natural }
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
              {after && (
                <>
                  <p className={`${archivo.className} mt-3 text-[17px] font-semibold`} style={{ color: after.free ? EVO.bom : EVO.douradoClaro }}>
                    {after.funeral}
                  </p>
                  <p className={`${archivo.className} mt-1 text-[16px]`} style={{ color: EVO.mudo }}>
                    {after.heir}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="mt-6">
            <GoldButton onClick={act.newcomer} disabled={act.busy} active>
              {after?.button ?? t("stNewcomer", "Receber novo hóspede")}
            </GoldButton>
          </div>
        </Plate>
      </div>
    )
  }
  return (
    <div className={`grid h-full gap-5 ${compact ? "" : "grid-cols-[minmax(0,560px)_1fr]"}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Portrait src={portrait} size={compact ? 200 : 330} />
          <GoldButton onClick={act.openSkins} active>
            <Shirt className="h-5 w-5" /> {t("stSkin", "Skin")}
          </GoldButton>
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
                <div key={m.at} className="flex items-center gap-3 rounded-[12px] px-3 py-2" style={{ boxShadow: `inset 0 0 0 1px ${color}88`, background: "rgba(0,0,0,0.35)" }}>
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
  const hint = { normal: t("bodyNormal", "Normal"), slim: t("bodySlim", "Magro"), fat: t("bodyFat", "Gordo"), strong: t("bodyStrong", "Forte"), sergio: "Sergio", female: t("bodyFemale", "Feminina"), ekaterina: "Ekaterina", ...GOD_NAMES }[b.bodyHint]
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
  // Treino e estudo só no prédio do centro (mm3d-37b): aqui só se marca trabalho.
  const kinds = [["working", <Briefcase key="w" className="h-5 w-5" />]] as const
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
            {t("stMealsRuleFridge", "Coma de 2 h antes até 2 h depois de cada horário, pela geladeira da sua casa. Depois disso, ele vai perdendo saciedade, energia e saúde por 2 h.")}
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
        <Chamfer cut={14} border={MM.rubyBorder}>
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
                style={{ color: a.kind === kind ? EVO.rosaClaro : EVO.douradoClaro }}
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
            {t("stWhere", "Treinar é na academia do centro; estudar, na biblioteca, na escola ou na universidade (rende mais, mas cobra a hora de aula). Entre no prédio e use um aparelho ou uma carteira.")}
          </p>
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
          {t("mkWallet", "Carteira")}: <span style={{ color: EVO.douradoClaro }}>{walletText(life, t)}</span>
          {act.openPolens && (
            <button type="button" onClick={act.openPolens} className={`${archivo.className} ml-3 align-middle text-[15px] font-semibold normal-case underline decoration-1 underline-offset-4`} style={{ color: MM.gold }}>
              {t("plBuyShort", "+ Poléns")}
            </button>
          )}
        </div>
        <span className={`${archivo.className} text-[15px]`} style={{ color: EVO.mudo }}>
          {act.canBuy
            ? t("mkHintFridge", "Tudo vai para a geladeira da sua casa — é lá que ele come. Saudável é caro, porcaria é barata.")
            : t("mkHintGoMarket", "Para comprar, vá ao supermercado do centro e passe no caixa. Tudo vai para a geladeira da sua casa.")}
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
              {/* os itens em cards: a MESMA peça da geladeira (fridge/shelf.tsx), Comprar embaixo */}
              <div className={`grid gap-x-4 gap-y-3 ${compact ? "grid-cols-3" : "grid-cols-5"}`}>
                {list.map((it) => {
                  const n = life.fridge?.[it.id] ?? 0
                  const main = effectsOf(it)[0]
                  const poor = life.wallet.coins < it.price
                  const extra = [
                    it.kcal ? `${it.kcal} kcal` : null,
                    it.effect ? t("mkLasts", "dura {h}").replace("{h}", hoursText(it.effect.hours)) : null,
                    it.tox ? t("mkTox", "tóxico") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                  return (
                    <div key={it.id} className="flex min-w-0 flex-col gap-2">
                      <div style={{ height: 196 }}>
                        <Card active={false} empty={false} img={thumbOf(it.id)} badge={n ? `×${n}` : undefined} w={250} h={196} compact={false}>
                          <div className={`${teko.className} line-clamp-1 text-[20px] font-semibold uppercase leading-none`} style={{ color: EVO.branco }}>
                            {itemName(it, t)}
                          </div>
                          {main && (
                            <div className={`${teko.className} mt-0.5 text-[17px] leading-none`} style={{ color: toneColor(main.tone) }}>
                              {effectText(main, t)}
                            </div>
                          )}
                          {extra && (
                            <div className={`${archivo.className} mt-0.5 truncate text-[12px] leading-tight`} style={{ color: EVO.mudo }}>
                              {extra}
                            </div>
                          )}
                        </Card>
                      </div>
                      <MiniButton onClick={() => act.buy(it.id)} disabled={busy || poor || !act.canBuy} primary={!poor && act.canBuy} h={38} className="w-full">
                        {!act.canBuy ? t("mkAtMarket", "No supermercado · {n}").replace("{n}", String(it.price)) : poor ? t("mkNoCoins", "Moedas insuficientes") : t("mkBuyPrice", "Comprar · {n} moedas").replace("{n}", String(it.price))}
                      </MiniButton>
                    </div>
                  )
                })}
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

// ─── celular (compacto) ───────────────────────────────────────────────────────
// No celular cada página cabe na tela (~600 px de altura úteis), sem rolagem,
// como no computador: letra menor, grades de 2 colunas, listas limitadas ao que
// cabe e textos longos trocados por resumos. O layout do computador (acima)
// não passa por aqui.

/** Ícones de 20 px das tabelas acima, encolhidos para os anéis pequenos. */
const SM_ICON = "flex [&>svg]:h-3.5 [&>svg]:w-3.5"

/** Placa do celular: título de 15 px, recheio de 8 px. */
function MiniPlate({ title, aside, children, className = "" }: { title?: string; aside?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <Chamfer cut={10} className={className}>
      <div className="h-full p-2">
        {title && (
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <h3 className={`${teko.className} truncate text-[16px] font-semibold uppercase leading-none tracking-wide`} style={{ color: EVO.ambar }}>
              {title}
            </h3>
            {aside}
          </div>
        )}
        {children}
      </div>
    </Chamfer>
  )
}

function MiniTag({ children, tone = "ouro" }: { children: ReactNode; tone?: "ouro" | "perigo" | "bom" | "mudo" }) {
  const bg = tone === "perigo" ? EVO.perigo : tone === "bom" ? EVO.bom : tone === "mudo" ? EVO.fumaca : EVO.douradoClaro
  return (
    <span
      className={`${archivo.className} inline-block min-w-0 max-w-full truncate whitespace-nowrap px-1 text-[9.5px] font-bold uppercase leading-[14px] tracking-wide`}
      style={{ background: bg, color: tone === "mudo" ? EVO.branco : EVO.preto }}
    >
      {children}
    </span>
  )
}

/** Linha "nome … valor" de 22 px (rótulo 10 px, valor 12 px). */
function MiniRow({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="flex h-[22px] items-center justify-between gap-2 border-b" style={{ borderColor: EVO.linha }}>
      <span className={`${archivo.className} truncate text-[10px]`} style={{ color: EVO.branco }}>
        {label}
      </span>
      <span className={`${archivo.className} shrink-0 whitespace-nowrap text-[12px] font-semibold tabular-nums`} style={{ color: tone ?? EVO.douradoClaro }}>
        {value}
      </span>
    </div>
  )
}

function MiniButton({
  children,
  onClick,
  disabled,
  active,
  h = 34,
  className = "",
  label,
  tight = false,
  primary = false,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
  h?: number
  className?: string
  label?: string
  /** Menos respiro (botões de 3 por linha em 320 px). */
  tight?: boolean
  /** Ação principal (rubi), sem ser alternância como `active`. */
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`${archivo.className} inline-flex items-center justify-center gap-1 font-semibold leading-none ${tight ? "px-1" : "px-2"} transition-transform duration-[140ms] active:scale-[0.97] disabled:cursor-not-allowed ${className}`}
      style={{
        height: h,
        fontSize: tight ? 11 : h >= 32 ? 13 : 12,
        borderRadius: 10,
        background: disabled ? MM.card : active || primary ? MM.rubyFill : MM.surface,
        color: disabled ? MM.disabledText : EVO.branco,
        border: `1px solid ${disabled ? MM.border : active || primary ? MM.rubyBorder : MM.goldBorder}`,
      }}
    >
      {children}
    </button>
  )
}

/** Anel de progresso pequeno (o Gauge do computador tem número de 54 px). */
function MiniGauge({ value, label, size = 64, color = EVO.ambar }: { value: number; label: string; size?: number; color?: string }) {
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, value / 100))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(0,0,0,0.5)" stroke={EVO.fumaca} strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={`${c * p} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${teko.className} font-bold leading-[0.85]`} style={{ fontSize: Math.round(size * 0.36), color: EVO.branco }}>
          {Math.round(value)}
        </span>
        <span className={`${archivo.className} max-w-full truncate px-1 text-[8.5px] font-semibold uppercase`} style={{ color: EVO.douradoClaro }}>
          {label}
        </span>
      </div>
    </div>
  )
}

/** Indicador do celular: anel 26 px, rótulo 10 px, número 16 px, barra fina. */
function MiniMeter({ icon, color, label, value, max = 100, barColor, tag }: { icon: ReactNode; color: string; label: string; value: number; max?: number; barColor?: string; tag?: string }) {
  return (
    <Chamfer cut={9}>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Ring color={color} size={26}>
          <span className={SM_ICON}>{icon}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className={`${archivo.className} truncate text-[10px] font-semibold uppercase tracking-wide`} style={{ color: EVO.branco }}>
            {label}
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className={`${teko.className} shrink-0 whitespace-nowrap font-bold leading-none`} style={{ fontSize: 18, color: EVO.branco }}>
              {r0(value)}
              {/* "/ 100" só quando o teto não é 100 (a saúde vai até a vitalidade) */}
              {r0(max) !== 100 && <span style={{ color: EVO.mudo, fontSize: 13 }}> / {r0(max)}</span>}
            </span>
            {tag && <MiniTag>{tag}</MiniTag>}
          </div>
          <div className="mt-0.5">
            <Bar value={value} max={max} color={barColor ?? color} height={4} />
          </div>
        </div>
      </div>
    </Chamfer>
  )
}

/** Cor e palavra de cada estado de refeição (mm3d-28: aberta, parcial, atrasada…). */
function mealLook(s: string, t: Tr): [string, string] {
  if (s === "eaten") return [EVO.bom, t("mealEaten", "Comeu")]
  if (s === "open") return [EVO.ambar, t("mealOpen", "Agora")]
  if (s === "partial") return [EVO.ambar, t("mealPartial", "Parcial")]
  if (s === "late") return [EVO.perigo, t("mealLate", "Atrasada")]
  if (s === "missed") return [EVO.perigo, t("mealMissed", "Perdeu")]
  return [EVO.mudoEscuro, t("mealLater", "Depois")]
}

/** As 4 refeições do dia numa linha só. */
function MealChips({ meals, t }: { meals: LifeCharacter["meals"]; t: Tr }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {meals.map((m) => {
        const [color, word] = mealLook(m.state, t)
        return (
          <div key={m.at} className="flex flex-col items-center justify-center rounded-[10px] py-1" style={{ boxShadow: `inset 0 0 0 1px ${color}aa`, background: "rgba(0,0,0,0.35)" }}>
            <span className={`${teko.className} text-[17px] font-bold leading-none`} style={{ color: EVO.branco }}>
              {t("mealAt", "{h} h").replace("{h}", String(m.at))}
            </span>
            <span className={`${archivo.className} max-w-full truncate px-0.5 text-[9.5px] font-bold uppercase leading-tight`} style={{ color }}>
              {word}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function OverviewC({ life, portrait, t, act }: PageProps) {
  const c = life.character
  const v = c.vitals
  const a = c.activity
  const total = a.until ? (new Date(a.until).getTime() - new Date(a.startedAt).getTime()) / 3600000 : null
  const progress = total && a.remainingH != null ? Math.max(0, Math.min(1, 1 - a.remainingH / total)) : null
  if (c.status === "dead") {
    const lines = afterlifeLines(c, life.wallet.coins, t)
    const after = lines && { ...lines, free: !!c.afterlife?.natural }
    return (
      <div className="flex flex-col gap-2">
        <div className="flex justify-center" style={{ filter: "grayscale(1) brightness(0.55)" }}>
          <Portrait src={portrait} size={150} />
        </div>
        <MiniPlate title={t("stDeadTitle", "Seu hóspede morreu")}>
          <div className="flex items-start gap-2">
            <Ring color={EVO.perigo} size={30}>
              <Skull className="h-4 w-4" />
            </Ring>
            <div className="min-w-0">
              <div className={`${teko.className} text-[20px] font-bold uppercase leading-none`} style={{ color: EVO.branco }}>
                {causeLabel(c.deathCause, t)}
              </div>
              <p className={`${archivo.className} mt-1 text-[11px] leading-snug`} style={{ color: EVO.mudo }}>
                {t("stDeadText", "A casa e as moedas continuam suas. Um novo hóspede pode chegar agora.")}
              </p>
              {after && (
                <p className={`${archivo.className} mt-1 text-[11px] font-semibold leading-snug`} style={{ color: after.free ? EVO.bom : EVO.douradoClaro }}>
                  {after.funeral} {after.heir}
                </p>
              )}
            </div>
          </div>
          <MiniButton onClick={act.newcomer} disabled={act.busy} active className="mt-2 w-full">
            {after?.button ?? t("stNewcomer", "Receber novo hóspede")}
          </MiniButton>
        </MiniPlate>
      </div>
    )
  }
  const pace = c.pace >= 1 ? t("paceNormal", "normal") : c.pace >= 0.6 ? t("paceTired", "cansado") : t("paceExhausted", "exausto")
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2.5">
        <div className="flex flex-col items-center gap-1">
          <Portrait src={portrait} size={112} />
          <MiniButton onClick={act.openSkins} active h={26} className="w-full">
            <Shirt className="h-3.5 w-3.5" /> {t("stSkin", "Skin")}
          </MiniButton>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Chamfer cut={9}>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Ring color={EVO.ambar} size={28}>
                <span className={SM_ICON}>{ACT_ICON[a.kind]}</span>
              </Ring>
              <div className="min-w-0 flex-1">
                <div className={`${archivo.className} text-[9.5px] font-semibold uppercase tracking-[0.16em]`} style={{ color: EVO.mudo }}>
                  {t("stNow", "Agora")}
                </div>
                <div className={`${teko.className} truncate text-[18px] font-bold uppercase leading-none`} style={{ color: EVO.branco }}>
                  {activityLabel(a.kind, t)}
                </div>
                {a.remainingH != null && (
                  <div className={`${archivo.className} truncate text-[10px]`} style={{ color: EVO.ambar }}>
                    {t("stRemaining", "faltam {h}").replace("{h}", hoursText(a.remainingH))}
                  </div>
                )}
                {progress != null && (
                  <div className="mt-0.5">
                    <Bar value={progress * 100} height={4} color={`linear-gradient(90deg, ${EVO.ambarFundo}, ${EVO.ambar})`} />
                  </div>
                )}
              </div>
            </div>
          </Chamfer>
          <div className="flex items-start gap-1.5">
            <span className={`${teko.className} text-[30px] font-bold leading-[0.7]`} style={{ color: EVO.magenta }}>
              “
            </span>
            <div className="min-w-0">
              <div className={`${archivo.className} line-clamp-3 text-[12px] font-semibold leading-snug`} style={{ color: EVO.branco }}>
                {quote(c, t)}
              </div>
              <div className={`${archivo.className} mt-0.5 text-[10px] uppercase leading-snug`} style={{ color: EVO.mudo }}>
                {t("stMoodIs", "Humor: {m}").replace("{m}", moodTag(v.mood, t))}
                <br />
                {t("stHungerIs", "Fome: {m}").replace("{m}", satietyTag(v.satiety, t))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <MiniMeter icon={<Heart />} color={EVO.perigo} label={t("stHealth", "Saúde")} value={v.health} max={Math.max(1, v.vitality)} barColor={toneFor(v.health)} tag={healthTag(v.health, t)} />
        <MiniMeter icon={<Zap />} color={EVO.ambar} label={t("stEnergy", "Energia")} value={v.energy} barColor={`linear-gradient(90deg, ${EVO.ambarFundo}, ${EVO.ambar})`} tag={energyTag(v.energy, t)} />
        <MiniMeter icon={<Activity />} color={EVO.roxo} label={t("stStress", "Estresse")} value={v.stress} barColor={toneFor(v.stress, "low")} tag={stressTag(v.stress, t)} />
        <MiniMeter icon={<Utensils />} color={EVO.bom} label={t("stSatiety", "Saciedade")} value={v.satiety} barColor={toneFor(v.satiety)} tag={satietyTag(v.satiety, t)} />
        <MiniMeter icon={<Smile />} color={EVO.douradoClaro} label={t("stMood", "Humor")} value={v.mood} barColor={toneFor(v.mood)} tag={moodTag(v.mood, t)} />
        <MiniMeter icon={<HeartPulse />} color={EVO.rosa} label={t("stVitality", "Vitalidade")} value={v.vitality} barColor={toneFor(v.vitality)} />
      </div>
      <Chamfer cut={9}>
        <div className={`${archivo.className} px-2 py-1.5 text-[11px] leading-snug`} style={{ color: EVO.branco }}>
          <span className="font-semibold uppercase" style={{ color: EVO.ambar }}>
            {t("stPersonality", "Personalidade")}:
          </span>{" "}
          <span className="font-semibold uppercase">{personalityLabel(c.personality, t)}</span>
          <div className="text-[10px]" style={{ color: EVO.mudo }}>
            {t("stTodayLine", "Condição de hoje: {c} ({n}/100). Ritmo: {p}.")
              .replace("{c}", conditionLabel(c.today.label, t))
              .replace("{n}", String(c.today.score))
              .replace("{p}", pace)}
          </div>
        </div>
      </Chamfer>
      <MiniPlate title={t("stMeals", "Refeições de hoje")}>
        <MealChips meals={c.meals} t={t} />
      </MiniPlate>
    </div>
  )
}

function BodyC({ life, t }: PageProps) {
  const c = life.character
  const b = c.body
  const h = c.health
  const hint = { normal: t("bodyNormal", "Normal"), slim: t("bodySlim", "Magro"), fat: t("bodyFat", "Gordo"), strong: t("bodyStrong", "Forte"), sergio: "Sergio", female: t("bodyFemale", "Feminina"), ekaterina: "Ekaterina", ...GOD_NAMES }[b.bodyHint]
  const dis = (s: "none" | "controlled" | "uncontrolled") =>
    s === "none" ? <MiniTag tone="bom">{t("disNone", "Não tem")}</MiniTag> : s === "controlled" ? <MiniTag>{t("disControlled", "Controlada")}</MiniTag> : <MiniTag tone="perigo">{t("disUncontrolled", "Sem remédio")}</MiniTag>
  const bar = (label: string, shown: string, value: number, max: number, color: string) => (
    <div className="min-w-0">
      <div className={`${archivo.className} flex justify-between gap-1 text-[10px] uppercase`} style={{ color: EVO.branco }}>
        <span className="truncate">{label}</span>
        <span className="font-semibold" style={{ color: EVO.douradoClaro }}>
          {shown}
        </span>
      </div>
      <Bar value={value} max={max} color={color} height={6} />
    </div>
  )
  return (
    <div className="flex flex-col gap-2">
      <MiniPlate title={t("stBody", "Corpo")}>
        <div className="grid grid-cols-2 gap-x-3">
          <MiniRow label={t("stWeight", "Peso")} value={`${b.weightKg.toFixed(1)} kg`} />
          <MiniRow label={t("stHeight", "Altura")} value={`${b.heightM.toFixed(2)} m`} />
          <MiniRow label={t("stBmi", "IMC")} value={b.bmi.toFixed(1)} tone={b.bmi >= 30 || b.bmi < 18.5 ? EVO.perigo : b.bmi >= 25 ? EVO.ambar : EVO.bom} />
          <MiniRow label={t("stFat", "Gordura corporal")} value={`${b.fatPct.toFixed(1)}%`} tone={b.fatPct >= 30 ? EVO.perigo : b.fatPct >= 22 ? EVO.ambar : EVO.bom} />
          <MiniRow label={t("stLean", "Massa magra")} value={`${b.leanKg.toFixed(1)} kg`} />
          <MiniRow label={t("stBodyHint", "Tipo físico")} value={hint} />
        </div>
      </MiniPlate>
      <MiniPlate title={t("stExams", "Exames")}>
        <div className="grid grid-cols-2 gap-x-3">
          <MiniRow label={t("stGlucose", "Glicemia")} value={`${h.glucose} mg/dL`} tone={h.glucose >= 180 ? EVO.perigo : h.glucose >= 126 ? EVO.ambar : EVO.bom} />
          <MiniRow label={t("stPressure", "Pressão")} value={`${h.systolic}/${h.diastolic}`} tone={h.systolic >= 150 ? EVO.perigo : h.systolic >= 130 ? EVO.ambar : EVO.bom} />
          <MiniRow label={t("stAwake", "Acordado há")} value={hoursText(h.awakeHours)} tone={h.awakeHours > 30 ? EVO.perigo : h.awakeHours > 18 ? EVO.ambar : undefined} />
          <MiniRow label={t("stDiet", "Qualidade da dieta")} value={`${h.diet > 0 ? "+" : ""}${r0(h.diet)}`} tone={h.diet < -30 ? EVO.perigo : h.diet < 0 ? EVO.ambar : EVO.bom} />
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-3">
          {bar(t("stCardiac", "Carga no coração"), `${r0(h.cardiac)}%`, h.cardiac, 100, toneFor(h.cardiac, "low"))}
          {bar(t("stToxicity", "Toxicidade"), String(r0(h.toxicity)), h.toxicity, 120, toneFor((h.toxicity / 120) * 100, "low"))}
        </div>
      </MiniPlate>
      <MiniPlate title={t("stDiseases", "Doenças")}>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              [<Droplet key="d" className="h-3.5 w-3.5" />, t("stDiabetes", "Diabetes"), h.diabetes, h.diabetesRisk],
              [<HeartPulse key="p" className="h-3.5 w-3.5" />, t("stHypertension", "Pressão alta"), h.hypertension, h.bpRisk],
            ] as const
          ).map(([icon, label, state, risk]) => (
            <div key={label} className="flex min-w-0 items-center gap-1.5">
              <Ring color={state === "uncontrolled" ? EVO.perigo : EVO.rosa} size={24}>
                {icon}
              </Ring>
              <div className="min-w-0 flex-1">
                <div className={`${archivo.className} truncate text-[11px] font-semibold uppercase`} style={{ color: EVO.branco }}>
                  {label}
                </div>
                <div className="flex items-center gap-1">
                  {dis(state)}
                  {state === "none" && (
                    <span className={`${archivo.className} truncate text-[10px]`} style={{ color: EVO.mudo }}>
                      {t("stRisk", "Risco: {n}%").replace("{n}", String(r0(risk)))}
                    </span>
                  )}
                </div>
                {state === "none" && (
                  <div className="mt-0.5">
                    <Bar value={risk} color={toneFor(risk, "low")} height={4} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </MiniPlate>
      <MiniPlate title={t("stVitality", "Vitalidade")}>
        <div className="flex items-center gap-2.5">
          <MiniGauge value={c.vitals.vitality} label={t("stVitalityUnit", "de 100")} size={60} color={toneFor(c.vitals.vitality)} />
          <p className={`${archivo.className} text-[10.5px] leading-snug`} style={{ color: EVO.mudo }}>
            {t("stVitalityText", "É o teto da saúde. Cada internação deixa uma sequela (−8) e um infarto, −20. Volta devagar com a saúde acima de 80. Internado com vitalidade 20 ou menos, ele não resiste.")}
          </p>
        </div>
      </MiniPlate>
    </div>
  )
}

/** Quantos efeitos cabem na placa do celular (o resto vira "+n"). */
const EFFECTS_MAX_C = 6

function AttributesC({ life, t }: PageProps) {
  const c = life.character
  const at = c.attributes
  const max = life.catalog.attributes?.max ?? 1000
  const useful = at.usefulToday
  // [ícone, cor, nome, valor, máximo da barra, piso, resumo, sufixo]
  const rows = [
    [<Brain key="i" />, EVO.azul, t("atIntelligence", "Inteligência"), at.intelligence, max, at.floors?.intelligence, t("atIntelligenceShort", "Sobe estudando (até 5 h/dia). Nunca cai abaixo de 90% do pico."), ""],
    [<Dumbbell key="f" />, EVO.perigo, t("atStrength", "Força"), at.strength, max, at.floors?.strength, t("atStrengthShort", "Sobe treinando (até 4 h/dia); suplementos aceleram. Sem treino cai até 60% do pico."), ""],
    [<Wind key="v" />, EVO.bom, t("atSpeed", "Velocidade"), at.speed, max, at.floors?.speed, t("atSpeedShort", "Sobe treinando. Sem treino cai até 60% do pico; voltar é mais rápido."), ""],
    [<Sprout key="r" />, EVO.rosa, t("atFertility", "Fertilidade"), at.fertility, 100, undefined, t("atFertilityText", "Cai com anabolizante, obesidade, estresse, doença e toxicidade."), "%"],
  ] as const
  const effects = c.effects.slice(0, EFFECTS_MAX_C)
  return (
    <div className="flex flex-col gap-2">
      <MiniPlate
        title={t("stAttributes", "Atributos")}
        aside={
          <span className={`${archivo.className} truncate text-[10px]`} style={{ color: EVO.mudo }}>
            {t("stAttrScale2", "De 0 a {max} · traço = piso").replace("{max}", String(max))}
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {rows.map(([icon, color, label, value, top, floor, text, unit]) => (
            <div key={label} className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={SM_ICON} style={{ color }}>
                  {icon}
                </span>
                <span className={`${archivo.className} truncate text-[10px] font-semibold uppercase`} style={{ color: EVO.branco }}>
                  {label}
                </span>
                <span className={`${teko.className} ml-auto text-[18px] font-bold leading-none`} style={{ color: EVO.branco }}>
                  {r0(value)}
                  {unit}
                </span>
              </div>
              <div className="my-1">
                <Bar value={value} max={top} mark={floor} color={color} height={6} />
              </div>
              <p className={`${archivo.className} text-[10px] leading-snug`} style={{ color: EVO.mudo }}>
                {text}
              </p>
            </div>
          ))}
        </div>
        {useful && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(["studying", "training"] as const).map((k) => (
              <MiniTag key={k} tone={useful[k].done >= useful[k].cap ? "mudo" : "ouro"}>
                {t("atUsefulToday", "{act} hoje: {done}/{cap} h úteis")
                  .replace("{act}", activityLabel(k, t))
                  .replace("{done}", String(Math.round(useful[k].done * 10) / 10))
                  .replace("{cap}", String(useful[k].cap))}
              </MiniTag>
            ))}
          </div>
        )}
      </MiniPlate>
      <MiniPlate
        title={t("stPersonality", "Personalidade")}
        aside={
          <span className={`${archivo.className} truncate text-[10px] font-semibold uppercase`} style={{ color: EVO.douradoClaro }}>
            {personalityLabel(c.personality, t)}
          </span>
        }
      >
        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
          {TRAITS.map((k) => (
            <div key={k} className="min-w-0">
              <div className={`${archivo.className} flex justify-between gap-1 text-[10px] uppercase`} style={{ color: EVO.branco }}>
                <span className="truncate">{traitName(k, t)}</span>
                <span className="font-semibold" style={{ color: EVO.douradoClaro }}>
                  {r0(c.personality[k] * 100)}
                </span>
              </div>
              <Bar value={c.personality[k] * 100} color={`linear-gradient(90deg, ${EVO.ritual}, ${EVO.magenta})`} height={4} />
            </div>
          ))}
        </div>
      </MiniPlate>
      <MiniPlate title={t("stEffects", "Efeitos no corpo")}>
        {effects.length === 0 ? (
          <p className={`${archivo.className} text-[11px]`} style={{ color: EVO.mudo }}>
            {t("stNoEffects", "Nenhum suplemento, remédio ou estimulante agindo agora.")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3">
            {effects.map((e) => (
              <MiniRow key={e.id} label={effectName(e.id, t)} value={t("stEffectLeft", "mais {h}").replace("{h}", hoursText(e.remainingH))} />
            ))}
            {c.effects.length > EFFECTS_MAX_C && (
              <span className={`${archivo.className} col-span-2 pt-0.5 text-[10px]`} style={{ color: EVO.mudo }}>
                {t("stMoreEffects", "+{n} efeitos").replace("{n}", String(c.effects.length - EFFECTS_MAX_C))}
              </span>
            )}
          </div>
        )}
      </MiniPlate>
    </div>
  )
}

function RoutineC({ life, t, act }: PageProps) {
  const c = life.character
  const a = c.activity
  const busy = act.busy || c.status !== "alive"
  // No celular escolhe-se a duração uma vez e depois a atividade (no
  // computador são 3 × 8 botões). Abaixo de 380 px os ícones saem para o nome caber.
  const [hours, setHours] = useState(4)
  // Treino e estudo só no prédio do centro (mm3d-37b): aqui só se marca trabalho.
  const kinds = [["working", <Briefcase key="w" className="hidden h-3.5 w-3.5 shrink-0 min-[380px]:block" />, t("actDoWork", "Trabalhar")]] as const
  const done = (["sleeping", "studying", "training", "working", "lying", "hospital"] as const).filter((k) => (c.today.hours[k] ?? 0) > 0.01)
  return (
    <div className="flex flex-col gap-2">
      <MiniPlate title={t("stMeals", "Refeições de hoje")}>
        <MealChips meals={c.meals} t={t} />
        <p className={`${archivo.className} mt-1.5 text-[11.5px] leading-snug`} style={{ color: EVO.mudo }}>
          {t("stMealsRuleFridge", "Coma de 2 h antes até 2 h depois de cada horário, pela geladeira da sua casa. Depois disso, ele vai perdendo saciedade, energia e saúde por 2 h.")}
        </p>
      </MiniPlate>
      <MiniPlate title={t("stHoursToday", "Horas de hoje")}>
        <div className="flex items-center gap-3">
          <MiniGauge value={c.today.score} label={conditionLabel(c.today.label, t)} color={c.today.score >= 60 ? EVO.bom : c.today.score >= 40 ? EVO.ambar : EVO.perigo} />
          {done.length ? (
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3">
              {done.map((k) => (
                <MiniRow key={k} label={activityLabel(k, t)} value={hoursText(c.today.hours[k])} />
              ))}
            </div>
          ) : (
            <p className={`${archivo.className} text-[11px]`} style={{ color: EVO.mudo }}>
              {t("stNoHoursYet", "Nada contado hoje ainda.")}
            </p>
          )}
        </div>
      </MiniPlate>
      <MiniPlate title={t("stDoNow", "O que ele faz agora")}>
        <Chamfer cut={9} border={MM.rubyBorder}>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Ring color={EVO.magenta} size={28}>
              <span className={SM_ICON}>{ACT_ICON[a.kind]}</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <div className={`${teko.className} truncate text-[18px] font-bold uppercase leading-none`} style={{ color: EVO.branco }}>
                {activityLabel(a.kind, t)}
              </div>
              <div className={`${archivo.className} line-clamp-2 text-[10.5px] leading-snug`} style={{ color: EVO.mudo }}>
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
              <MiniButton onClick={() => act.activity("idle")} disabled={busy} h={30}>
                {t("stStop", "Parar")}
              </MiniButton>
            )}
          </div>
        </Chamfer>
        <div className="mt-2 flex items-center gap-1">
          <span className={`${archivo.className} shrink-0 text-[10px] font-semibold uppercase`} style={{ color: EVO.mudo }}>
            {t("stForHours", "Por")}
          </span>
          {HOUR_CHOICES.map((h) => (
            <MiniButton key={h} onClick={() => setHours(h)} active={hours === h} h={28} tight className="min-w-0 flex-1">
              {h}h
            </MiniButton>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-1 gap-1.5">
          {kinds.map(([kind, icon, label]) => (
            <MiniButton key={kind} onClick={() => act.activity(kind, hours)} disabled={busy} active={a.kind === kind} tight className="min-w-0">
              {icon}
              <span className="truncate">{label}</span>
            </MiniButton>
          ))}
        </div>
        <p className={`${archivo.className} mt-1.5 text-[10px] leading-snug`} style={{ color: EVO.mudo }}>
          {t("stWhereShort", "Treinar: na academia do centro. Estudar: na biblioteca, na escola ou na universidade.")}
        </p>
        <p className={`${archivo.className} mt-1 text-[10px] leading-snug`} style={{ color: EVO.mudo }}>
          {t("stRoutineShort", "É uma rotina: rende nas primeiras horas do dia (estudo 5 h, treino 4 h), descansa, dorme às 23 h e volta às 7 h. Constância rende mais que maratona.")}
        </p>
      </MiniPlate>
    </div>
  )
}

function MarketC({ life, t, act }: PageProps) {
  const items = life.catalog.items
  const c = life.character
  const [tab, setTab] = useState<string>("mkHealthy")
  const [sel, setSel] = useState(0)
  const groupOf = (it: LifeItem) =>
    it.kind === "food" || it.kind === "drink"
      ? it.nutri >= 4
        ? "mkHealthy"
        : "mkJunk"
      : MARKET_GROUPS.find((g) => g[0] !== "mkHealthy" && g[0] !== "mkJunk" && g[2].includes(it.kind))?.[0]
  const busy = act.busy || c.status !== "alive"
  const group = MARKET_GROUPS.find(([key]) => key === tab) ?? MARKET_GROUPS[0]
  const list = items.filter((it) => groupOf(it) === group[0])
  const at = Math.min(sel, Math.max(0, list.length - 1))
  const it = list[at]
  const inFridge = it ? (life.fridge?.[it.id] ?? 0) : 0
  const poor = !!it && life.wallet.coins < it.price
  const fx = it ? effectsOf(it) : []
  return (
    <div className="flex flex-col gap-2">
      <div>
        <div className={`${teko.className} text-[18px] font-bold uppercase leading-none`} style={{ color: EVO.branco }}>
          {t("mkWallet", "Carteira")}: <span style={{ color: EVO.douradoClaro }}>{walletText(life, t)}</span>
          {act.openPolens && (
            <button type="button" onClick={act.openPolens} className={`${archivo.className} ml-2 align-middle text-[12px] font-semibold normal-case underline decoration-1 underline-offset-2`} style={{ color: MM.gold }}>
              {t("plBuyShort", "+ Poléns")}
            </button>
          )}
        </div>
        <p className={`${archivo.className} mt-0.5 text-[10px] leading-snug`} style={{ color: EVO.mudo }}>
          {t("mkHintFridge", "Tudo vai para a geladeira da sua casa — é lá que ele come. Saudável é caro, porcaria é barata.")}
        </p>
      </div>
      {/* abas só com ícone; o nome da aba aberta vira o título */}
      <div className="grid grid-cols-6 gap-1">
        {MARKET_GROUPS.map(([key, fallback, , icon]) => (
          <MiniButton
            key={key}
            onClick={() => {
              setTab(key)
              setSel(0)
            }}
            active={tab === key}
            h={32}
            label={t(key, fallback)}
            tight
          >
            <span className="flex [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
          </MiniButton>
        ))}
      </div>
      <div className={`${teko.className} flex items-center justify-between text-[16px] font-semibold uppercase leading-none tracking-wide`} style={{ color: EVO.ambar }}>
        {t(group[0], group[1])}
        <span className={SM_ICON}>{group[3]}</span>
      </div>
      {/* as comidas em cards: a MESMA prateleira da geladeira (fridge/shelf.tsx) */}
      <Arc
        count={list.length}
        sel={at}
        onSel={setSel}
        onPick={setSel}
        cardW={132}
        cardH={196}
        spacing={112}
        compact
        t={t}
        render={(i, active) => {
          const x = list[i]
          const n = life.fridge?.[x.id] ?? 0
          const main = effectsOf(x)[0]
          return (
            <Card active={active} empty={false} img={thumbOf(x.id)} badge={n ? `×${n}` : undefined} w={132} h={196} compact>
              <div className={`${teko.className} line-clamp-2 text-[15px] font-semibold uppercase leading-[0.95]`} style={{ color: EVO.branco }}>
                {itemName(x, t)}
              </div>
              {main && (
                <div className={`${teko.className} mt-0.5 text-[14px] leading-none`} style={{ color: toneColor(main.tone) }}>
                  {effectText(main, t)}
                </div>
              )}
              <div className={`${teko.className} mt-0.5 text-[15px] font-semibold leading-none`} style={{ color: EVO.douradoClaro }}>
                {t("stCoins", "{n} moedas").replace("{n}", String(x.price))}
              </div>
            </Card>
          )
        }}
      />
      {/* o escolhido: efeitos, o que já tem na geladeira e o Comprar */}
      {it && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`${archivo.className} min-w-0 truncate text-[12px] font-semibold`} style={{ color: EVO.branco }}>
              {itemName(it, t)}
            </span>
            <span className={`${archivo.className} shrink-0 text-[10px]`} style={{ color: inFridge ? EVO.douradoClaro : EVO.mudo }}>
              {t("mkInFridge", "{n} na geladeira").replace("{n}", String(inFridge))}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {fx.map((e) => (
              <span key={e.key} className={`${archivo.className} rounded-full px-2 py-[3px] text-[11px] font-semibold leading-none`} style={{ color: toneColor(e.tone), boxShadow: `inset 0 0 0 1px ${toneColor(e.tone)}55` }}>
                {effectText(e, t)}
              </span>
            ))}
          </div>
          <MiniButton onClick={() => act.buy(it.id)} disabled={busy || poor || !act.canBuy} primary={!poor && act.canBuy} h={40} className="w-full">
            {!act.canBuy ? t("mkAtMarket", "No supermercado · {n}").replace("{n}", String(it.price)) : poor ? t("mkNoCoins", "Moedas insuficientes") : t("mkBuyPrice", "Comprar · {n} moedas").replace("{n}", String(it.price))}
          </MiniButton>
        </div>
      )}
    </div>
  )
}

/** Quantos dias e eventos cabem no celular (o histórico real é longo). */
const DIARY_MAX_C = 3
const EVENTS_MAX_C = 8

function HistoryC({ life, t }: PageProps) {
  const items = new Map(life.catalog.items.map((i) => [i.id, i]))
  const off = life.catalog.clock.offsetMin
  return (
    <div className="flex flex-col gap-2">
      <MiniPlate title={t("stDiary", "Diário")}>
        {life.days.length === 0 && (
          <p className={`${archivo.className} text-[11px]`} style={{ color: EVO.mudo }}>
            {t("stNoEvents", "Nada aconteceu ainda.")}
          </p>
        )}
        {life.days.slice(0, DIARY_MAX_C).map((d) => (
          <div key={d.day} className="flex h-6 items-center gap-2 border-b" style={{ borderColor: EVO.linha }}>
            <span className={`${teko.className} w-11 shrink-0 text-[15px] font-semibold leading-none`} style={{ color: EVO.branco }}>
              {d.day.slice(8, 10)}/{d.day.slice(5, 7)}
            </span>
            <div className={`${archivo.className} min-w-0 flex-1 truncate text-[10px]`} style={{ color: EVO.mudo }}>
              {t("stDiaryLine", "Dormiu {s} · {m} refeições · perdeu {x}")
                .replace("{s}", hoursText(d.hours.sleeping ?? 0))
                .replace("{m}", String(d.mealsEaten))
                .replace("{x}", String(d.mealsMissed))}
            </div>
            <MiniTag tone={d.condition.score >= 60 ? "bom" : d.condition.score >= 40 ? "ouro" : "perigo"}>{conditionLabel(d.condition.label, t)}</MiniTag>
          </div>
        ))}
      </MiniPlate>
      <MiniPlate title={t("stTimeline", "Linha do tempo")}>
        {life.events.length === 0 && (
          <p className={`${archivo.className} text-[11px]`} style={{ color: EVO.mudo }}>
            {t("stNoEvents", "Nada aconteceu ainda.")}
          </p>
        )}
        {life.events.slice(0, EVENTS_MAX_C).map((e, i) => (
          <div key={`${e.at}-${i}`} className="flex items-center gap-2 border-b py-[3px]" style={{ borderColor: EVO.linha }}>
            <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center [&>svg]:h-3 [&>svg]:w-3" style={{ border: `1.5px solid ${EVO.perigo}`, color: EVO.perigo }}>
              {eventIcon(e.kind)}
            </span>
            <div className={`${archivo.className} line-clamp-2 min-w-0 flex-1 text-[11px] leading-[14px]`} style={{ color: EVO.branco }}>
              <span className="mr-1.5 text-[10px] font-semibold tabular-nums" style={{ color: EVO.douradoClaro }}>
                {timeOf(e.at, off)}
              </span>
              {eventText(e.kind, e.data, t, items)}
            </div>
          </div>
        ))}
      </MiniPlate>
    </div>
  )
}

export function StatusPage(props: PageProps) {
  // Celular: cada página é desenhada para caber na tela, sem rolagem.
  if (props.compact) {
    const P = { overview: OverviewC, body: BodyC, attributes: AttributesC, routine: RoutineC, market: MarketC, history: HistoryC }[props.page]
    return (
      <div className={`${archivo.className} flex h-full flex-col gap-2`}>
        <Header {...props} />
        <div className="min-h-0 flex-1">
          <P {...props} />
        </div>
      </div>
    )
  }
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
