"use client"

// features/meu-mundo/ui/place/place-screen.tsx — um prédio do centro por
// dentro COM as ações (mm3d-37). A cena e o andar são do PlaceView; aqui
// mora o que cada ponto faz, sempre pedido à vida no servidor:
//  - treinar (academia) e estudar (universidade, biblioteca, escola): escolhe
//    as horas, a vida confere que a pessoa está no prédio e marca; sair do
//    aparelho ou do prédio para (fechar o jogo, não — a vida segue sozinha).
//  - pedir no balcão (pizzaria, hamburgueria): o cardápio do lugar; come na hora.
//  - pagar no caixa (supermercado): abre o Mercado do STATUS, comprando.
//  - rezar no banco da igreja (1–3 h): ajoelha em frente ao banco; o estresse
//    cai rápido e o humor sobe (vida).

import { useCallback, useEffect, useRef, useState } from "react"
import { BookOpen, Dumbbell, Sparkles, UtensilsCrossed } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { getLife, postLifeActivity, postLifeOrder } from "../../data"
import { POSE_OF_ANIM, type PlacePose } from "../../engine/avatars"
import type { PlaceState } from "../../engine/place-game"
import type { BodyId, InteriorDef, LifeItem, PlaceUse } from "../../types"
import { effectsOf } from "../fridge/fridge-logic"
import { effectText, toneColor } from "../fridge/shelf"
import { itemName } from "../status/status-pages"
import { EvoButton, EvoDialog, EvoToast } from "../hud/hud-kit"
import { PlaceView } from "../place-view"

/** Hora de aula (moedas do jogo) — espelho de PLACE_RULES em meuMundoLife.js. */
const CLASS_FEE_H: Record<string, number> = { universidade: 8 }
/** Rendimento do estudo no lugar — espelho de PLACE_RULES em meuMundoLife.js. */
const STUDY_MUL: Record<string, number> = { universidade: 1.5 }
const HOURS = [1, 2, 4, 8] as const
const PRAY_HOURS = [1, 2, 3] as const

type Tr = (key: string, fallback: string) => string

export interface PlaceScreenProps {
  placeId: string
  placeName: string
  interior: InteriorDef
  body: BodyId
  look?: string
  onExit: () => void
  /** O caixa do supermercado (mm3d-37c): o Mercado do STATUS, comprando. */
  onOpenMarket?: () => void
}

/** O que está em andamento aqui dentro (null = nada). */
interface Doing {
  kind: "training" | "studying" | "praying"
  hours: number
}

function doingText(kind: Doing["kind"], hours: number, t: Tr) {
  const k = kind === "training" ? t("pvTrainingFor", "Treinando por {h} h") : kind === "praying" ? t("pvPrayingFor", "Rezando por {h} h") : t("pvStudyingFor", "Estudando por {h} h")
  return k.replace("{h}", String(hours))
}

export function PlaceScreen({ placeId, placeName, interior, body, look = "", onExit, onOpenMarket }: PlaceScreenProps) {
  const t = useTranslations("MeuMundo") as Tr
  const [ask, setAsk] = useState<{ use: PlaceUse; state: PlaceState } | null>(null)
  const [doing, setDoing] = useState<Doing | null>(null)
  const [pose, setPose] = useState<PlacePose | null>(null)
  const [poseAt, setPoseAt] = useState<{ x: number; z: number; facing: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone: "ouro" | "magenta" } | null>(null)
  const doingRef = useRef<Doing | null>(null)
  // Cardápio do balcão (mm3d-37c): itens do lugar e as moedas (null = buscando).
  const [menu, setMenu] = useState<{ items: LifeItem[]; coins: number } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    doingRef.current = doing
  }, [doing])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(id)
  }, [toast])

  /** Para a atividade (saiu do aparelho ou do prédio). */
  const stop = useCallback(() => {
    if (!doingRef.current) return
    doingRef.current = null
    setDoing(null)
    setPose(null)
    setPoseAt(null)
    const token = getToken()
    if (token) void postLifeActivity(token, "idle")
  }, [])

  const start = async (hours: number) => {
    if (!ask) return
    const kind = ask.use === "train" ? "training" : ask.use === "pray" ? "praying" : "studying"
    const token = getToken()
    if (!token) return
    setBusy(true)
    const r = await postLifeActivity(token, kind, hours, placeId)
    setBusy(false)
    setAsk(null)
    if (!r.ok) {
      setToast({ text: r.error || t("pvFail", "Não deu certo agora. Tente de novo."), tone: "magenta" })
      return
    }
    const d = { kind, hours } as Doing
    doingRef.current = d
    setDoing(d)
    // Treino: o movimento do aparelho; estudo: sentado (a pose da cadeira);
    // reza: ajoelhado no vão em frente ao banco, olhando para o altar.
    const anim = ask.state.kind === "spot" ? ask.state.spot.anim : null
    if (kind === "praying" && ask.state.kind === "seat") {
      setPoseAt({ x: ask.state.seat.stand.x, z: ask.state.seat.stand.z, facing: ask.state.seat.facing })
      setPose("Pray")
    } else setPose(kind === "training" && anim ? (POSE_OF_ANIM[anim] ?? null) : null)
    setToast({ text: doingText(kind, hours, t), tone: "ouro" })
  }

  const openMenu = async () => {
    setMenuOpen(true)
    const token = getToken()
    if (!token) return
    const r = await getLife(token)
    if (!r.ok) {
      setMenuOpen(false)
      setToast({ text: r.error || t("pvFail", "Não deu certo agora. Tente de novo."), tone: "magenta" })
      return
    }
    const ids = r.data.catalog.menus?.[placeId] ?? []
    const items = ids.map((id) => r.data.catalog.items.find((it) => it.id === id)).filter((it): it is LifeItem => !!it)
    setMenu({ items, coins: r.data.wallet.coins })
  }

  const order = async (it: LifeItem) => {
    const token = getToken()
    if (!token) return
    setBusy(true)
    const r = await postLifeOrder(token, placeId, it.id)
    setBusy(false)
    if (!r.ok) {
      setToast({ text: r.error || t("pvFail", "Não deu certo agora. Tente de novo."), tone: "magenta" })
      return
    }
    setMenu((m) => (m ? { ...m, coins: r.data.wallet.coins } : m))
    setMenuOpen(false)
    setToast({ text: t("pvAte", "Comeu: {item}").replace("{item}", itemName(it, t)), tone: "ouro" })
  }

  const onUse = (use: PlaceUse, state: PlaceState) => {
    if (use === "train" || use === "study" || use === "pray") {
      if (doingRef.current) return
      setAsk({ use, state })
      return
    }
    if (use === "order") return void openMenu()
    if (use === "market" && onOpenMarket) return onOpenMarket()
    setToast({ text: t("pvSoon", "Em breve"), tone: "ouro" })
  }

  const onState = (s: PlaceState) => {
    // Levantou / saiu do aparelho: a atividade para.
    if (s.kind === "free") stop()
  }

  const leave = () => {
    stop()
    onExit()
  }

  const fee = CLASS_FEE_H[placeId] ?? 0
  const training = ask?.use === "train"
  const praying = ask?.use === "pray"

  return (
    <>
      <PlaceView
        interior={interior}
        body={body}
        look={look}
        mode="visit"
        placeName={placeName}
        onExit={leave}
        onUse={onUse}
        onState={onState}
        pose={pose}
        poseAt={poseAt}
        blocked={!!ask || menuOpen}
        hideUse={!!doing}
        extra={
          doing ? (
            <EvoToast icon={doing.kind === "training" ? <Dumbbell className="h-4 w-4" /> : doing.kind === "praying" ? <Sparkles className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}>
              {doingText(doing.kind, doing.hours, t)}
            </EvoToast>
          ) : null
        }
      />
      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-6 z-[75] -translate-x-1/2">
          <EvoToast tone={toast.tone}>{toast.text}</EvoToast>
        </div>
      )}
      {menuOpen && (
        <div className="fixed inset-0 z-[76]">
          <EvoDialog
            labelId="mm-place-menu"
            eyebrow={placeName}
            title={t("pvMenuTitle", "Cardápio")}
            onClose={() => setMenuOpen(false)}
          >
            {!menu ? (
              <p>{t("pvMenuLoading", "Abrindo o cardápio…")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] opacity-80">{t("pvMenuCoins", "Suas moedas: {n}. Ele come aqui mesmo — vale a refeição.").replace("{n}", String(Math.floor(menu.coins)))}</p>
                {menu.items.map((it) => {
                  const poor = menu.coins < it.price
                  return (
                    <div key={it.id} className="flex items-center gap-3 border-b py-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      <UtensilsCrossed className="h-5 w-5 shrink-0 opacity-70" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{itemName(it, t)}</div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[12px]">
                          {effectsOf(it).slice(0, 3).map((e) => (
                            <span key={e.key} style={{ color: toneColor(e.tone) }}>
                              {effectText(e, t)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <EvoButton variant={poor ? "ghost" : "gold"} size="sm" loading={busy} onClick={() => !poor && void order(it)}>
                        {poor ? t("mkNoCoins", "Moedas insuficientes") : t("pvOrderPrice", "Pedir · {n}").replace("{n}", String(it.price))}
                      </EvoButton>
                    </div>
                  )
                })}
              </div>
            )}
          </EvoDialog>
        </div>
      )}
      {ask && (
        <div className="fixed inset-0 z-[76]">
          <EvoDialog
            labelId="mm-place-hours"
            eyebrow={placeName}
            title={training ? t("pvTrainTitle", "Treinar quanto tempo?") : praying ? t("pvPrayTitle", "Rezar quanto tempo?") : t("pvStudyTitle", "Estudar quanto tempo?")}
            onClose={() => setAsk(null)}
            footer={(praying ? PRAY_HOURS : HOURS).map((h) => (
              <EvoButton key={h} variant="gold" loading={busy} onClick={() => void start(h)}>
                {`${h} h${fee ? ` · ${fee * h}` : ""}`}
              </EvoButton>
            ))}
          >
            <p>
              {training
                ? t("pvTrainText", "Força e velocidade sobem nas primeiras 4 h do dia. Ele continua mesmo com o jogo fechado; sair do aparelho para.")
                : praying
                  ? t("pvPrayText", "Rezando, o estresse cai rápido e o humor sobe. Levantar para.")
                  : t("pvStudyText", "A inteligência sobe nas primeiras 5 h do dia. Ele continua mesmo com o jogo fechado; levantar para.")}
            </p>
            {!training && !praying && (STUDY_MUL[placeId] ?? 1) > 1 && (
              <p className="mt-2">
                {t("pvUniText", "Na universidade rende 1,5× — a hora de aula custa {c} moedas.").replace("{c}", String(fee))}
              </p>
            )}
          </EvoDialog>
        </div>
      )}
    </>
  )
}
