"use client"

// Editor de criação unificado (Post · Bee · Story) — pele Freelandoo Tabloide.
// Fluxo: Pick → Crop/Zoom → Editar (Filtro·Texto·Sobreposição·Música) → Detalhes → Publicar.
// Visual queimado via ComposerRenderer (mesmo shader da câmera) + StoryRecorder.
//
// Carrossel (mode "post", só imagens): o estado de mídia vira um array `slides`,
// cada slide com seu próprio crop/filtro/texto/sobreposição. O aspecto é
// compartilhado por todos os slides (padrão Instagram). Vídeo permanece sempre
// como mídia única (sem carrossel). Na publicação, compõe cada slide e sobe N
// mídias no MESMO item de portfólio (sort_order = índice) — o feed já renderiza
// o carrossel (PostMedia) e o backend já agrega as mídias por sort_order.

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ImagePlus, Loader2,
  Minimize2, Music, Plus, SlidersHorizontal, Type, Layers, Video, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getToken } from "@/lib/auth"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { CameraStudio } from "@/components/camera/CameraStudio"
import { PRESETS, DEFAULT_PRESET_ID, getPreset } from "@/lib/camera/presets"
import { uploadStory } from "@/lib/camera/upload"
import { detectCapabilities } from "@/lib/camera/capabilities"
import type { FilterState, FilterMeta } from "@/lib/camera/types"
import { ComposerRenderer } from "@/lib/composer/renderer"
import { compose } from "@/lib/composer/compose"
import { drawTextLayers, layerBox } from "@/lib/composer/text-layer"
import {
  ASPECTS, NEUTRAL_CROP, TEXT_COLORS, TEXT_FONTS,
  type ComposedResult, type ComposerProps, type CropState, type MediaDraft, type MediaKind,
  type TextLayer, type TextFontId, type TextBoxStyle, type OverlayLayer,
  type AudioPick,
} from "@/lib/composer/types"
import { ProfileSelect, type ProfileLite } from "./ProfileSelect"
import { AudioPicker } from "./AudioPicker"
import { OversizeModal } from "@/components/media/oversize-modal"
import { UPLOAD_LIMITS } from "@/lib/media/upload-limits"

type Step = "pick" | "crop" | "edit" | "details" | "publish"
type EditTab = "filtro" | "texto" | "sobreposicao" | "musica"

const MAX_BYTES = 80 * 1024 * 1024
const MAX_TITLE = 120
const MAX_DESC = 500
const MAX_CAPTION = 280
const SERVERLESS_UPLOAD_LIMIT = 4 * 1024 * 1024
const MAX_SLIDES = 10
const EMPTY_LAYERS: TextLayer[] = []

/** Um slide do composer: a mídia + seu estado de edição próprio. */
type Slide = {
  id: string
  draft: MediaDraft
  crop: CropState
  presetId: string
  filter: FilterState
  textLayers: TextLayer[]
  overlay: OverlayLayer | null // descritor; o elemento vivo é carregado quando ativo
}

/** Proporções permitidas por modo. */
function aspectsFor(mode: ComposerProps["mode"]): string[] {
  return mode === "post" ? ["4:5", "1:1", "16:9"] : ["9:16"]
}

/** Lê dimensões naturais de uma imagem a partir de um object URL. */
function readImageDim(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => reject(new Error("read-image"))
    img.src = url
  })
}

/** Carrega o elemento (img/vídeo) de uma sobreposição. Usado na publicação para
 *  queimar a overlay de slides não-ativos (cujo elemento não está em memória). */
async function loadOverlayEl(desc: OverlayLayer | null): Promise<HTMLImageElement | HTMLVideoElement | null> {
  if (!desc) return null
  if (desc.kind === "image") {
    return new Promise((res) => {
      const im = new Image()
      im.crossOrigin = "anonymous"
      im.onload = () => res(im)
      im.onerror = () => res(null)
      im.src = desc.url
    })
  }
  const v = document.createElement("video")
  v.src = desc.url; v.muted = true; v.loop = true; v.playsInline = true; v.crossOrigin = "anonymous"
  await new Promise<void>((res) => { v.onloadeddata = () => res(); v.onerror = () => res() })
  await v.play().catch(() => {})
  return v
}

/** Link estilizado anexado a um bee (máx 3 — validado no cliente e no backend). */
type BeeComposerLink = { label: string; url: string; style: "gold" | "paper" | "ink" }
const MAX_BEE_LINKS = 3

/** Desenha uma sobreposição PiP no canvas (mesma matemática do preview e export). */
function paintOverlay(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  desc: OverlayLayer | null, el: HTMLImageElement | HTMLVideoElement | null,
) {
  if (!desc || !el) return
  const natW = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth
  const natH = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight
  if (!natW || !natH) return
  const w = desc.scale * W
  const h = w * (natH / natW)
  const x = desc.x * W - w / 2
  const y = desc.y * H - h / 2
  try {
    ctx.save()
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = w * 0.06; ctx.shadowOffsetY = w * 0.03
    ctx.drawImage(el, x, y, w, h)
    ctx.restore()
    ctx.lineWidth = Math.max(2, w * 0.02)
    ctx.strokeStyle = "#F2B705"
    ctx.strokeRect(x, y, w, h)
  } catch { /* frame não decodável ainda */ }
}

export function MediaComposer({ open, mode, initialProfileId = null, communityId = null, academyId = null, onClose, onPosted }: ComposerProps) {
  const t = useTranslations("Composer")
  const router = useRouter()
  const { user, status } = useAuth()

  const [step, setStep] = useState<Step>("pick")
  const [editTab, setEditTab] = useState<EditTab>("filtro")
  const [slides, setSlides] = useState<Slide[]>([])
  const [active, setActive] = useState(0)
  const [activeTextId, setActiveTextId] = useState<string | null>(null)
  const [audioPick, setAudioPick] = useState<AudioPick | null>(null)

  const [profiles, setProfiles] = useState<ProfileLite[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [caption, setCaption] = useState("")
  // Bee (story): localização livre + até 3 links estilizados.
  const [beeLocation, setBeeLocation] = useState("")
  const [beeLinks, setBeeLinks] = useState<BeeComposerLink[]>([])

  const [progress, setProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oversize, setOversize] = useState(false)
  const [videoNotice, setVideoNotice] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)

  const fileRef = useRef<HTMLInputElement | null>(null)
  const addImagesRef = useRef<HTMLInputElement | null>(null)
  const overlayInputRef = useRef<HTMLInputElement | null>(null)
  const overlayElRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<ComposerRenderer | null>(null)
  const sourceRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null)
  const rafRef = useRef<number | null>(null)

  // ── slide ativo + estado derivado dele ──────────────────────────────────────
  const cur = slides[active] ?? null
  const draft = cur?.draft ?? null
  const crop = cur?.crop ?? NEUTRAL_CROP
  const presetId = cur?.presetId ?? DEFAULT_PRESET_ID
  const filter = cur?.filter ?? getPreset(DEFAULT_PRESET_ID).filter
  const textLayers = cur?.textLayers ?? EMPTY_LAYERS
  const overlay = cur?.overlay ?? null

  const isImageMode = slides.length > 0 && slides.every((s) => s.draft.kind === "image")
  const isCarousel = slides.length > 1
  const canAddMore = mode === "post" && isImageMode && slides.length < MAX_SLIDES
  const showTray = mode === "post" && isImageMode

  // refs que o loop de preview lê (mídia/edição do slide ativo)
  const filterRef = useRef(filter)
  const cropRef = useRef(crop)
  const textRef = useRef<TextLayer[]>(textLayers)
  const overlayRef = useRef<OverlayLayer | null>(overlay)
  useEffect(() => { filterRef.current = filter }, [filter])
  useEffect(() => { cropRef.current = crop }, [crop])
  useEffect(() => { textRef.current = textLayers }, [textLayers])
  useEffect(() => { overlayRef.current = overlay }, [overlay])

  // ── patchers do slide ativo ──────────────────────────────────────────────────
  const setCrop = useCallback((next: CropState | ((c: CropState) => CropState)) => {
    setSlides((ss) => ss.map((s, i) => (i === active ? { ...s, crop: typeof next === "function" ? next(s.crop) : next } : s)))
  }, [active])
  const setFilter = useCallback((next: FilterState | ((f: FilterState) => FilterState)) => {
    setSlides((ss) => ss.map((s, i) => (i === active ? { ...s, filter: typeof next === "function" ? next(s.filter) : next } : s)))
  }, [active])
  const setTextLayers = useCallback((next: TextLayer[] | ((ls: TextLayer[]) => TextLayer[])) => {
    setSlides((ss) => ss.map((s, i) => (i === active ? { ...s, textLayers: typeof next === "function" ? next(s.textLayers) : next } : s)))
  }, [active])
  const setOverlayDescriptor = useCallback((next: OverlayLayer | null | ((o: OverlayLayer | null) => OverlayLayer | null)) => {
    setSlides((ss) => ss.map((s, i) => (i === active ? { ...s, overlay: typeof next === "function" ? next(s.overlay) : next } : s)))
  }, [active])

  /** Aspecto é compartilhado: troca em TODOS os slides de uma vez. */
  const setSharedAspect = useCallback((ratio: number) => {
    setSlides((ss) => ss.map((s) => ({ ...s, crop: { ...s.crop, aspect: ratio } })))
  }, [])

  const allowedAspects = aspectsFor(mode)

  // ── limpeza de slides (revoga object URLs) ───────────────────────────────────
  const revokeSlides = useCallback((list: Slide[]) => {
    list.forEach((s) => {
      if (s.draft.url) URL.revokeObjectURL(s.draft.url)
      if (s.overlay?.url) URL.revokeObjectURL(s.overlay.url)
    })
    const prev = overlayElRef.current
    if (prev instanceof HTMLVideoElement) { prev.pause(); prev.src = "" }
    overlayElRef.current = null
  }, [])

  const clearSlides = useCallback(() => {
    setSlides((ss) => { revokeSlides(ss); return [] })
    setActive(0)
    setActiveTextId(null)
  }, [revokeSlides])

  // ── reset ao fechar ──────────────────────────────────────────────────────────
  const hardReset = useCallback(() => {
    revokeSlides(slides)
    setSlides([]); setActive(0); setStep("pick"); setEditTab("filtro"); setActiveTextId(null)
    setAudioPick(null)
    setTitle(""); setDescription(""); setCaption(""); setProgress(0); setSubmitting(false); setError(null); setVideoNotice(null)
    setBeeLocation(""); setBeeLinks([])
    setCameraOpen(false)
  }, [slides, revokeSlides])

  useEffect(() => {
    if (!open) hardReset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── abre o seletor nativo automaticamente no mobile ao abrir ─────────────────
  useEffect(() => {
    if (!open || slides.length > 0) return
    const isTouch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches
    if (isTouch) fileRef.current?.click()
  }, [open, slides.length])

  // ── carrega subperfis ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || status !== "authenticated" || !user) return
    let cancelled = false
    setLoadingProfiles(true)
    fetch(`/api/profile/user/${encodeURIComponent(user.id_user)}`, {
      headers: { Authorization: `Bearer ${getToken() || ""}` }, cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((data) => {
        if (cancelled) return
        const list: ProfileLite[] = (Array.isArray(data?.profiles) ? data.profiles : []).filter((p: ProfileLite) => p.is_active)
        setProfiles(list)
        setSelectedProfileId((curId) => {
          if (curId && list.some((p) => p.id_profile === curId)) return curId
          if (initialProfileId && list.some((p) => p.id_profile === initialProfileId)) return initialProfileId
          const preferred = list.find((p) => !p.is_user_account) ?? list[0]
          return preferred?.id_profile ?? null
        })
      })
      .catch(() => { if (!cancelled) setProfiles([]) })
      .finally(() => { if (!cancelled) setLoadingProfiles(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status, user?.id_user, initialProfileId])

  // ── construtores de slides ───────────────────────────────────────────────────
  const makeImageSlide = (file: File, url: string, dim: { w: number; h: number }, aspect: number): Slide => ({
    id: crypto.randomUUID(),
    draft: { file, kind: "image", url, width: dim.w, height: dim.h },
    crop: { ...NEUTRAL_CROP, aspect },
    presetId: DEFAULT_PRESET_ID,
    filter: { ...getPreset(DEFAULT_PRESET_ID).filter },
    textLayers: [],
    overlay: null,
  })

  const buildImageSlides = async (files: File[], append: boolean) => {
    const aspect = append && slides[0] ? slides[0].crop.aspect : ASPECTS[allowedAspects[0]].ratio
    const built: Slide[] = []
    for (const f of files) {
      const url = URL.createObjectURL(f)
      try {
        const dim = await readImageDim(url)
        built.push(makeImageSlide(f, url, dim, aspect))
      } catch {
        URL.revokeObjectURL(url)
      }
    }
    if (built.length === 0) { setError(t("errors.readImage", "Não consegui ler essa imagem.")); return }
    if (append) {
      setSlides((ss) => {
        const merged = [...ss, ...built]
        const extra = merged.slice(MAX_SLIDES)
        revokeSlides(extra)
        return merged.slice(0, MAX_SLIDES)
      })
    } else {
      setSlides(built); setActive(0); setStep("crop")
    }
  }

  const buildVideoSlide = (f: File) => {
    const url = URL.createObjectURL(f)
    setVideoNotice(null)
    const caps = detectCapabilities()
    if (mode !== "story" && !caps.mediaRecorderMp4 && caps.mediaRecorderWebm) {
      setVideoNotice(t("capabilities.webmFallback", "Seu navegador vai exportar este vídeo em WebM; Post e Bee aceitam esse fallback."))
    } else if (caps.recordPath === "mediarecorder") {
      setVideoNotice(t("capabilities.mediaRecorderFallback", "WebCodecs indisponível; usando MediaRecorder como fallback."))
    } else if (caps.recordPath === "none") {
      setVideoNotice(t("capabilities.noVideoExport", "Este navegador pode não conseguir exportar vídeo editado."))
    }
    const v = document.createElement("video")
    v.preload = "metadata"
    v.onloadedmetadata = () => {
      const aspect = ASPECTS[allowedAspects[0]].ratio
      setSlides([{
        id: crypto.randomUUID(),
        draft: { file: f, kind: "video", url, width: v.videoWidth, height: v.videoHeight, durationSec: Math.round(v.duration) },
        crop: { ...NEUTRAL_CROP, aspect },
        presetId: DEFAULT_PRESET_ID,
        filter: { ...getPreset(DEFAULT_PRESET_ID).filter },
        textLayers: [],
        overlay: null,
      }])
      setActive(0); setStep("crop")
    }
    v.onerror = () => { URL.revokeObjectURL(url); setError(t("errors.readVideo", "Não consegui ler esse vídeo.")) }
    v.src = url
  }

  // ── seleção de arquivo(s) inicial ────────────────────────────────────────────
  const handleFiles = (fileList: FileList | null) => {
    setError(null)
    const files = fileList ? Array.from(fileList) : []
    if (files.length === 0) return
    const images = files.filter((f) => f.type.startsWith("image/"))
    const videos = files.filter((f) => f.type.startsWith("video/"))
    if (images.length === 0 && videos.length === 0) {
      setError(t("errors.pickMedia", "Selecione uma imagem ou um vídeo.")); return
    }
    // Vídeo nunca entra em carrossel: vira mídia única (usa o primeiro).
    if (videos.length > 0) {
      const f = videos[0]
      if (f.size > MAX_BYTES) { setOversize(true); return }
      buildVideoSlide(f)
      return
    }
    // Imagens: post → carrossel (várias); bee/story → única (primeira).
    const usable = (mode === "post" ? images : images.slice(0, 1)).filter((f) => f.size <= MAX_BYTES)
    if (usable.length === 0) { setOversize(true); return }
    buildImageSlides(usable.slice(0, MAX_SLIDES), false)
  }

  // Adicionar mais fotos ao carrossel (botão + na bandeja).
  const handleAddImages = (fileList: FileList | null) => {
    setError(null)
    const files = fileList ? Array.from(fileList).filter((f) => f.type.startsWith("image/") && f.size <= MAX_BYTES) : []
    if (files.length === 0) return
    const room = MAX_SLIDES - slides.length
    if (room <= 0) return
    void buildImageSlides(files.slice(0, room), true)
  }

  const removeSlide = (idx: number) => {
    if (slides.length <= 1) return
    setSlides((ss) => {
      const target = ss[idx]
      if (target) {
        if (target.draft.url) URL.revokeObjectURL(target.draft.url)
        if (target.overlay?.url) URL.revokeObjectURL(target.overlay.url)
      }
      return ss.filter((_, i) => i !== idx)
    })
    setActive((a) => (idx < a ? a - 1 : Math.min(a, slides.length - 2)))
    setActiveTextId(null)
  }

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const to = idx + dir
    if (to < 0 || to >= slides.length) return
    setSlides((ss) => {
      const next = [...ss]
      const [m] = next.splice(idx, 1)
      next.splice(to, 0, m)
      return next
    })
    setActive(to)
  }

  const selectSlide = (idx: number) => { setActive(idx); setActiveTextId(null) }

  // ── carrega o elemento de sobreposição do slide ATIVO no overlayElRef ─────────
  useEffect(() => {
    const prev = overlayElRef.current
    if (prev instanceof HTMLVideoElement) { prev.pause(); prev.src = "" }
    overlayElRef.current = null
    if (!overlay) return
    let cancelled = false
    if (overlay.kind === "image") {
      const img = new Image(); img.crossOrigin = "anonymous"
      img.onload = () => { if (!cancelled) overlayElRef.current = img }
      img.src = overlay.url
    } else {
      const v = document.createElement("video")
      v.src = overlay.url; v.muted = true; v.loop = true; v.playsInline = true; v.crossOrigin = "anonymous"
      v.onloadeddata = () => { if (!cancelled) { v.play().catch(() => {}); overlayElRef.current = v } }
    }
    return () => { cancelled = true }
    // recarrega ao trocar de slide ou quando a fonte da sobreposição muda — NÃO
    // depende de `overlay` inteiro de propósito: arrastar (x/y/scale) não deve
    // recarregar o elemento, só os campos id/url disparam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, overlay?.id, overlay?.url])

  // ── preview ao vivo (crop + edit) ────────────────────────────────────────────
  const drawOverlayLive = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    paintOverlay(ctx, W, H, overlayRef.current, overlayElRef.current)
  }, [])

  useEffect(() => {
    const live = step === "crop" || step === "edit"
    if (!live || !draft || !canvasRef.current) return
    let disposed = false

    const setup = async () => {
      let source: HTMLImageElement | HTMLVideoElement
      if (draft.kind === "image") {
        const img = new Image()
        img.crossOrigin = "anonymous"
        await new Promise<void>((res) => { img.onload = () => res(); img.src = draft.url })
        source = img
      } else {
        const v = document.createElement("video")
        v.src = draft.url; v.muted = true; v.loop = true; v.playsInline = true
        await new Promise<void>((res) => { v.onloadeddata = () => res() })
        await v.play().catch(() => {})
        source = v
      }
      if (disposed) return
      sourceRef.current = source
      const r = new ComposerRenderer(canvasRef.current!, filterRef.current, cropRef.current)
      const baseW = 720
      r.setSize(baseW, Math.round(baseW / cropRef.current.aspect))
      r.afterCompose = (ctx, w, h) => { drawOverlayLive(ctx, w, h); drawTextLayers(ctx, w, h, textRef.current) }
      rendererRef.current = r

      const loop = () => {
        const rr = rendererRef.current
        if (rr && sourceRef.current) {
          rr.setFilter(filterRef.current)
          rr.setCrop(cropRef.current)
          rr.setSize(720, Math.round(720 / cropRef.current.aspect))
          rr.render(sourceRef.current)
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    setup()

    return () => {
      disposed = true
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      try { rendererRef.current?.dispose() } catch { /* noop */ }
      rendererRef.current = null
      const s = sourceRef.current
      if (s instanceof HTMLVideoElement) { s.pause(); s.src = "" }
      sourceRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, draft?.url])

  // ── arraste no preview: pan (crop) ou mover texto/overlay (edit) ─────────────
  const dragRef = useRef<{ x: number; y: number; textId?: string; overlay?: boolean } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (step === "edit" && canvas) {
      const rect = canvas.getBoundingClientRect()
      const px = ((e.clientX - rect.left) / rect.width) * canvas.width
      const py = ((e.clientY - rect.top) / rect.height) * canvas.height
      const ctx = canvas.getContext("2d")
      if (ctx) {
        for (let i = textRef.current.length - 1; i >= 0; i--) {
          const b = layerBox(ctx, canvas.width, canvas.height, textRef.current[i])
          if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
            dragRef.current = { x: e.clientX, y: e.clientY, textId: textRef.current[i].id }
            setActiveTextId(textRef.current[i].id)
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
            return
          }
        }
      }
      const ov = overlayRef.current
      const el = overlayElRef.current
      if (ov && el) {
        const natW = el instanceof HTMLVideoElement ? el.videoWidth : (el as HTMLImageElement).naturalWidth
        const natH = el instanceof HTMLVideoElement ? el.videoHeight : (el as HTMLImageElement).naturalHeight
        const w = ov.scale * canvas.width
        const h = w * (natH / Math.max(1, natW))
        const x = ov.x * canvas.width - w / 2
        const y = ov.y * canvas.height - h / 2
        if (px >= x && px <= x + w && py >= y && py <= y + h) {
          dragRef.current = { x: e.clientX, y: e.clientY, overlay: true }
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          return
        }
      }
      return
    }
    if (step !== "crop") return
    dragRef.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const canvas = canvasRef.current
    if (dragRef.current.overlay && canvas) {
      const rect = canvas.getBoundingClientRect()
      const dx = (e.clientX - dragRef.current.x) / rect.width
      const dy = (e.clientY - dragRef.current.y) / rect.height
      dragRef.current = { ...dragRef.current, x: e.clientX, y: e.clientY }
      setOverlayDescriptor((o) => o ? { ...o, x: Math.max(0, Math.min(1, o.x + dx)), y: Math.max(0, Math.min(1, o.y + dy)) } : o)
      return
    }
    if (dragRef.current.textId && canvas) {
      const rect = canvas.getBoundingClientRect()
      const dx = (e.clientX - dragRef.current.x) / rect.width
      const dy = (e.clientY - dragRef.current.y) / rect.height
      dragRef.current = { ...dragRef.current, x: e.clientX, y: e.clientY }
      const id = dragRef.current.textId
      setTextLayers((ls) => ls.map((l) => l.id === id
        ? { ...l, x: Math.max(0, Math.min(1, l.x + dx)), y: Math.max(0, Math.min(1, l.y + dy)) }
        : l))
      return
    }
    const dx = (e.clientX - dragRef.current.x) / 200
    const dy = (e.clientY - dragRef.current.y) / 200
    dragRef.current = { x: e.clientX, y: e.clientY }
    setCrop((c) => ({ ...c, panX: Math.max(-1, Math.min(1, c.panX - dx)), panY: Math.max(-1, Math.min(1, c.panY - dy)) }))
  }
  const onPointerUp = () => { dragRef.current = null }

  // ── overlay PiP (imagem/vídeo) ───────────────────────────────────────────────
  const handleOverlayFile = (f: File | null) => {
    if (!f) return
    const isImg = f.type.startsWith("image/")
    const isVid = f.type.startsWith("video/")
    if (!isImg && !isVid) { setError(t("errors.overlayMedia", "Sobreposição deve ser imagem ou vídeo.")); return }
    if (f.size > MAX_BYTES) { setOversize(true); return }
    if (overlay?.url) URL.revokeObjectURL(overlay.url)
    const url = URL.createObjectURL(f)
    const kind: MediaKind = isImg ? "image" : "video"
    setOverlayDescriptor({ id: crypto.randomUUID(), kind, url, x: 0.7, y: 0.7, scale: 0.32 })
  }
  const removeOverlay = () => {
    if (overlay?.url) URL.revokeObjectURL(overlay.url)
    setOverlayDescriptor(null)
  }

  // ── helpers de texto ─────────────────────────────────────────────────────────
  const addText = () => {
    const layer: TextLayer = {
      id: crypto.randomUUID(), text: "Toque para editar", font: "display",
      color: "#0B0B0D", box: "rounded", boxColor: "#F2B705", x: 0.5, y: 0.46, size: 0.07,
    }
    setTextLayers((ls) => [...ls, layer])
    setActiveTextId(layer.id)
  }
  const updateText = (id: string, patch: Partial<TextLayer>) =>
    setTextLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const removeText = (id: string) => {
    setTextLayers((ls) => ls.filter((l) => l.id !== id))
    setActiveTextId((curId) => (curId === id ? null : curId))
  }

  // ── publicar ─────────────────────────────────────────────────────────────────
  const applyPreset = (id: string) => {
    setSlides((ss) => ss.map((s, i) => (i === active ? { ...s, presetId: id, filter: { ...getPreset(id).filter } } : s)))
  }
  const setAdj = (k: keyof FilterState, v: number) => setFilter((f) => ({ ...f, [k]: v }))

  const publish = async () => {
    if (slides.length === 0 || !selectedProfileId) return
    const token = getToken()
    if (!token) { setError(t("errors.sessionExpired", "Sessão expirada. Faça login novamente.")); return }
    setStep("publish"); setSubmitting(true); setProgress(0); setError(null)
    try {
      try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready } catch { /* noop */ }

      // ── Story: fluxo único (sem carrossel) ──────────────────────────────────
      if (mode === "story") {
        const s = slides[0]
        const el = await loadOverlayEl(s.overlay)
        const result = await compose({
          draft: s.draft, filter: s.filter, crop: s.crop,
          afterCompose: (ctx, w, h) => { paintOverlay(ctx, w, h, s.overlay, el); drawTextLayers(ctx, w, h, s.textLayers) },
          allowWebmFallback: false,
          onProgress: (f) => setProgress(f * 0.5),
        })
        if (el instanceof HTMLVideoElement) { el.pause(); el.src = "" }
        const filterMeta: FilterMeta = {
          preset: s.presetId, filter: s.filter,
          overlay: { frame: "none", watermark: false, sticker_count: 0, accessory: "none" },
          makeup: { skin_smooth: 0, lipstick: 0, blush: 0 },
          encoder: result.encoder === "image" ? "webcodecs" : result.encoder,
        }
        const isImageStory = result.kind === "image"
        await uploadStory({
          token, id_profile: selectedProfileId, kind: "bee",
          mediaType: isImageStory ? "image" : "video",
          videoBlob: result.blob, posterBlob: result.posterBlob,
          durationSeconds: isImageStory ? 7 : result.durationSec,
          width: result.width, height: result.height,
          caption: caption.trim() || undefined,
          location: beeLocation.trim() || undefined,
          links: beeLinks.length ? beeLinks : undefined,
          filterMeta,
          audioTrackId: audioPick?.trackId || null, audioStartMs: audioPick?.startMs ?? 0,
          onProgress: (f) => setProgress(0.5 + f * 0.5),
        })
        onPosted?.(); onClose(); router.refresh()
        return
      }

      // ── Post/Bee: compõe cada slide → cria 1 item → sobe N mídias ────────────
      const portfolioKind = mode === "bee" ? "bees" : "feed"
      const n = slides.length

      const results: ComposedResult[] = []
      for (let i = 0; i < n; i++) {
        const s = slides[i]
        const el = await loadOverlayEl(s.overlay)
        try {
          const r = await compose({
            draft: s.draft, filter: s.filter, crop: s.crop,
            afterCompose: (ctx, w, h) => { paintOverlay(ctx, w, h, s.overlay, el); drawTextLayers(ctx, w, h, s.textLayers) },
            allowWebmFallback: true,
            onProgress: (f) => setProgress(((i + f) / n) * 0.5),
          })
          results.push(r)
        } finally {
          if (el instanceof HTMLVideoElement) { el.pause(); el.src = "" }
        }
      }

      const renderMeta = {
        composer: "media-composer",
        carousel: n > 1,
        count: n,
        slides: slides.map((s, i) => ({
          preset: s.presetId,
          filter: s.filter,
          crop: s.crop,
          text_layers: s.textLayers.map((layer) => ({
            text: layer.text, font: layer.font, color: layer.color,
            box: layer.box, boxColor: layer.boxColor, x: layer.x, y: layer.y, size: layer.size,
          })),
          overlay: s.overlay ? { kind: s.overlay.kind, x: s.overlay.x, y: s.overlay.y, scale: s.overlay.scale } : null,
          encoder: results[i]?.encoder,
        })),
      }

      const itemRes = await fetch(`/api/profile/${selectedProfileId}/portfolio`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          feed_kind: portfolioKind,
          title: title.trim() || null,
          description: description.trim() || null,
          is_featured: false,
          sort_order: 0,
          audio_track_id: audioPick?.trackId || null,
          audio_start_ms: audioPick?.startMs ?? 0,
          render_meta: renderMeta,
        }),
      })
      const itemData = await itemRes.json().catch(() => ({}))
      if (!itemRes.ok) throw new Error(itemData?.error || t("errors.createItem", "Erro ao criar item."))

      const itemId: string | undefined = itemData?.id_portfolio_item ?? itemData?.item?.id_portfolio_item
      if (!itemId) throw new Error(t("errors.createItemResponse", "Resposta inesperada ao criar item."))

      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const mime = result.mimeType || result.blob.type || (result.kind === "image" ? "image/webp" : "video/mp4")
        const ext = result.kind === "image" ? "webp" : (mime.includes("webm") ? "webm" : "mp4")
        const file = new File([result.blob], `freelandoo-${portfolioKind}-${itemId}-${i}.${ext}`, { type: mime })
        const fd = new FormData()
        fd.append("file", file)
        fd.append("media_type", result.kind)
        fd.append("sort_order", String(i))

        const shouldBypassProxy = result.kind === "video" || result.blob.size > SERVERLESS_UPLOAD_LIMIT
        const uploadUrl = shouldBypassProxy
          ? `${getPublicBackendUrl()}/profile/${selectedProfileId}/portfolio/${itemId}/upload`
          : `/api/profile/${selectedProfileId}/portfolio/${itemId}/upload`
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => ({}))
          throw new Error(uploadData?.error || t("errors.uploadMedia", "Item criado, mas o upload da mídia falhou."))
        }
        setProgress(0.5 + ((i + 1) / results.length) * 0.5)
      }

      // Feed de comunidade: liga o post recém-criado ao feed do grupo (não-fatal).
      if (communityId) {
        try {
          await fetch(`/api/communities/${communityId}/feed`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ id_portfolio_item: itemId }),
          })
        } catch { /* noop */ }
      }
      // Feed de academia (mig 181): liga o post ao feed da academia — sobe
      // também no /feed global com a tag da academia (não-fatal).
      if (academyId) {
        try {
          await fetch(`/api/academies/${academyId}/feed`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ id_portfolio_item: itemId }),
          })
        } catch { /* noop */ }
      }
      setProgress(1)
      onPosted?.(); onClose(); router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.publish", "Falha ao publicar."))
      setStep("details")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const modeLabel = mode === "post" ? t("mode.post", "Novo Post") : mode === "bee" ? t("mode.bee", "Novo Bee") : t("mode.story", "Story")
  const canAdvanceFromCrop = slides.length > 0
  const canPublish = slides.length > 0 && !!selectedProfileId

  return (
    <div className="fl-root fixed inset-0 z-[95] flex items-stretch justify-center bg-[#0b0804]">
      <input
        ref={fileRef} type="file" accept="image/*,video/*" multiple={mode === "post"} className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = "" }}
      />
      <input
        ref={addImagesRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { handleAddImages(e.target.files); e.target.value = "" }}
      />
      <input
        ref={overlayInputRef} type="file" accept="image/*,video/*" className="hidden"
        onChange={(e) => { handleOverlayFile(e.target.files?.[0] || null); e.target.value = "" }}
      />
      <OversizeModal open={oversize} onClose={() => setOversize(false)} limitLabel={UPLOAD_LIMITS.post.label} />
      <div className="relative flex h-full w-full max-w-[560px] flex-col overflow-hidden border-x-2 border-[#0B0B0D] bg-[#0b0804]">
        {/* App bar tabloide */}
        <header className="flex items-center justify-between border-b-2 border-[#F1EDE2]/12 px-3 py-2.5">
          <button
            type="button"
            onClick={() => {
              if (step === "crop") { clearSlides(); setStep("pick") }
              else if (step === "edit") setStep("crop")
              else if (step === "details") setStep("edit")
              else onClose()
            }}
            className="grid h-8 w-8 place-items-center text-[#F1EDE2]"
            aria-label={t("back", "Voltar")}
          >
            {step === "pick" ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </button>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-anton)] text-lg uppercase text-[#F2B705]">
            {modeLabel}
            {isCarousel && (
              <span className="border-2 border-[#0B0B0D] bg-[#F1EDE2] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-[#0B0B0D]">
                {t("carousel.badge", "Carrossel")} {active + 1}/{slides.length}
              </span>
            )}
            {mode === "story" && (
              <span className="border-2 border-[#0B0B0D] bg-[#F2B705] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-[#0B0B0D]">
                {t("bee.badge", "Bee")}
              </span>
            )}
          </h2>
          <StepAction
            step={step}
            disabledNext={step === "crop" ? !canAdvanceFromCrop : step === "details" ? !canPublish : false}
            onNext={() => {
              if (step === "crop") setStep("edit")
              else if (step === "edit") setStep("details")
              else if (step === "details") publish()
            }}
            mode={mode}
          />
        </header>

        {/* Corpo por etapa */}
        <div className="relative flex-1 overflow-hidden">
          {step === "pick" && (
            <PickStep
              onPick={() => fileRef.current?.click()}
              onCamera={mode === "story" && selectedProfileId ? () => setCameraOpen(true) : undefined}
              showCarouselHint={mode === "post"}
              error={error}
            />
          )}

          {(step === "crop" || step === "edit") && draft && (
            <div className="flex h-full flex-col">
              <div className="relative flex-1 overflow-hidden bg-black">
                <canvas
                  ref={canvasRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  className="absolute inset-0 m-auto h-full w-full touch-none object-contain"
                />
                {step === "crop" && allowedAspects.length > 1 && (
                  <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
                    {allowedAspects.map((a) => (
                      <Chip key={a} on={Math.abs(crop.aspect - ASPECTS[a].ratio) < 0.001} onClick={() => setSharedAspect(ASPECTS[a].ratio)}>
                        {ASPECTS[a].label}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>

              {showTray && (
                <SlideTray
                  slides={slides} active={active} canAddMore={canAddMore}
                  onSelect={selectSlide} onRemove={removeSlide} onMove={moveSlide}
                  onAdd={() => addImagesRef.current?.click()}
                />
              )}

              {draft.kind === "video" && videoNotice && (
                <div className="flex items-start gap-2 border-t-2 border-[#0B0B0D] bg-[#201a10] px-4 py-2 text-[11px] font-bold text-[#d6cfbf]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#F2B705]" />
                  <span>{videoNotice}</span>
                </div>
              )}

              {step === "crop" && (
                <div className="border-t-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-3">
                  <Label>{t("crop.zoom", "Zoom")}</Label>
                  <input
                    type="range" min={1} max={3} step={0.01} value={crop.zoom}
                    onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
                    className="fl-range mt-2 w-full"
                  />
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#a89f8d]">{t("crop.dragHint", "Arraste a imagem para reposicionar")}</p>
                </div>
              )}

              {step === "edit" && (
                <EditPanel
                  tab={editTab} onTab={setEditTab}
                  presetId={presetId} onPreset={applyPreset}
                  filter={filter} onAdj={setAdj}
                  textLayers={textLayers} activeTextId={activeTextId} setActiveTextId={setActiveTextId}
                  onAddText={addText} onUpdateText={updateText} onRemoveText={removeText}
                  overlay={overlay} onPickOverlay={() => overlayInputRef.current?.click()}
                  onOverlayScale={(s) => setOverlayDescriptor((o) => (o ? { ...o, scale: s } : o))}
                  onRemoveOverlay={removeOverlay}
                  audioPick={audioPick} onAudioChange={setAudioPick}
                />
              )}
            </div>
          )}

          {step === "details" && (
            <DetailsStep
              mode={mode} userName={user?.nome || null}
              profiles={profiles} loadingProfiles={loadingProfiles}
              selectedProfileId={selectedProfileId} onSelectProfile={setSelectedProfileId}
              ineligible={() => null}
              title={title} setTitle={setTitle} description={description} setDescription={setDescription}
              caption={caption} setCaption={setCaption}
              beeLocation={beeLocation} setBeeLocation={setBeeLocation}
              beeLinks={beeLinks} setBeeLinks={setBeeLinks}
              error={error}
            />
          )}

          {step === "publish" && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#F1EDE2]/15 border-t-[#F2B705]" />
              <div className="font-[family-name:var(--font-anton)] text-xl uppercase text-[#F2B705]">{t("publish.rendering", "Renderizando")}</div>
              <div className="w-56">
                <div className="mb-1 flex justify-between text-[10px] font-black uppercase tracking-[0.1em] text-[#a89f8d]">
                  <span>{t("publish.uploading", "Enviando ao R2")}</span><span className="tabular-nums">{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]">
                  <div className="h-full bg-[#F2B705] transition-all" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
              {error && <p className="text-xs text-red-300">{error}</p>}
            </div>
          )}
        </div>
      </div>

      {mode === "story" && (
        <CameraStudio
          open={cameraOpen}
          profileId={selectedProfileId}
          kind="bee"
          caption={caption.trim() || undefined}
          onClose={() => setCameraOpen(false)}
          onPosted={() => { setCameraOpen(false); onPosted?.(); onClose(); router.refresh() }}
        />
      )}
    </div>
  )
}

// ─── peças ──────────────────────────────────────────────────────────────────

/** Bandeja de slides do carrossel (selecionar · adicionar · remover · reordenar). */
function SlideTray({
  slides, active, canAddMore, onSelect, onRemove, onMove, onAdd,
}: {
  slides: Slide[]; active: number; canAddMore: boolean
  onSelect: (i: number) => void; onRemove: (i: number) => void
  onMove: (i: number, dir: -1 | 1) => void; onAdd: () => void
}) {
  const t = useTranslations("Composer")
  return (
    <div className="border-t-2 border-[#0B0B0D] bg-[#15110a] px-3 py-2.5">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {slides.map((s, i) => {
          const on = i === active
          return (
            <div key={s.id} className="relative shrink-0">
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={cn(
                  "relative block h-16 w-16 overflow-hidden border-2",
                  on ? "border-[#F2B705] shadow-[0_0_0_2px_#F2B705]" : "border-[#0B0B0D]",
                )}
                aria-label={t("carousel.slide", "Foto {n}").replace("{n}", String(i + 1))}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.draft.url} alt="" className="h-full w-full object-cover" />
                <span className="absolute bottom-0 left-0 bg-[#0B0B0D]/80 px-1 text-[9px] font-black text-[#F1EDE2]">{i + 1}</span>
              </button>
              {slides.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center border-2 border-[#0B0B0D] bg-[#c2371f] text-white"
                  aria-label={t("carousel.remove", "Remover foto")}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {on && slides.length > 1 && (
                <div className="mt-1 flex items-center justify-center gap-1">
                  <button
                    type="button" onClick={() => onMove(i, -1)} disabled={i === 0}
                    className="grid h-5 w-5 place-items-center border border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] disabled:opacity-30"
                    aria-label={t("carousel.moveLeft", "Mover para a esquerda")}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button" onClick={() => onMove(i, 1)} disabled={i === slides.length - 1}
                    className="grid h-5 w-5 place-items-center border border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] disabled:opacity-30"
                    aria-label={t("carousel.moveRight", "Mover para a direita")}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {canAddMore && (
          <button
            type="button"
            onClick={onAdd}
            className="grid h-16 w-16 shrink-0 place-items-center border-2 border-dashed border-[#F2B705]/60 bg-[#1D1810] text-[#F2B705]"
            aria-label={t("carousel.add", "Adicionar fotos")}
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[#a89f8d]">
        {slides.length > 1
          ? t("carousel.hintMulti", "Cada foto tem seu próprio corte, filtro e texto.")
          : t("carousel.hintAdd", "Toque em + para montar um carrossel (até {max} fotos).").replace("{max}", String(MAX_SLIDES))}
      </p>
    </div>
  )
}

function StepAction({ step, disabledNext, onNext, mode }: { step: Step; disabledNext: boolean; onNext: () => void; mode: string }) {
  const t = useTranslations("Composer")
  if (step === "pick" || step === "publish") return <span className="w-8" />
  const label = step === "details" ? (mode === "story" ? t("publish.publish", "Publicar") : t("publish.share", "Compartilhar")) : t("next", "Avançar")
  return (
    <button
      type="button" onClick={onNext} disabled={disabledNext}
      className={cn(
        "flex items-center gap-1 border-2 border-[#0B0B0D] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] shadow-[2px_2px_0_0_#0B0B0D] transition",
        disabledNext ? "cursor-not-allowed bg-[#1D1810] text-[#a89f8d]/50 shadow-none" : "bg-[#F2B705] text-[#0B0B0D] hover:-translate-y-0.5",
      )}
    >
      {label} {step !== "details" && <ArrowRight className="h-3.5 w-3.5" />}
    </button>
  )
}

function PickStep({ onPick, onCamera, showCarouselHint, error }: { onPick: () => void; onCamera?: () => void; showCarouselHint?: boolean; error: string | null }) {
  const t = useTranslations("Composer")
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="font-[family-name:var(--font-anton)] text-4xl uppercase text-[#F2B705]">{t("pick.kicker", "EXTRA!")}</div>
      <p className="max-w-xs text-sm text-[#d6cfbf]">{t("pick.description", "Toque para escolher uma foto ou vídeo da sua galeria.")}</p>
      {showCarouselHint && (
        <p className="max-w-xs text-[11px] uppercase tracking-[0.08em] text-[#a89f8d]">{t("pick.carouselHint", "Dica: escolha várias fotos para montar um carrossel.")}</p>
      )}
      <button
        type="button" onClick={onPick}
        className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0B0B0D]"
      >
        <ImagePlus className="h-4 w-4" /> {t("pick.selectMedia", "Selecionar mídia")}
      </button>
      {onCamera && (
        <button
          type="button" onClick={onCamera}
          className="flex items-center gap-2 border-2 border-[#F1EDE2]/25 bg-transparent px-5 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#F1EDE2] transition hover:border-[#F1EDE2]"
        >
          <Video className="h-4 w-4" /> {t("pick.recordCamera", "Gravar com a câmera")}
        </button>
      )}
      {error && (
        <div className="flex items-center gap-2 border-2 border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <a
        href="/comprimir"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#a89f8d] underline-offset-2 transition hover:text-[#F2B705] hover:underline"
      >
        <Minimize2 className="h-3.5 w-3.5" /> {t("pick.compressLink", "Arquivo grande? Comprimir mídia")}
      </a>
    </div>
  )
}

function EditPanel({
  tab, onTab, presetId, onPreset, filter, onAdj,
  textLayers, activeTextId, setActiveTextId, onAddText, onUpdateText, onRemoveText,
  overlay, onPickOverlay, onOverlayScale, onRemoveOverlay,
  audioPick, onAudioChange,
}: {
  tab: EditTab; onTab: (t: EditTab) => void
  presetId: string; onPreset: (id: string) => void
  filter: FilterState; onAdj: (k: keyof FilterState, v: number) => void
  textLayers: TextLayer[]; activeTextId: string | null; setActiveTextId: (id: string | null) => void
  onAddText: () => void; onUpdateText: (id: string, patch: Partial<TextLayer>) => void; onRemoveText: (id: string) => void
  overlay: OverlayLayer | null; onPickOverlay: () => void; onOverlayScale: (s: number) => void; onRemoveOverlay: () => void
  audioPick: AudioPick | null; onAudioChange: (a: AudioPick | null) => void
}) {
  const t = useTranslations("Composer")
  const tabs: { id: EditTab; label: string; icon: React.ReactNode }[] = [
    { id: "filtro", label: t("tabs.filter", "Filtro"), icon: <SlidersHorizontal className="h-4 w-4" /> },
    { id: "texto", label: t("tabs.text", "Texto"), icon: <Type className="h-4 w-4" /> },
    { id: "sobreposicao", label: t("tabs.overlay", "Sobrepor"), icon: <Layers className="h-4 w-4" /> },
    { id: "musica", label: t("tabs.music", "Música"), icon: <Music className="h-4 w-4" /> },
  ]
  return (
    <div className="border-t-2 border-[#0B0B0D] bg-[#1D1810]">
      <div className="max-h-[40vh] overflow-y-auto px-3 py-3">
        {tab === "filtro" ? (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id} type="button" onClick={() => onPreset(p.id)}
                  className={cn("shrink-0 text-center", presetId === p.id ? "text-[#F2B705]" : "text-[#a89f8d]")}
                >
                  <span
                    className={cn("mb-1 block h-14 w-14 border-2 border-[#0B0B0D]", presetId === p.id && "shadow-[0_0_0_2px_#F2B705]")}
                    style={{ background: p.swatch }}
                  />
                  <span className="text-[9px] font-black uppercase tracking-[0.04em]">{p.label}</span>
                </button>
              ))}
            </div>
            <Adj label={t("filter.brightness", "Brilho")} value={filter.brightness} onChange={(v) => onAdj("brightness", v)} />
            <Adj label={t("filter.contrast", "Contraste")} value={filter.contrast} onChange={(v) => onAdj("contrast", v)} />
            <Adj label={t("filter.saturation", "Saturação")} value={filter.saturation} onChange={(v) => onAdj("saturation", v)} />
            <Adj label={t("filter.temperature", "Temperatura")} value={filter.temperature} onChange={(v) => onAdj("temperature", v)} />
          </div>
        ) : tab === "texto" ? (
          <TextEditor
            layers={textLayers} activeId={activeTextId} setActiveId={setActiveTextId}
            onAdd={onAddText} onUpdate={onUpdateText} onRemove={onRemoveText}
          />
        ) : tab === "sobreposicao" ? (
          <OverlayEditor overlay={overlay} onPick={onPickOverlay} onScale={onOverlayScale} onRemove={onRemoveOverlay} />
        ) : (
          <AudioPicker value={audioPick} onChange={onAudioChange} />
        )}
      </div>
      <div className="flex items-stretch border-t-2 border-[#0B0B0D]">
        {tabs.map((tb) => (
          <button
            key={tb.id} type="button" onClick={() => onTab(tb.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-black uppercase tracking-[0.05em] transition",
              tab === tb.id ? "bg-[#F2B705] text-[#0B0B0D]" : "text-[#a89f8d]",
            )}
          >
            {tb.icon}{tb.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function TextEditor({
  layers, activeId, setActiveId, onAdd, onUpdate, onRemove,
}: {
  layers: TextLayer[]; activeId: string | null; setActiveId: (id: string | null) => void
  onAdd: () => void; onUpdate: (id: string, patch: Partial<TextLayer>) => void; onRemove: (id: string) => void
}) {
  const t = useTranslations("Composer")
  const active = layers.find((l) => l.id === activeId) || null
  const fonts = Object.entries(TEXT_FONTS) as [TextFontId, (typeof TEXT_FONTS)[TextFontId]][]

  if (!active) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        {layers.length > 0 && (
          <div className="flex w-full flex-wrap justify-center gap-2">
            {layers.map((l) => (
              <button
                key={l.id} type="button" onClick={() => setActiveId(l.id)}
                className="max-w-[140px] truncate border-2 border-[#0B0B0D] bg-[#F1EDE2] px-2 py-1 text-xs font-bold text-[#0B0B0D]"
              >
                {l.text || t("text.empty", "(vazio)")}
              </button>
            ))}
          </div>
        )}
        <button
          type="button" onClick={onAdd}
          className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
        >
          <Type className="h-4 w-4" /> {t("text.add", "Adicionar texto")}
        </button>
        <p className="max-w-[220px] text-[10px] uppercase tracking-[0.1em] text-[#a89f8d]">{t("text.dragHint", "Arraste o texto no preview para posicionar")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <textarea
        value={active.text}
        onChange={(e) => onUpdate(active.id, { text: e.target.value.slice(0, 120) })}
        rows={2} autoFocus
        placeholder={t("text.placeholder", "Escreva algo…")}
        className="w-full resize-none border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2 text-sm text-[#0B0B0D] placeholder:text-[#0B0B0D]/40 focus:outline-none"
      />
      <div>
        <Label>{t("text.font", "Fonte")}</Label>
        <div className="mt-1.5 flex gap-2">
          {fonts.map(([id, f]) => (
            <button
              key={id} type="button" onClick={() => onUpdate(active.id, { font: id })}
              style={{ fontFamily: f.cssVar }}
              className={cn(
                "flex-1 border-2 border-[#0B0B0D] px-2 py-1.5 text-sm",
                active.font === id ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#F1EDE2] text-[#0B0B0D]",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>{t("text.box", "Caixa")}</Label>
        <div className="mt-1.5 flex gap-2">
          {(["rounded", "transparent"] as TextBoxStyle[]).map((b) => (
            <button
              key={b} type="button" onClick={() => onUpdate(active.id, { box: b })}
              className={cn(
                "flex-1 border-2 border-[#0B0B0D] px-2 py-1.5 text-[11px] font-black uppercase tracking-[0.06em]",
                active.box === b ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#F1EDE2] text-[#0B0B0D]",
              )}
            >
              {b === "rounded" ? t("text.rounded", "Arredondada") : t("text.transparent", "Transparente")}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>{t("text.textColor", "Cor do texto")}</Label>
        <Swatches value={active.color} onPick={(c) => onUpdate(active.id, { color: c })} />
      </div>
      {active.box === "rounded" && (
        <div>
          <Label>{t("text.boxColor", "Cor da caixa")}</Label>
          <Swatches value={active.boxColor} onPick={(c) => onUpdate(active.id, { boxColor: c })} />
        </div>
      )}
      <div>
        <Label>{t("size", "Tamanho")}</Label>
        <input
          type="range" min={0.04} max={0.16} step={0.005} value={active.size}
          onChange={(e) => onUpdate(active.id, { size: Number(e.target.value) })}
          className="mt-1.5 w-full accent-[#F2B705]"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button" onClick={() => setActiveId(null)}
          className="flex-1 border-2 border-[#0B0B0D] bg-[#F1EDE2] py-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#0B0B0D]"
        >
          {t("done", "Concluir")}
        </button>
        <button
          type="button" onClick={() => onRemove(active.id)}
          className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[#F2B705]"
          aria-label={t("text.remove", "Remover texto")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function OverlayEditor({
  overlay, onPick, onScale, onRemove,
}: {
  overlay: OverlayLayer | null; onPick: () => void; onScale: (s: number) => void; onRemove: () => void
}) {
  const t = useTranslations("Composer")
  if (!overlay) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <button
          type="button" onClick={onPick}
          className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
        >
          <Layers className="h-4 w-4" /> {t("overlay.add", "Adicionar imagem/vídeo")}
        </button>
        <p className="max-w-[220px] text-[10px] uppercase tracking-[0.1em] text-[#a89f8d]">{t("overlay.dragHint", "Cole uma foto ou vídeo por cima — arraste no preview para posicionar")}</p>
      </div>
    )
  }
  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2 text-[11px] font-black uppercase tracking-[0.06em] text-[#0B0B0D]">
        <Layers className="h-4 w-4" /> {t("overlay.selected", "Sobreposição de")} {overlay.kind === "video" ? t("overlay.video", "vídeo") : t("overlay.image", "imagem")}
      </div>
      <div>
        <Label>{t("size", "Tamanho")}</Label>
        <input
          type="range" min={0.15} max={0.7} step={0.01} value={overlay.scale}
          onChange={(e) => onScale(Number(e.target.value))}
          className="mt-1.5 w-full accent-[#F2B705]"
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onPick} className="flex-1 border-2 border-[#0B0B0D] bg-[#F1EDE2] py-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#0B0B0D]">{t("replace", "Trocar")}</button>
        <button type="button" onClick={onRemove} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[#F2B705]" aria-label={t("overlay.remove", "Remover sobreposição")}><X className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

function Swatches({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  const t = useTranslations("Composer")
  return (
    <div className="mt-1.5 flex gap-2">
      {TEXT_COLORS.map((c) => (
        <button
          key={c} type="button" onClick={() => onPick(c)} aria-label={`${t("color", "Cor")} ${c}`}
          className={cn("h-7 w-7 border-2 border-[#0B0B0D]", value.toLowerCase() === c.toLowerCase() && "shadow-[0_0_0_2px_#F2B705]")}
          style={{ background: c }}
        />
      ))}
    </div>
  )
}

function DetailsStep({
  mode, userName, profiles, loadingProfiles, selectedProfileId, onSelectProfile, ineligible,
  title, setTitle, description, setDescription, caption, setCaption,
  beeLocation, setBeeLocation, beeLinks, setBeeLinks, error,
}: {
  mode: string; userName: string | null
  profiles: ProfileLite[]; loadingProfiles: boolean
  selectedProfileId: string | null; onSelectProfile: (id: string) => void
  ineligible: (p: ProfileLite) => string | null
  title: string; setTitle: (s: string) => void
  description: string; setDescription: (s: string) => void
  caption: string; setCaption: (s: string) => void
  beeLocation: string; setBeeLocation: (s: string) => void
  beeLinks: BeeComposerLink[]; setBeeLinks: React.Dispatch<React.SetStateAction<BeeComposerLink[]>>
  error: string | null
}) {
  const t = useTranslations("Composer")
  const [linkLabel, setLinkLabel] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkStyle, setLinkStyle] = useState<BeeComposerLink["style"]>("gold")
  const [linkError, setLinkError] = useState<string | null>(null)

  const addLink = () => {
    const label = linkLabel.trim().slice(0, 30)
    const url = linkUrl.trim()
    if (!label) { setLinkError(t("bee.linkLabelRequired", "Dê um rótulo pro link")); return }
    let parsed: URL
    try { parsed = new URL(url) } catch { setLinkError(t("bee.linkInvalid", "URL inválida — use http(s)://")); return }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      setLinkError(t("bee.linkInvalid", "URL inválida — use http(s)://")); return
    }
    setLinkError(null)
    setBeeLinks((prev) => [...prev, { label, url: parsed.toString(), style: linkStyle }])
    setLinkLabel(""); setLinkUrl("")
  }

  const linkChipClass = (style: BeeComposerLink["style"]) => cn(
    "inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-wide",
    style === "gold" && "bg-[#F2B705] text-[#0B0B0D]",
    style === "paper" && "bg-[#F1EDE2] text-[#0B0B0D]",
    style === "ink" && "border border-white/40 bg-black/60 text-white",
  )

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <Label>{t("details.publishAs", "Publicar como")}</Label>
      <div className="mt-2">
        {loadingProfiles ? (
          <div className="flex items-center gap-2 text-sm text-[#a89f8d]"><Loader2 className="h-4 w-4 animate-spin text-[#F2B705]" /> {t("details.loadingProfiles", "Carregando perfis…")}</div>
        ) : profiles.length === 0 ? (
          <p className="border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-sm text-[#0B0B0D]">{t("details.noProfiles", "Sem subperfis elegíveis. Crie um subperfil para postar.")}</p>
        ) : (
          <ProfileSelect userName={userName} profiles={profiles} selectedId={selectedProfileId} onSelect={onSelectProfile} ineligible={ineligible} />
        )}
      </div>

      {mode === "story" ? (
        <div className="mt-5">
          <Label>{t("details.caption", "Legenda (opcional)")}</Label>
          <textarea
            value={caption} onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))} rows={2}
            placeholder={t("details.captionPlaceholder", "Diga algo curto…")}
            className="fl-input mt-2 w-full resize-none border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-sm text-[#0B0B0D] placeholder:text-[#0B0B0D]/40 focus:outline-none"
          />
          <Counter n={caption.length} max={MAX_CAPTION} />

          {/* Localização do bee (opcional) */}
          <div className="mt-4">
            <Label>{t("bee.locationLabel", "Localização (opcional)")}</Label>
            <input
              value={beeLocation}
              onChange={(e) => setBeeLocation(e.target.value.slice(0, 80))}
              placeholder={t("bee.locationPlaceholder", "Ex.: São Bernardo do Campo/SP")}
              className="mt-2 w-full border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-sm text-[#0B0B0D] placeholder:text-[#0B0B0D]/40 focus:outline-none"
            />
            <Counter n={beeLocation.length} max={80} />
          </div>

          {/* Links estilizados do bee (máx 3) */}
          <div className="mt-4">
            <Label>{t("bee.linksTitle", "Links estilizados (até 3)")}</Label>
            {beeLinks.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {beeLinks.map((link, i) => (
                  <span key={`${link.url}-${i}`} className={linkChipClass(link.style)}>
                    {link.label}
                    <button
                      type="button"
                      onClick={() => setBeeLinks((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={t("bee.linkRemove", "Remover link")}
                      className="ml-1 opacity-70 transition hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {beeLinks.length < MAX_BEE_LINKS && (
              <div className="mt-2 space-y-2">
                <input
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value.slice(0, 30))}
                  placeholder={t("bee.linkLabel", "Rótulo (ex.: Orçamento)")}
                  className="w-full border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2 text-sm text-[#0B0B0D] placeholder:text-[#0B0B0D]/40 focus:outline-none"
                />
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value.slice(0, 500))}
                  placeholder={t("bee.linkUrl", "URL (https://…)")}
                  inputMode="url"
                  className="w-full border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2 text-sm text-[#0B0B0D] placeholder:text-[#0B0B0D]/40 focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  {(["gold", "paper", "ink"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setLinkStyle(style)}
                      className={cn(
                        linkChipClass(style),
                        "border-2",
                        linkStyle === style ? "border-[#F2B705]" : "border-transparent opacity-60",
                      )}
                    >
                      {style === "gold" ? t("bee.styleGold", "Dourado") : style === "paper" ? t("bee.stylePaper", "Papel") : t("bee.styleInk", "Tinta")}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={addLink}
                    className="ml-auto border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1 text-[11px] font-black uppercase tracking-[0.06em] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D] active:translate-x-px active:translate-y-px active:shadow-none"
                  >
                    {t("bee.linkAdd", "Adicionar")}
                  </button>
                </div>
                {linkError && <p className="text-xs text-red-300">{linkError}</p>}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <Label>{t("details.title", "Título")}</Label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
              placeholder={t("details.titlePlaceholder", "Trabalho que fiz ontem…")}
              className="mt-2 w-full border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-sm text-[#0B0B0D] placeholder:text-[#0B0B0D]/40 focus:outline-none"
            />
            <Counter n={title.length} max={MAX_TITLE} />
          </div>
          <div className="mt-4">
            <Label>{t("details.description", "Descrição")}</Label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))} rows={3}
              placeholder={t("details.descriptionPlaceholder", "Conte o contexto…")}
              className="mt-2 w-full resize-none border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-sm text-[#0B0B0D] placeholder:text-[#0B0B0D]/40 focus:outline-none"
            />
            <Counter n={description.length} max={MAX_DESC} />
          </div>
        </>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 border-2 border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          <AlertCircle className="mt-px h-4 w-4 shrink-0" /> <span>{error}</span>
        </div>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#a89f8d]">{children}</label>
}
function Counter({ n, max }: { n: number; max: number }) {
  return <div className="mt-1 text-right text-[10px] tabular-nums text-[#a89f8d]/70">{n}/{max}</div>
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn(
        "border-2 border-[#0B0B0D] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.04em] shadow-[2px_2px_0_0_#0B0B0D]",
        on ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#F1EDE2] text-[#0B0B0D]",
      )}
    >
      {children}
    </button>
  )
}
function Adj({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="range" min={-1} max={1} step={0.01} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-[#F2B705]"
      />
    </div>
  )
}
