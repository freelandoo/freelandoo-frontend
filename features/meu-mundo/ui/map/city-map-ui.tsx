"use client"

// features/meu-mundo/ui/map/city-map-ui.tsx — RADAR + MAPA DA CIDADE (mm3d-60r).
//
// Pedido do Alex (com referências de jogo e de mapa do tesouro): no canto de
// cima à direita um radar redondo — o pedaço da cidade em volta de mim, norte
// para cima, eu no meio como uma seta — e, ao tocar nele, um modal com o mapa
// inteiro em pergaminho: ruas, prédios com ícone e nome e "você está aqui".
// O modelo vem da cena aberta (engine/city-map.ts); a posição é lida ~8×/s só
// enquanto o radar/modal está na tela (nada por quadro, nada pela rede).

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react"
import {
  Snowflake,
  BookOpen,
  Car,
  Church,
  DoorOpen,
  Dumbbell,
  Flag,
  GraduationCap,
  Hammer,
  Home,
  Hospital,
  Landmark,
  MapPin,
  Moon,
  Paintbrush,
  Pizza,
  Rocket,
  Sandwich,
  School,
  Shield,
  ShoppingCart,
  Siren,
  Swords,
  Trophy,
  X,
  type LucideProps,
} from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { mapPos, onCityMap, type CityMapModel, type MapPos } from "../../engine/city-map"
import { useDrawerOpen } from "../hud/hud-kit"
import { useGameCovered } from "../hud/game-cover"
import { SteamFrame } from "../kit/steam/steam-frame"
import { archivo, cinzel } from "../status/evo-skin"
import { burnEdges, compass, drawMap, toScreen, type MapView } from "./draw-map"
import st from "./city-map.module.css"

const ICONS: Record<string, ComponentType<LucideProps>> = {
  pizza: Pizza,
  burger: Sandwich,
  cart: ShoppingCart,
  grad: GraduationCap,
  book: BookOpen,
  school: School,
  gym: Dumbbell,
  hammer: Hammer,
  shield: Shield,
  snow: Snowflake,
  rocket: Rocket,
  paint: Paintbrush,
  car: Car,
  moon: Moon,
  fist: Swords,
  flag: Flag,
  swords: Swords,
  trophy: Trophy,
  church: Church,
  siren: Siren,
  hospital: Hospital,
  home: Home,
  statue: Landmark,
  portal: DoorOpen,
  pin: MapPin,
}

/** Metros do centro até a borda do radar. */
const RADAR_M = 40
const TICK_MS = 125

function useModel() {
  const [m, setM] = useState<CityMapModel | null>(null)
  useEffect(() => onCityMap(setM), [])
  return m
}

/** Lê a posição enquanto `on` (aba visível), ~8×/s. */
function usePos(on: boolean) {
  const [p, setP] = useState<MapPos | null>(null)
  useEffect(() => {
    if (!on) return
    const read = () => {
      if (document.hidden) return
      const q = mapPos()
      setP((o) => (q && o && Math.abs(o.x - q.x) < 0.05 && Math.abs(o.z - q.z) < 0.05 && Math.abs(o.facing - q.facing) < 0.02 ? o : q))
    }
    read()
    const id = setInterval(read, TICK_MS)
    return () => clearInterval(id)
  }, [on])
  return p
}

function radarSize() {
  if (typeof window === "undefined") return 120
  return Math.round(Math.max(88, Math.min(136, window.innerWidth * 0.1, window.innerHeight * 0.17)))
}

export function CityMapHud({ hidden = false }: { hidden?: boolean }) {
  const t = useTranslations("MeuMundo")
  const model = useModel()
  const drawerOpen = useDrawerOpen()
  const covered = useGameCovered()
  const [open, setOpen] = useState(false)
  const [size, setSize] = useState(120)
  const show = !!model && !hidden && !drawerOpen && !covered
  const pos = usePos(show || open)
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const on = () => setSize(radarSize())
    on()
    window.addEventListener("resize", on)
    return () => window.removeEventListener("resize", on)
  }, [])
  // a missão mora logo abaixo do radar (apresentação 12): ele diz a altura que ocupa
  useEffect(() => {
    const el = document.documentElement
    if (show) el.style.setProperty("--mm-radar-h", `${size + 8}px`)
    else el.style.removeProperty("--mm-radar-h")
    return () => {
      el.style.removeProperty("--mm-radar-h")
    }
  }, [show, size])
  // fechou a cena (casa, luta): o modal fecha junto
  useEffect(() => {
    if (!model) setOpen(false)
  }, [model])

  // radar: redesenha só quando a posição muda
  useEffect(() => {
    const cv = ref.current
    if (!cv || !model || !show) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = Math.round(size * dpr)
    if (cv.width !== W) cv.width = cv.height = W
    const g = cv.getContext("2d")
    if (!g) return
    const p = pos ?? { x: 0, z: 0, facing: 0 }
    const v: MapView = { cx: p.x, cz: p.z, s: W / 2 / RADAR_M, w: W, h: W }
    g.clearRect(0, 0, W, W)
    g.save()
    g.beginPath()
    g.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2)
    g.clip()
    drawMap(g, model, v)
    // pontos dos lugares
    for (const pin of model.pins) {
      const [x, y] = toScreen(v, pin.x, pin.z)
      if (Math.hypot(x - W / 2, y - W / 2) > W / 2 - 4 * dpr) continue
      g.fillStyle = pin.id === "home" ? "#b8352a" : "#3b230e"
      g.beginPath()
      g.arc(x, y, 3.2 * dpr, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = "#f6e6bd"
      g.lineWidth = 1.2 * dpr
      g.stroke()
    }
    // vinheta interna (vidro do instrumento)
    const gr = g.createRadialGradient(W / 2, W / 2, W * 0.3, W / 2, W / 2, W / 2)
    gr.addColorStop(0, "rgba(0,0,0,0)")
    gr.addColorStop(1, "rgba(40,22,5,0.45)")
    g.fillStyle = gr
    g.fillRect(0, 0, W, W)
    g.restore()
    // eu: seta no meio, apontando para o rumo (0 = norte = para cima)
    if (pos) {
      g.save()
      g.translate(W / 2, W / 2)
      g.rotate(p.facing)
      const a = 7 * dpr
      g.beginPath()
      g.moveTo(0, -a * 1.4)
      g.lineTo(a, a)
      g.lineTo(0, a * 0.45)
      g.lineTo(-a, a)
      g.closePath()
      g.fillStyle = "#20d9e9"
      g.fill()
      g.lineWidth = 1.6 * dpr
      g.strokeStyle = "#061014"
      g.stroke()
      g.restore()
    }
  }, [model, pos, show, size])

  if (!model) return null
  return (
    <>
      {show && (
        <button
          type="button"
          className={st.radar}
          style={{ width: size, height: size }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(true)}
          aria-label={t("mapOpen", "Abrir o mapa")}
        >
          <canvas ref={ref} className={st.radarCanvas} aria-hidden />
          <span className={`${cinzel.className} ${st.north}`} aria-hidden>
            N
          </span>
        </button>
      )}
      {open && <CityMapModal model={model} pos={pos} onClose={() => setOpen(false)} />}
    </>
  )
}

function CityMapModal({ model, pos, onClose }: { model: CityMapModel; pos: MapPos | null; onClose: () => void }) {
  const t = useTranslations("MeuMundo")
  const ref = useRef<HTMLCanvasElement | null>(null)
  const box = useRef<HTMLDivElement | null>(null)
  const [px, setPx] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // o papel ocupa o quadrado que couber
  useEffect(() => {
    const el = box.current
    if (!el) return
    const read = () => setPx(Math.floor(Math.min(el.clientWidth, el.clientHeight)))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { x0, x1, z0, z1 } = model.bounds
  const span = Math.max(x1 - x0, z1 - z0)
  const view = useCallback((W: number): MapView => ({ cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, s: (W * 0.94) / span, w: W, h: W }), [x0, x1, z0, z1, span])

  // o papel (estático): desenha uma vez por tamanho
  useEffect(() => {
    const cv = ref.current
    if (!cv || !px) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = Math.round(px * dpr)
    cv.width = cv.height = W
    const g = cv.getContext("2d")
    if (!g) return
    drawMap(g, model, view(W))
    burnEdges(g, W, W)
    compass(g, W * 0.9, W * 0.12, W * 0.055)
  }, [model, px, view])

  const v = px ? view(px) : null
  const at = (x: number, z: number) => (v ? toScreen(v, x, z) : [0, 0])
  const [mx, my] = pos ? at(pos.x, pos.z) : [0, 0]
  const title = model.kind === "centro" ? t("mapTitleCenter", "Mapa do Centro") : t("mapTitleBairro", "Mapa do Bairro")

  return (
    <div
      className={st.scrim}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={st.dialog}>
        <SteamFrame className="h-full min-h-0" cornerSize={44}>
          <div className="relative flex h-full min-h-0 flex-col">
            <header className="flex items-center gap-3 px-4 pb-2 pt-3">
              <h2 className={`${cinzel.className} flex-1 text-[20px] font-bold uppercase tracking-[0.08em]`} style={{ color: "#FFD68A", textShadow: "0 2px 0 #000" }}>
                {title}
              </h2>
              <button type="button" onClick={onClose} className={st.close} aria-label={t("close", "Fechar")}>
                <X className="h-5 w-5" />
              </button>
            </header>
            <div ref={box} className="relative mx-3 mb-3 flex min-h-0 flex-1 items-center justify-center">
              <div className={st.paper} style={{ width: px, height: px }}>
                <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />
                {v &&
                  model.pins.map((p) => {
                    const [x, y] = at(p.x, p.z)
                    const Icon = ICONS[p.icon] ?? MapPin
                    return (
                      <div key={p.id} className={st.pin} style={{ left: x, top: y }}>
                        <span className={st.pinBadge} data-home={p.id === "home" ? "" : undefined}>
                          <Icon className="h-[60%] w-[60%]" strokeWidth={2.2} />
                        </span>
                        <span className={`${archivo.className} ${st.pinLabel}`}>{p.label}</span>
                      </div>
                    )
                  })}
                {v && pos && (
                  <div className={st.me} style={{ left: mx, top: my }}>
                    <span className={st.mePulse} aria-hidden />
                    <span className={st.meArrow} style={{ transform: `translate(-50%, -50%) rotate(${pos.facing}rad)` }} aria-hidden />
                    <span className={`${archivo.className} ${st.meLabel}`}>{t("mapYouAreHere", "Você está aqui")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SteamFrame>
      </div>
    </div>
  )
}
