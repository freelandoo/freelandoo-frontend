"use client"

// features/meu-mundo/ui/lab/cryo-stage.tsx — a CRIOGENIA do laboratório (pedido do Alex, 09/11).
//
// O palco do antigo vestuário (SkinStage, o mesmo do Hall da Fama): todos os personagens da
// pessoa, um por vez, com setas. Os da cápsula aparecem CONGELADOS (holograma de gelo) e
// têm "Descongelar": o ativo congela e o escolhido descongela na frente da pessoa (a linha
// sobe e o gelo vira o personagem). Daqui também:
//   • MISTURAR — dois adultos, ou um adulto e uma GENÉTICA comprada. RESULTADO FIXO (Alex,
//     09/11): o primeiro passa a personalidade e 20% de cada atributo dele; a pessoa escolhe
//     a espécie entre as dos dois. A tela mostra o resultado exato antes de confirmar. Os
//     dois somem; o filho nasce e aparece no palco;
//   • GENÉTICAS — a loja (metade do preço do embrião) e as que estão guardadas;
//   • CERTIDÃO — o documento de nascimento de quem está no palco.
// O fundo é provisório (o do vestuário); o Alex troca por um de gelo — só o arquivo CRYO_BG.
// Só apresentação: a conta é a da regra (characters/rules.ts MIX), conferida no servidor
// (MeuMundoCharacterService.fuse).

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Award, ChevronLeft, ChevronRight, Dna, FlaskConical, Loader2, Snowflake, X } from "lucide-react"
import { useLocale } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { getCharacters, postCharacterFuse, postCharacterGenetics, postCharacterUse } from "../../data"
import type { BodyId, CharacterGene, CharacterSummary, CharactersResult } from "../../types"
import { FUSION, mixInherit, mixSpecies, speciesBody } from "../../characters/rules"
import { speciesName } from "../../characters/names"
import { temperLabel, type Temper } from "../../soul"
import { SkinStage } from "../../engine/skin-stage"
import { PORTRAIT } from "../portraits"
import { EvoButton, EvoToast } from "../hud/hud-kit"
import { EVO, archivo, teko } from "../status/evo-skin"
import { MM } from "../hud/tokens"
import { CertificateDoc } from "../status/certificate-doc"
import { ICE } from "./lab-panel"

type Tr = (key: string, fallback: string) => string
export type CryoPanel = "mix" | "genes"

/** Fundo do palco: PROVISÓRIO (o do vestuário/Hall); o Alex manda um de gelo. */
const CRYO_BG = "/meu-mundo/skins/v1/coliseu.webp"
const CRYO_BG_SMALL = "/meu-mundo/skins/v1/coliseu-1024.webp"

const ATTRS = ["strength", "speed", "dexterity", "intelligence", "accuracy"] as const

/** Um lado da mistura: personagem ou genética guardada. */
type Side = { kind: "character"; c: CharacterSummary } | { kind: "gene"; g: CharacterGene }

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export default function CryoStage({ t, initial = null, onClose }: { t: Tr; initial?: CryoPanel | null; onClose: () => void }) {
  const locale = useLocale()
  const [data, setData] = useState<CharactersResult | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [panel, setPanel] = useState<CryoPanel | null>(initial)
  const [certOf, setCertOf] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<SkinStage | null>(null)
  /** O que o palco mostra agora (não refaz o personagem quando nada mudou). */
  const shown = useRef<{ id: string; holo: boolean } | null>(null)

  const say = useCallback((msg: string, ms = 3200) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), ms)
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    let alive = true
    void getCharacters(token).then((r) => {
      if (!alive) return
      if (r.ok) setData(r.data)
      else setFailed(r.error)
    })
    return () => {
      alive = false
    }
  }, [])

  // o palco (motor próprio; fechar descarta tudo)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const stage = new SkinStage(canvas, reduced)
    stageRef.current = stage
    return () => {
      stageRef.current = null
      shown.current = null
      stage.dispose()
    }
  }, [])

  // o ativo primeiro, depois os congelados
  const list = useMemo(() => {
    const all = (data?.characters.list ?? []).filter((c) => c.status === "alive" || c.status === "capsule")
    return [...all.filter((c) => c.status === "alive"), ...all.filter((c) => c.status === "capsule")]
  }, [data])
  const idx = Math.max(0, focus ? list.findIndex((c) => c.id === focus) : 0)
  const cur: CharacterSummary | undefined = list[idx]

  useEffect(() => {
    if (!cur) return
    const holo = cur.status === "capsule"
    if (shown.current && shown.current.id === cur.id && shown.current.holo === holo) return
    shown.current = { id: cur.id, holo }
    void stageRef.current?.show({ body: cur.body, holo, color: ICE.glow, accent: "#FFFFFF", look: "" }).catch(() => {})
  }, [cur])

  const go = useCallback(
    (d: number) => {
      if (!list.length) return
      setFocus(list[(idx + d + list.length) % list.length].id)
    },
    [list, idx]
  )
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (panel || certOf) {
        if (e.key === "Escape") {
          setPanel(null)
          setCertOf(null)
        }
        return
      }
      if (e.key === "ArrowLeft") go(-1)
      else if (e.key === "ArrowRight") go(1)
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [go, onClose, panel, certOf])

  /** Descongelar: o ativo congela, este descongela na frente da pessoa. */
  const thaw = async (c: CharacterSummary) => {
    const token = getToken()
    if (!token || busy) return
    setBusy(true)
    const r = await postCharacterUse(token, c.id)
    if (!r.ok) {
      setBusy(false)
      return say(r.error)
    }
    await stageRef.current?.materialize().catch(() => {})
    shown.current = { id: c.id, holo: false }
    setBusy(false)
    setData(r.data)
    setFocus(c.id)
    say(t("cryThawed", "Descongelado. O outro voltou para a cápsula."))
  }

  /** Depois da mistura: o filho aparece no palco (no gelo; se ele sai andando, o gelo vira ele). */
  const born = async (r: CharactersResult) => {
    const f = r.fused
    setPanel(null)
    setData(r)
    if (!f) return
    const kid = r.characters.list.find((c) => c.id === f.child)
    setFocus(f.child)
    if (kid) {
      shown.current = { id: kid.id, holo: true }
      await stageRef.current?.show({ body: kid.body, holo: true, color: ICE.glow, accent: "#FFFFFF", look: "" }).catch(() => {})
      if (kid.status === "alive") {
        await stageRef.current?.materialize().catch(() => {})
        shown.current = { id: kid.id, holo: false }
      }
    }
    say(t("cryBornFixed", "Nasceu: {s}!").replace("{s}", speciesName(f.species, t)), 5200)
  }

  const coins = data?.wallet?.coins ?? null
  const status = (c: CharacterSummary) =>
    c.status === "alive" ? t("cryActive", "Ativo · andando com você") : t("cryFrozen", "Congelado")

  return (
    <div className={`${archivo.className} fixed inset-0 z-[95] select-none overflow-hidden bg-black`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- arte local do jogo (admin) */}
      <img src={CRYO_BG} srcSet={`${CRYO_BG_SMALL} 1024w, ${CRYO_BG} 1672w`} sizes="100vw" alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      {/* a névoa de gelo por cima do fundo provisório */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,30,44,.55) 0%, rgba(11,30,44,.25) 45%, rgba(11,30,44,.75) 100%)" }} />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" style={{ cursor: "grab" }} aria-label={cur ? speciesName(cur.species, t) : t("cryTitle", "Criogenia")} />

      {/* topo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4" style={{ paddingTop: "max(14px, env(safe-area-inset-top))" }}>
        <div style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] max-[759px]:hidden" style={{ color: ICE.glow }}>
            {t("labTitle", "Laboratório de Criogenia")}
          </div>
          <h1 className={`${teko.className} flex items-center gap-2 whitespace-nowrap text-[46px] font-bold uppercase leading-none tracking-[0.08em] max-[759px]:text-[28px]`} style={{ color: ICE.frost }}>
            <Snowflake className="h-8 w-8 max-[759px]:h-5 max-[759px]:w-5" style={{ color: ICE.glow }} />
            {t("cryTitle", "Criogenia")}
          </h1>
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          <EvoButton size="sm" variant="ghost" icon={<FlaskConical className="h-4 w-4" />} disabled={!data || busy} onClick={() => setPanel("mix")}>
            {t("cryMix", "Misturar")}
          </EvoButton>
          <EvoButton size="sm" variant="ghost" icon={<Dna className="h-4 w-4" />} disabled={!data || busy} onClick={() => setPanel("genes")}>
            {t("cryGenes", "Genéticas")}
          </EvoButton>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-10 items-center gap-1.5 px-3 text-[13px] font-bold uppercase tracking-wide"
            style={{ background: MM.surface, border: `1px solid ${ICE.line}`, color: ICE.frost, boxShadow: MM.shadowSoft }}
          >
            <ArrowLeft className="h-4 w-4" /> {t("cryBack", "Voltar ao laboratório")}
          </button>
        </div>
      </div>

      {failed ? (
        <div className="absolute inset-0 grid place-items-center">
          <p className="p-5" style={{ background: MM.surface, color: EVO.perigo }}>
            {failed}
          </p>
        </div>
      ) : !data ? (
        <div className="absolute inset-0 grid place-items-center" style={{ color: ICE.frost }}>
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : (
        <>
          {list.length > 1 &&
            (["prev", "next"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => go(dir === "prev" ? -1 : 1)}
                aria-label={dir === "prev" ? t("cryPrev", "Anterior") : t("cryNext", "Próximo")}
                className={`absolute top-[42%] flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full max-[759px]:h-11 max-[759px]:w-11 ${dir === "prev" ? "left-3 sm:left-6" : "right-3 sm:right-6"}`}
                style={{ color: ICE.frost, background: MM.surface, border: `1px solid ${ICE.line}`, boxShadow: MM.shadow }}
              >
                {dir === "prev" ? <ChevronLeft className="h-7 w-7" /> : <ChevronRight className="h-7 w-7" />}
              </button>
            ))}

          {/* a placa de quem está no palco */}
          {cur && (
            <div className="absolute inset-x-0 bottom-0 flex justify-center px-3 pb-[max(14px,env(safe-area-inset-bottom))]">
              <div className="flex w-full max-w-[600px] flex-wrap items-center gap-3 p-4 max-[759px]:p-2.5" style={{ background: MM.surface, border: `1px solid ${cur.status === "capsule" ? ICE.line : MM.gold}`, boxShadow: MM.shadow }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: cur.status === "capsule" ? ICE.glow : MM.gold }}>
                    {cur.status === "capsule" && <Snowflake className="h-3.5 w-3.5" />}
                    {status(cur)}
                  </div>
                  <div className={`${teko.className} truncate text-[34px] font-bold uppercase leading-none max-[759px]:text-[24px]`} style={{ color: MM.text }}>
                    {cur.petName || speciesName(cur.species, t)}
                  </div>
                  <div className="mt-1 text-[12.5px]" style={{ color: MM.muted }}>
                    {[
                      speciesName(cur.species, t),
                      cur.sex === "f" ? t("chFemale", "fêmea") : t("chMale", "macho"),
                      cur.serialText,
                      cur.adult ? t("chAdult", "Adulto") : t("chYoung", "Jovem"),
                      cur.power != null ? t("chPower", "Poder {n}").replace("{n}", String(cur.power)) : null,
                      cur.mixCount ? t("cryMixCount", "{n} misturas").replace("{n}", String(cur.mixCount)) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {list.length > 1 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {list.map((c, i) => (
                        <button key={c.id} type="button" aria-label={String(i + 1)} onClick={() => setFocus(c.id)} className="block" style={{ width: i === idx ? 26 : 8, height: 8, borderRadius: 999, background: i === idx ? (c.status === "capsule" ? ICE.glow : MM.gold) : "rgba(243,239,230,0.35)" }} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <EvoButton size="sm" variant="ghost" icon={<Award className="h-4 w-4" />} onClick={() => setCertOf(cur.certCode)}>
                    {t("cryCert", "Certidão")}
                  </EvoButton>
                  {cur.status === "capsule" ? (
                    <EvoButton variant="gold" size="md" icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Snowflake className="h-4 w-4" />} disabled={busy} onClick={() => void thaw(cur)}>
                      {t("cryThaw", "Descongelar")}
                    </EvoButton>
                  ) : null}
                </div>
                {cur.status === "alive" && list.length > 1 && (
                  <p className="w-full text-[12px]" style={{ color: MM.muted }}>
                    {t("cryActiveHint", "Para descongelar outro, este volta para a cápsula: só um anda com você.")}
                  </p>
                )}
              </div>
            </div>
          )}
          {!cur && (
            <div className="absolute inset-0 grid place-items-center">
              <p className="p-5" style={{ background: MM.surface, color: MM.muted }}>
                {t("cryEmpty", "Nenhum personagem na cápsula.")}
              </p>
            </div>
          )}
        </>
      )}

      {data && panel === "mix" && <MixPanel t={t} data={data} busy={busy} setBusy={setBusy} say={say} onDone={born} onClose={() => setPanel(null)} onGenes={() => setPanel("genes")} />}
      {data && panel === "genes" && <GenesPanel t={t} data={data} coins={coins} locale={locale} busy={busy} setBusy={setBusy} say={say} onData={setData} onClose={() => setPanel(null)} onMix={() => setPanel("mix")} />}

      {certOf && (
        <div className="absolute inset-0 z-10 flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[max(16px,env(safe-area-inset-top))]" onClick={() => setCertOf(null)}>
          <div className="relative w-full max-w-[660px]" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setCertOf(null)} aria-label={t("chClose", "Fechar")} className="absolute -top-1 right-0 z-10 p-2" style={{ color: "#2B2117" }}>
              <X className="h-5 w-5" />
            </button>
            <CertificateDoc code={certOf} t={t} />
          </div>
        </div>
      )}

      {notice && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-20 flex justify-center px-4">
          <EvoToast>{notice}</EvoToast>
        </div>
      )}
    </div>
  )
}

// ─── painel de vidro gelado (mistura e genéticas) ─────────────────────────────
function IcePanel({ title, icon, onClose, children, t }: { title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode; t: Tr }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 p-3" onClick={onClose}>
      <div
        className="relative max-h-[92dvh] w-full max-w-[760px] overflow-y-auto p-4"
        style={{ background: `linear-gradient(180deg, ${ICE.panel}, ${ICE.deep})`, border: `1px solid ${ICE.line}`, borderRadius: MM.radius.card, boxShadow: "0 0 28px rgba(115,224,255,.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className={`${teko.className} flex items-center gap-2 text-[30px] uppercase tracking-[0.08em]`} style={{ color: ICE.frost }}>
            {icon}
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("chClose", "Fechar")} className="p-2" style={{ color: EVO.branco }}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const portraitOfSpecies = (species: string, sex: "m" | "f") => {
  const body = speciesBody(species, sex, "adult") as BodyId | null
  return (body && PORTRAIT[body]) || PORTRAIT.normal
}

function Pick({ img, title, sub, on, disabled, onClick, frozen }: { img: string; title: string; sub: string; on: boolean; disabled?: boolean; onClick: () => void; frozen?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-w-0 items-center gap-2.5 p-2 text-left disabled:opacity-40"
      style={{ background: on ? "rgba(115,224,255,.16)" : "rgba(0,0,0,.25)", border: `1px solid ${on ? ICE.glow : ICE.line}`, borderRadius: MM.radius.card }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" className="h-14 w-10 shrink-0 object-cover" style={{ borderRadius: 6, filter: frozen ? "saturate(.45) hue-rotate(160deg) brightness(1.1)" : undefined }} />
      <span className="min-w-0">
        <span className={`${teko.className} block truncate text-[19px] uppercase leading-none`} style={{ color: ICE.frost }}>
          {title}
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-snug" style={{ color: EVO.mudo }}>
          {sub}
        </span>
      </span>
    </button>
  )
}

function MixPanel({
  t,
  data,
  busy,
  setBusy,
  say,
  onDone,
  onClose,
  onGenes,
}: {
  t: Tr
  data: CharactersResult
  busy: boolean
  setBusy: (v: boolean) => void
  say: (m: string) => void
  onDone: (r: CharactersResult) => void
  onClose: () => void
  onGenes: () => void
}) {
  const chars = data.characters.list.filter((c) => c.status === "alive" || c.status === "capsule")
  const genes = data.characters.genetics ?? []
  const [a, setA] = useState<string | null>(null)
  const [b, setB] = useState<string | null>(null) // id de personagem ou "gene:<id>"
  const [pick, setPick] = useState<string | null>(null)
  const A = chars.find((c) => c.id === a) ?? null
  const B: Side | null = (() => {
    if (!b) return null
    if (b.startsWith("gene:")) {
      const g = genes.find((x) => `gene:${x.id}` === b)
      return g ? { kind: "gene", g } : null
    }
    const c = chars.find((x) => x.id === b)
    return c ? { kind: "character", c } : null
  })()
  const inheritK = data.characters.lab?.inherit ?? FUSION.INHERIT

  const temper = (x: string | null | undefined) => (x ? (temperLabel(x as Temper, t) ?? x) : "—")
  const charSub = (c: CharacterSummary) =>
    [speciesName(c.species, t), c.adult ? null : t("chYoung", "Jovem"), c.power != null ? t("chPower", "Poder {n}").replace("{n}", String(c.power)) : null, c.status === "alive" ? t("cryActiveShort", "ativo") : t("cryFrozenShort", "congelado")]
      .filter(Boolean)
      .join(" · ")
  const bSpecies = B ? (B.kind === "character" ? (B.c.species ?? "") : B.g.species) : ""
  const options = A && B ? mixSpecies(A.species, bSpecies) : []
  // a espécie: a escolhida, ou a única possível
  const species = options.length === 1 ? options[0] : pick && options.includes(pick) ? pick : null
  const inherit = A ? mixInherit(A.peaks) : null
  const activeInMix = !!A && (A.status === "alive" || (B?.kind === "character" && B.c.status === "alive"))
  const aName = A ? A.petName || speciesName(A.species, t) : ""

  const go = async () => {
    const token = getToken()
    if (!token || busy || !A || !B || !species) return
    setBusy(true)
    const r = await postCharacterFuse(token, A.id, B.kind === "gene" ? { gene: B.g.id } : { b: B.c.id }, species)
    setBusy(false)
    if (!r.ok) return say(r.error)
    onDone(r.data)
  }

  const attrName: Record<string, string> = {
    strength: t("atStrength", "Força"),
    speed: t("atSpeed", "Velocidade"),
    dexterity: t("attrDexterity", "Destreza"),
    intelligence: t("atIntelligence", "Inteligência"),
    accuracy: t("attrAccuracy", "Acurácia"),
  }

  return (
    <IcePanel t={t} title={t("cryMixTitle", "Misturar")} icon={<FlaskConical className="h-6 w-6" style={{ color: ICE.glow }} />} onClose={onClose}>
      <p className="mt-1 text-[13px]" style={{ color: EVO.mudo }}>
        {t("cryMixIntroFixed", "Dois adultos, ou um adulto e uma genética. O primeiro passa a personalidade e 20% de cada atributo dele; você escolhe a espécie do filho entre as dos dois. Sem sorteio: o que aparece aqui é o que nasce. Os dois somem.")}
      </p>

      <h3 className={`${teko.className} mt-3 text-[18px] uppercase tracking-[0.16em]`} style={{ color: ICE.glow }}>
        {t("cryMixFirstFixed", "1. O primeiro (personalidade e atributos)")}
      </h3>
      <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {chars.map((c) => (
          <Pick key={c.id} img={PORTRAIT[c.body] ?? PORTRAIT.normal} title={c.petName || speciesName(c.species, t)} sub={charSub(c)} on={a === c.id} disabled={!c.adult || b === c.id} frozen={c.status === "capsule"} onClick={() => setA(c.id)} />
        ))}
      </div>

      <h3 className={`${teko.className} mt-3 text-[18px] uppercase tracking-[0.16em]`} style={{ color: ICE.glow }}>
        {t("cryMixSecond", "2. Com quem")}
      </h3>
      <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {chars.map((c) => (
          <Pick key={c.id} img={PORTRAIT[c.body] ?? PORTRAIT.normal} title={c.petName || speciesName(c.species, t)} sub={charSub(c)} on={b === c.id} disabled={!c.adult || a === c.id} frozen={c.status === "capsule"} onClick={() => setB(c.id)} />
        ))}
        {genes.map((g) => (
          <Pick
            key={g.id}
            img={portraitOfSpecies(g.species, g.sex)}
            title={t("cdGeneOf", "Genética de {s}").replace("{s}", speciesName(g.species, t))}
            sub={g.sex === "f" ? t("chFemale", "fêmea") : t("chMale", "macho")}
            on={b === `gene:${g.id}`}
            frozen
            onClick={() => setB(`gene:${g.id}`)}
          />
        ))}
      </div>
      {genes.length === 0 && (
        <p className="mt-2 text-[12.5px]" style={{ color: EVO.mudo }}>
          {t("cryNoGenes", "Você não tem genética guardada.")}{" "}
          <button type="button" onClick={onGenes} className="font-semibold underline" style={{ color: ICE.glow }}>
            {t("cryBuyGenes", "Comprar genética")}
          </button>
        </p>
      )}

      {A && B && inherit && (
        <div className="mt-4 space-y-3 p-3" style={{ background: "rgba(0,0,0,.28)", border: `1px solid ${ICE.line}`, borderRadius: MM.radius.card }}>
          {/* a espécie do filho: escolha da pessoa */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: EVO.mudo }}>
              {t("cryMixSpecies", "3. A espécie do filho")}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {options.map((sp) => (
                <EvoButton key={sp} size="sm" variant={species === sp ? "gold" : "ghost"} onClick={() => setPick(sp)}>
                  {speciesName(sp, t)}
                </EvoButton>
              ))}
            </div>
          </div>
          {/* a personalidade */}
          <p className="text-[13px]" style={{ color: EVO.branco }}>
            {t("cryTemperFirst", "Personalidade: {p}, a de {s}.").replace("{p}", temper(A.temper)).replace("{s}", aName)}
          </p>
          {/* a herança */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: EVO.mudo }}>
              {t("cryInheritFirst", "Herança ({p} de cada atributo de {s})").replace("{p}", `${Math.round(inheritK * 100)}%`).replace("{s}", aName)}
            </div>
            <ul className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-[13px] sm:grid-cols-2">
              {ATTRS.map((k) => (
                <li key={k} className="flex justify-between gap-2" style={{ color: EVO.branco }}>
                  <span>{attrName[k]}</span>
                  <b>+{(Math.round((inherit[k] ?? 0) * 10) / 10).toLocaleString()}</b>
                </li>
              ))}
            </ul>
          </div>
          {species && (
            <p className={`${teko.className} text-[22px] uppercase leading-tight`} style={{ color: ICE.frost }}>
              {t("cryResult", "Nasce: {s}").replace("{s}", speciesName(species, t))}
            </p>
          )}
          <p className="text-[12.5px]" style={{ color: "#FFB4A8" }}>
            {activeInMix
              ? t("cryMixWarnActive", "Os dois somem (ficam no histórico). Quem anda com você congela na mistura e o filho sai andando.")
              : t("cryMixWarn", "Os dois somem (ficam no histórico). O filho nasce na cápsula, congelado.")}
          </p>
          <EvoButton variant="gold" size="md" icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} disabled={busy || !species} onClick={() => void go()}>
            {species ? t("cryMixGo", "Misturar agora") : t("cryPickSpecies", "Escolha a espécie")}
          </EvoButton>
        </div>
      )}
    </IcePanel>
  )
}

function GenesPanel({
  t,
  data,
  coins,
  locale,
  busy,
  setBusy,
  say,
  onData,
  onClose,
  onMix,
}: {
  t: Tr
  data: CharactersResult
  coins: number | null
  locale: string
  busy: boolean
  setBusy: (v: boolean) => void
  say: (m: string) => void
  onData: (r: CharactersResult) => void
  onClose: () => void
  onMix: () => void
}) {
  const [sex, setSex] = useState<"m" | "f">("m")
  const keyRef = useRef<{ what: string; key: string } | null>(null)
  const lab = data.characters.lab
  const genes = data.characters.genetics ?? []
  const slots = lab?.geneSlots ?? 10
  const full = genes.length >= slots
  const money = (n: number) => (n === 0 ? t("labFree", "Grátis") : t("labPrice", "{n} Esmeralda").replace("{n}", n.toLocaleString(locale)))

  const buy = async (species: string, sx: "m" | "f" | null) => {
    const token = getToken()
    if (!token || busy) return
    const what = `${species}:${sx ?? ""}`
    if (!keyRef.current || keyRef.current.what !== what) keyRef.current = { what, key: newKey() }
    setBusy(true)
    const r = await postCharacterGenetics(token, species, keyRef.current.key, sx ?? undefined)
    setBusy(false)
    if (!r.ok) return say(r.error)
    keyRef.current = null
    onData(r.data)
    say(t("cryGeneBought", "Genética guardada no congelador."))
  }

  return (
    <IcePanel t={t} title={t("cryGenesTitle", "Genéticas")} icon={<Dna className="h-6 w-6" style={{ color: ICE.glow }} />} onClose={onClose}>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[13px]" style={{ color: EVO.mudo }}>
        <span>{coins != null && t("labBalance", "Seu saldo: {n} Esmeralda").replace("{n}", coins.toLocaleString(locale))}</span>
        <span>{t("cryGeneSlots", "Guardadas: {n} de {max}").replace("{n}", String(genes.length)).replace("{max}", String(slots))}</span>
      </div>
      <p className="mt-2 text-[13px]" style={{ color: EVO.mudo }}>
        {t("cryGenesIntroFixed", "A genética fica no congelador até você misturar com um adulto. Ela entra só com a espécie: a personalidade e os atributos vêm do personagem escolhido primeiro.")}
      </p>

      {genes.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {genes.map((g) => (
            <span key={g.id} className="px-2 py-1 text-[12px]" style={{ background: "rgba(115,224,255,.12)", border: `1px solid ${ICE.line}`, color: ICE.frost, borderRadius: 6 }}>
              {speciesName(g.species, t)} · {g.sex === "f" ? t("chFemale", "fêmea") : t("chMale", "macho")}
            </span>
          ))}
          <EvoButton size="sm" icon={<FlaskConical className="h-4 w-4" />} onClick={onMix}>
            {t("cryMix", "Misturar")}
          </EvoButton>
        </div>
      )}
      {full && <p className="mt-2 text-[13px]" style={{ color: EVO.perigo }}>{t("cryGenesFull", "O congelador está cheio: use uma genética antes de comprar outra.")}</p>}

      <div className="mt-3 flex items-center gap-2 text-[13px]" style={{ color: EVO.branco }}>
        <span>{t("labSexFor", "Sexo (raposas e vampiros):")}</span>
        {(["m", "f"] as const).map((sx) => (
          <EvoButton key={sx} size="sm" variant={sex === sx ? "gold" : "ghost"} onClick={() => setSex(sx)}>
            {sx === "f" ? t("chFemale", "fêmea") : t("chMale", "macho")}
          </EvoButton>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(lab?.genes ?? []).map((g) => {
          const sx = g.sex ?? sex
          return (
            <div key={g.species} className="flex gap-3 p-2.5" style={{ background: "rgba(0,0,0,.25)", border: `1px solid ${ICE.line}`, borderRadius: MM.radius.card }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portraitOfSpecies(g.species, sx)} alt="" className="h-20 w-14 shrink-0 object-cover" style={{ borderRadius: 6, filter: "saturate(.45) hue-rotate(160deg) brightness(1.1)" }} />
              <div className="min-w-0 flex-1">
                <div className={`${teko.className} text-[20px] uppercase leading-none tracking-[0.06em]`} style={{ color: ICE.frost }}>
                  {speciesName(g.species, t)}
                </div>
                <div className="mt-1 text-[12px]" style={{ color: EVO.mudo }}>
                  {sx === "f" ? t("chFemale", "fêmea") : t("chMale", "macho")}
                </div>
                <div className="mt-0.5 text-[12px]" style={{ color: ICE.frost }}>
                  {money(g.price)}
                </div>
                <div className="mt-2">
                  <EvoButton size="sm" icon={<Dna className="h-4 w-4" />} disabled={busy || full || (coins != null && coins < g.price)} onClick={() => void buy(g.species, g.sex ? null : sex)}>
                    {t("labBuy", "Comprar")}
                  </EvoButton>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </IcePanel>
  )
}
