"use client"

// Editor de criação unificado (Post · Bee · Story) — pele Freelandoo Tabloide.
// Fluxo: Pick → Crop/Zoom → Editar (Filtro·Texto·Sobreposição·Música) → Detalhes → Publicar.
// Visual queimado via ComposerRenderer (mesmo shader da câmera) + StoryRecorder.
// Slice 1: Filtro funcional; Texto/Sobreposição/Música entram nos slices 2/3/5.

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle, ArrowLeft, ArrowRight, ImagePlus, Loader2, Music,
  SlidersHorizontal, Sparkles, Type, Layers, Video, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getToken } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { CameraStudio } from "@/components/camera/CameraStudio"
import { PRESETS, DEFAULT_PRESET_ID, getPreset } from "@/lib/camera/presets"
import { uploadStory } from "@/lib/camera/upload"
import type { FilterState, FilterMeta } from "@/lib/camera/types"
import { ComposerRenderer } from "@/lib/composer/renderer"
import { compose } from "@/lib/composer/compose"
import { drawTextLayers, layerBox } from "@/lib/composer/text-layer"
import {
  ASPECTS, NEUTRAL_CROP, TEXT_COLORS, TEXT_FONTS,
  type ComposerProps, type CropState, type MediaDraft, type MediaKind,
  type TextLayer, type TextFontId, type TextBoxStyle, type OverlayLayer,
} from "@/lib/composer/types"
import { ProfileSelect, type ProfileLite } from "./ProfileSelect"

type Step = "pick" | "crop" | "edit" | "details" | "publish"
type EditTab = "filtro" | "texto" | "sobreposicao" | "musica"

const MAX_BYTES = 80 * 1024 * 1024
const MAX_TITLE = 120
const MAX_DESC = 500
const MAX_CAPTION = 280

/** Proporções permitidas por modo. */
function aspectsFor(mode: ComposerProps["mode"]): string[] {
  return mode === "post" ? ["4:5", "1:1", "16:9"] : ["9:16"]
}

export function MediaComposer({ open, mode, initialKind = "rest", onClose, onPosted }: ComposerProps) {
  const router = useRouter()
  const { user, status } = useAuth()

  const [step, setStep] = useState<Step>("pick")
  const [editTab, setEditTab] = useState<EditTab>("filtro")
  const [draft, setDraft] = useState<MediaDraft | null>(null)
  const [crop, setCrop] = useState<CropState>(NEUTRAL_CROP)
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID)
  const [filter, setFilter] = useState<FilterState>(getPreset(DEFAULT_PRESET_ID).filter)
  const [textLayers, setTextLayers] = useState<TextLayer[]>([])
  const [activeTextId, setActiveTextId] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<OverlayLayer | null>(null)

  const [profiles, setProfiles] = useState<ProfileLite[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [caption, setCaption] = useState("")

  const [progress, setProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)

  const fileRef = useRef<HTMLInputElement | null>(null)
  const overlayInputRef = useRef<HTMLInputElement | null>(null)
  const overlayElRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null)
  const overlayRef = useRef<OverlayLayer | null>(overlay)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<ComposerRenderer | null>(null)
  const sourceRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const filterRef = useRef(filter)
  const cropRef = useRef(crop)
  const textRef = useRef<TextLayer[]>(textLayers)
  useEffect(() => { filterRef.current = filter }, [filter])
  useEffect(() => { cropRef.current = crop }, [crop])
  useEffect(() => { textRef.current = textLayers }, [textLayers])
  useEffect(() => { overlayRef.current = overlay }, [overlay])

  const allowedAspects = aspectsFor(mode)
  const selectedProfile = profiles.find((p) => p.id_profile === selectedProfileId) || null
  const trampoBlocked = mode === "story" && initialKind === "trampo" && !!selectedProfile?.is_clan

  // ── reset ao fechar ────────────────────────────────────────────────────────
  const hardReset = useCallback(() => {
    if (draft?.url) URL.revokeObjectURL(draft.url)
    setStep("pick"); setEditTab("filtro"); setDraft(null); setCrop(NEUTRAL_CROP)
    setPresetId(DEFAULT_PRESET_ID); setFilter(getPreset(DEFAULT_PRESET_ID).filter)
    setTextLayers([]); setActiveTextId(null)
    if (overlay?.url) URL.revokeObjectURL(overlay.url)
    const el = overlayElRef.current
    if (el instanceof HTMLVideoElement) { el.pause(); el.src = "" }
    overlayElRef.current = null
    setOverlay(null)
    setTitle(""); setDescription(""); setCaption(""); setProgress(0); setSubmitting(false); setError(null)
    setCameraOpen(false)
  }, [draft?.url, overlay?.url])

  useEffect(() => {
    if (!open) hardReset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── abre o seletor nativo automaticamente no mobile ao abrir ─────────────────
  useEffect(() => {
    if (!open || draft) return
    const isTouch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches
    if (isTouch) fileRef.current?.click()
  }, [open, draft])

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
        if (list.length && !selectedProfileId) setSelectedProfileId(list[0].id_profile)
      })
      .catch(() => { if (!cancelled) setProfiles([]) })
      .finally(() => { if (!cancelled) setLoadingProfiles(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status, user?.id_user])

  // ── seleção de arquivo ───────────────────────────────────────────────────────
  const handleFile = (f: File | null) => {
    setError(null)
    if (!f) return
    const isImg = f.type.startsWith("image/")
    const isVid = f.type.startsWith("video/")
    if (!isImg && !isVid) { setError("Selecione uma imagem ou um vídeo."); return }
    if (f.size > MAX_BYTES) { setError("Arquivo acima de 80MB. Reduza ou corte."); return }
    const url = URL.createObjectURL(f)
    const kind: MediaKind = isImg ? "image" : "video"
    const aspect = ASPECTS[allowedAspects[0]].ratio
    setCrop({ ...NEUTRAL_CROP, aspect })

    if (kind === "image") {
      const img = new Image()
      img.onload = () => {
        setDraft({ file: f, kind, url, width: img.naturalWidth, height: img.naturalHeight })
        setStep("crop")
      }
      img.onerror = () => setError("Não consegui ler essa imagem.")
      img.src = url
    } else {
      const v = document.createElement("video")
      v.preload = "metadata"
      v.onloadedmetadata = () => {
        setDraft({ file: f, kind, url, width: v.videoWidth, height: v.videoHeight, durationSec: Math.round(v.duration) })
        setStep("crop")
      }
      v.onerror = () => setError("Não consegui ler esse vídeo.")
      v.src = url
    }
  }

  // ── preview ao vivo (crop + edit) ────────────────────────────────────────────
  useEffect(() => {
    const live = step === "crop" || step === "edit"
    if (!live || !draft || !canvasRef.current) return
    let disposed = false

    const setup = async () => {
      // monta a fonte
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
      // tamanho do preview proporcional ao aspect
      const baseW = 720
      r.setSize(baseW, Math.round(baseW / cropRef.current.aspect))
      // texto sobreposto desenhado por cima da cor (mesmo no preview e no export)
      r.afterCompose = (ctx, w, h) => { drawOverlayLayer(ctx, w, h); drawTextLayers(ctx, w, h, textRef.current) }
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

  // ── arraste no preview: pan (crop) ou mover texto (edit) ─────────────────────
  const dragRef = useRef<{ x: number; y: number; textId?: string; overlay?: boolean } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (step === "edit" && canvas) {
      // hit-test em camadas de texto (de cima p/ baixo) → texto tem prioridade
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
      // hit-test no overlay PiP
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
      setOverlay((o) => o ? { ...o, x: Math.max(0, Math.min(1, o.x + dx)), y: Math.max(0, Math.min(1, o.y + dy)) } : o)
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
  const drawOverlayLayer = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const ov = overlayRef.current
    const el = overlayElRef.current
    if (!ov || !el) return
    const natW = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth
    const natH = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight
    if (!natW || !natH) return
    const w = ov.scale * W
    const h = w * (natH / natW)
    const x = ov.x * W - w / 2
    const y = ov.y * H - h / 2
    try {
      ctx.save()
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = w * 0.06; ctx.shadowOffsetY = w * 0.03
      ctx.drawImage(el, x, y, w, h)
      ctx.restore()
      ctx.lineWidth = Math.max(2, w * 0.02)
      ctx.strokeStyle = "#F2B705"
      ctx.strokeRect(x, y, w, h)
    } catch { /* frame não decodável ainda */ }
  }, [])

  const handleOverlayFile = (f: File | null) => {
    if (!f) return
    const isImg = f.type.startsWith("image/")
    const isVid = f.type.startsWith("video/")
    if (!isImg && !isVid) { setError("Sobreposição deve ser imagem ou vídeo."); return }
    if (f.size > MAX_BYTES) { setError("Sobreposição acima de 80MB."); return }
    // limpa anterior
    if (overlay?.url) URL.revokeObjectURL(overlay.url)
    const prev = overlayElRef.current
    if (prev instanceof HTMLVideoElement) { prev.pause(); prev.src = "" }
    const url = URL.createObjectURL(f)
    const kind: MediaKind = isImg ? "image" : "video"
    const layer: OverlayLayer = { id: crypto.randomUUID(), kind, url, x: 0.7, y: 0.7, scale: 0.32 }
    if (kind === "image") {
      const img = new Image(); img.crossOrigin = "anonymous"
      img.onload = () => { overlayElRef.current = img; setOverlay(layer) }
      img.onerror = () => setError("Não consegui ler a imagem de sobreposição.")
      img.src = url
    } else {
      const v = document.createElement("video")
      v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.crossOrigin = "anonymous"
      v.onloadeddata = () => { v.play().catch(() => {}); overlayElRef.current = v; setOverlay(layer) }
      v.onerror = () => setError("Não consegui ler o vídeo de sobreposição.")
    }
  }
  const removeOverlay = () => {
    if (overlay?.url) URL.revokeObjectURL(overlay.url)
    const el = overlayElRef.current
    if (el instanceof HTMLVideoElement) { el.pause(); el.src = "" }
    overlayElRef.current = null
    setOverlay(null)
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
    setActiveTextId((cur) => (cur === id ? null : cur))
  }

  // ── publicar ─────────────────────────────────────────────────────────────────
  const applyPreset = (id: string) => { setPresetId(id); setFilter({ ...getPreset(id).filter }) }
  const setAdj = (k: keyof FilterState, v: number) => setFilter((f) => ({ ...f, [k]: v }))

  const effectiveKind = trampoBlocked ? "rest" : initialKind

  const publish = async () => {
    if (!draft || !selectedProfileId) return
    const token = getToken()
    if (!token) { setError("Sessão expirada. Faça login novamente."); return }
    setStep("publish"); setSubmitting(true); setProgress(0); setError(null)
    try {
      // garante que as fontes estão carregadas antes de queimar o texto no canvas
      try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready } catch { /* noop */ }
      const layers = textLayers
      const result = await compose({
        draft, filter, crop,
        afterCompose: (ctx, w, h) => { drawOverlayLayer(ctx, w, h); drawTextLayers(ctx, w, h, layers) },
        onProgress: (f) => setProgress(f * 0.5),
      })
      if (mode === "story") {
        const filterMeta: FilterMeta = {
          preset: presetId, filter,
          overlay: { frame: "none", watermark: false, sticker_count: 0, accessory: "none" },
          makeup: { skin_smooth: 0, lipstick: 0, blush: 0 },
          encoder: result.encoder === "image" ? "webcodecs" : result.encoder,
        }
        // Story exige vídeo no backend atual; foto vira "vídeo" só quando houver
        // suporte — por ora, story de foto não é suportado (slice futuro). Guarda:
        if (result.kind === "image") {
          setError("Story de foto chega em breve. Por enquanto use vídeo.")
          setStep("details"); setSubmitting(false); return
        }
        await uploadStory({
          token, id_profile: selectedProfileId, kind: effectiveKind,
          videoBlob: result.blob, posterBlob: result.posterBlob,
          durationSeconds: result.durationSec, width: result.width, height: result.height,
          caption: caption.trim() || undefined, filterMeta,
          onProgress: (f) => setProgress(0.5 + f * 0.5),
        })
      } else {
        // Post/Bee: wiring completo no slice 6 (migração dos composers existentes).
        setError("Publicação de Post/Bee por este editor chega no próximo slice.")
        setStep("details"); setSubmitting(false); return
      }
      onPosted?.(); onClose(); router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao publicar.")
      setStep("details")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const modeLabel = mode === "post" ? "Novo Post" : mode === "bee" ? "Novo Bee" : "Story"
  const canAdvanceFromCrop = !!draft
  const canPublish = !!draft && !!selectedProfileId && !trampoBlockedFatal(mode, profiles, selectedProfile)

  return (
    <div className="fl-root fixed inset-0 z-[95] flex items-stretch justify-center bg-[#141009]">
      <input
        ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />
      <input
        ref={overlayInputRef} type="file" accept="image/*,video/*" className="hidden"
        onChange={(e) => { handleOverlayFile(e.target.files?.[0] || null); e.target.value = "" }}
      />
      <div className="relative flex h-full w-full max-w-[560px] flex-col overflow-hidden border-x-2 border-[#0B0B0D] bg-[#141009]">
        {/* App bar tabloide */}
        <header className="flex items-center justify-between border-b-2 border-[#F1EDE2]/12 px-3 py-2.5">
          <button
            type="button"
            onClick={() => {
              if (step === "crop") { setStep("pick"); if (draft?.url) URL.revokeObjectURL(draft.url); setDraft(null) }
              else if (step === "edit") setStep("crop")
              else if (step === "details") setStep("edit")
              else onClose()
            }}
            className="grid h-8 w-8 place-items-center text-[#F1EDE2]"
            aria-label="Voltar"
          >
            {step === "pick" ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </button>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-anton)] text-lg uppercase text-[#F2B705]">
            {modeLabel}
            {mode === "story" && (
              <span className={cn(
                "border-2 border-[#0B0B0D] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em]",
                effectiveKind === "trampo" ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#F1EDE2] text-[#0B0B0D]",
              )}>
                {effectiveKind}
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
                      <Chip key={a} on={Math.abs(crop.aspect - ASPECTS[a].ratio) < 0.001} onClick={() => setCrop((c) => ({ ...c, aspect: ASPECTS[a].ratio }))}>
                        {ASPECTS[a].label}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>

              {step === "crop" && (
                <div className="border-t-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-3">
                  <Label>Zoom</Label>
                  <input
                    type="range" min={1} max={3} step={0.01} value={crop.zoom}
                    onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
                    className="fl-range mt-2 w-full"
                  />
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#a89f8d]">Arraste a imagem para reposicionar</p>
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
                  onOverlayScale={(s) => setOverlay((o) => (o ? { ...o, scale: s } : o))}
                  onRemoveOverlay={removeOverlay}
                />
              )}
            </div>
          )}

          {step === "details" && (
            <DetailsStep
              mode={mode} userName={user?.nome || null}
              profiles={profiles} loadingProfiles={loadingProfiles}
              selectedProfileId={selectedProfileId} onSelectProfile={setSelectedProfileId}
              ineligible={(p) => (mode === "story" && initialKind === "trampo" && p.is_clan ? "Clan não posta Trampo — só Rest" : null)}
              title={title} setTitle={setTitle} description={description} setDescription={setDescription}
              caption={caption} setCaption={setCaption}
              error={error}
            />
          )}

          {step === "publish" && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#F1EDE2]/15 border-t-[#F2B705]" />
              <div className="font-[family-name:var(--font-anton)] text-xl uppercase text-[#F2B705]">Renderizando</div>
              <div className="w-56">
                <div className="mb-1 flex justify-between text-[10px] font-black uppercase tracking-[0.1em] text-[#a89f8d]">
                  <span>Enviando ao R2</span><span className="tabular-nums">{Math.round(progress * 100)}%</span>
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
          kind={effectiveKind}
          caption={caption.trim() || undefined}
          onClose={() => setCameraOpen(false)}
          onPosted={() => { setCameraOpen(false); onPosted?.(); onClose(); router.refresh() }}
        />
      )}
    </div>
  )
}

/** Story trampo bloqueado em clan não é fatal (vira rest); nunca trava publish. */
function trampoBlockedFatal(_mode: string, _profiles: ProfileLite[], _p: ProfileLite | null): boolean {
  return false
}

// ─── peças ──────────────────────────────────────────────────────────────────

function StepAction({ step, disabledNext, onNext, mode }: { step: Step; disabledNext: boolean; onNext: () => void; mode: string }) {
  if (step === "pick" || step === "publish") return <span className="w-8" />
  const label = step === "details" ? (mode === "story" ? "Publicar" : "Compartilhar") : "Avançar"
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

function PickStep({ onPick, onCamera, error }: { onPick: () => void; onCamera?: () => void; error: string | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="font-[family-name:var(--font-anton)] text-4xl uppercase text-[#F2B705]">EXTRA!</div>
      <p className="max-w-xs text-sm text-[#d6cfbf]">Toque para escolher uma foto ou vídeo da sua galeria.</p>
      <button
        type="button" onClick={onPick}
        className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0B0B0D]"
      >
        <ImagePlus className="h-4 w-4" /> Selecionar mídia
      </button>
      {onCamera && (
        <button
          type="button" onClick={onCamera}
          className="flex items-center gap-2 border-2 border-[#F1EDE2]/25 bg-transparent px-5 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#F1EDE2] transition hover:border-[#F1EDE2]"
        >
          <Video className="h-4 w-4" /> Gravar com a câmera
        </button>
      )}
      {error && (
        <div className="flex items-center gap-2 border-2 border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
    </div>
  )
}

function EditPanel({
  tab, onTab, presetId, onPreset, filter, onAdj,
  textLayers, activeTextId, setActiveTextId, onAddText, onUpdateText, onRemoveText,
  overlay, onPickOverlay, onOverlayScale, onRemoveOverlay,
}: {
  tab: EditTab; onTab: (t: EditTab) => void
  presetId: string; onPreset: (id: string) => void
  filter: FilterState; onAdj: (k: keyof FilterState, v: number) => void
  textLayers: TextLayer[]; activeTextId: string | null; setActiveTextId: (id: string | null) => void
  onAddText: () => void; onUpdateText: (id: string, patch: Partial<TextLayer>) => void; onRemoveText: (id: string) => void
  overlay: OverlayLayer | null; onPickOverlay: () => void; onOverlayScale: (s: number) => void; onRemoveOverlay: () => void
}) {
  const tabs: { id: EditTab; label: string; icon: React.ReactNode }[] = [
    { id: "filtro", label: "Filtro", icon: <SlidersHorizontal className="h-4 w-4" /> },
    { id: "texto", label: "Texto", icon: <Type className="h-4 w-4" /> },
    { id: "sobreposicao", label: "Sobrepor", icon: <Layers className="h-4 w-4" /> },
    { id: "musica", label: "Música", icon: <Music className="h-4 w-4" /> },
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
            <Adj label="Brilho" value={filter.brightness} onChange={(v) => onAdj("brightness", v)} />
            <Adj label="Contraste" value={filter.contrast} onChange={(v) => onAdj("contrast", v)} />
            <Adj label="Saturação" value={filter.saturation} onChange={(v) => onAdj("saturation", v)} />
            <Adj label="Temperatura" value={filter.temperature} onChange={(v) => onAdj("temperature", v)} />
          </div>
        ) : tab === "texto" ? (
          <TextEditor
            layers={textLayers} activeId={activeTextId} setActiveId={setActiveTextId}
            onAdd={onAddText} onUpdate={onUpdateText} onRemove={onRemoveText}
          />
        ) : tab === "sobreposicao" ? (
          <OverlayEditor overlay={overlay} onPick={onPickOverlay} onScale={onOverlayScale} onRemove={onRemoveOverlay} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Sparkles className="h-6 w-6 text-[#F2B705]" />
            <p className="font-[family-name:var(--font-anton)] text-lg uppercase text-[#F1EDE2]">Em breve</p>
            <p className="max-w-[220px] text-xs text-[#a89f8d]">Biblioteca de música chega em breve.</p>
          </div>
        )}
      </div>
      <div className="flex items-stretch border-t-2 border-[#0B0B0D]">
        {tabs.map((t) => (
          <button
            key={t.id} type="button" onClick={() => onTab(t.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[9px] font-black uppercase tracking-[0.05em] transition",
              tab === t.id ? "bg-[#F2B705] text-[#0B0B0D]" : "text-[#a89f8d]",
            )}
          >
            {t.icon}{t.label}
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
                {l.text || "(vazio)"}
              </button>
            ))}
          </div>
        )}
        <button
          type="button" onClick={onAdd}
          className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
        >
          <Type className="h-4 w-4" /> Adicionar texto
        </button>
        <p className="max-w-[220px] text-[10px] uppercase tracking-[0.1em] text-[#a89f8d]">Arraste o texto no preview para posicionar</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <textarea
        value={active.text}
        onChange={(e) => onUpdate(active.id, { text: e.target.value.slice(0, 120) })}
        rows={2} autoFocus
        placeholder="Escreva algo…"
        className="w-full resize-none border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2 text-sm text-[#0B0B0D] placeholder:text-[#0B0B0D]/40 focus:outline-none"
      />
      <div>
        <Label>Fonte</Label>
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
        <Label>Caixa</Label>
        <div className="mt-1.5 flex gap-2">
          {(["rounded", "transparent"] as TextBoxStyle[]).map((b) => (
            <button
              key={b} type="button" onClick={() => onUpdate(active.id, { box: b })}
              className={cn(
                "flex-1 border-2 border-[#0B0B0D] px-2 py-1.5 text-[11px] font-black uppercase tracking-[0.06em]",
                active.box === b ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#F1EDE2] text-[#0B0B0D]",
              )}
            >
              {b === "rounded" ? "Arredondada" : "Transparente"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Cor do texto</Label>
        <Swatches value={active.color} onPick={(c) => onUpdate(active.id, { color: c })} />
      </div>
      {active.box === "rounded" && (
        <div>
          <Label>Cor da caixa</Label>
          <Swatches value={active.boxColor} onPick={(c) => onUpdate(active.id, { boxColor: c })} />
        </div>
      )}
      <div>
        <Label>Tamanho</Label>
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
          Concluir
        </button>
        <button
          type="button" onClick={() => onRemove(active.id)}
          className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[#F2B705]"
          aria-label="Remover texto"
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
  if (!overlay) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <button
          type="button" onClick={onPick}
          className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
        >
          <Layers className="h-4 w-4" /> Adicionar imagem/vídeo
        </button>
        <p className="max-w-[220px] text-[10px] uppercase tracking-[0.1em] text-[#a89f8d]">Cole uma foto ou vídeo por cima — arraste no preview para posicionar</p>
      </div>
    )
  }
  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2 text-[11px] font-black uppercase tracking-[0.06em] text-[#0B0B0D]">
        <Layers className="h-4 w-4" /> Sobreposição de {overlay.kind === "video" ? "vídeo" : "imagem"}
      </div>
      <div>
        <Label>Tamanho</Label>
        <input
          type="range" min={0.15} max={0.7} step={0.01} value={overlay.scale}
          onChange={(e) => onScale(Number(e.target.value))}
          className="mt-1.5 w-full accent-[#F2B705]"
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onPick} className="flex-1 border-2 border-[#0B0B0D] bg-[#F1EDE2] py-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#0B0B0D]">Trocar</button>
        <button type="button" onClick={onRemove} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[#F2B705]" aria-label="Remover sobreposição"><X className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

function Swatches({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="mt-1.5 flex gap-2">
      {TEXT_COLORS.map((c) => (
        <button
          key={c} type="button" onClick={() => onPick(c)} aria-label={`Cor ${c}`}
          className={cn("h-7 w-7 border-2 border-[#0B0B0D]", value.toLowerCase() === c.toLowerCase() && "shadow-[0_0_0_2px_#F2B705]")}
          style={{ background: c }}
        />
      ))}
    </div>
  )
}

function DetailsStep({
  mode, userName, profiles, loadingProfiles, selectedProfileId, onSelectProfile, ineligible,
  title, setTitle, description, setDescription, caption, setCaption, error,
}: {
  mode: string; userName: string | null
  profiles: ProfileLite[]; loadingProfiles: boolean
  selectedProfileId: string | null; onSelectProfile: (id: string) => void
  ineligible: (p: ProfileLite) => string | null
  title: string; setTitle: (s: string) => void
  description: string; setDescription: (s: string) => void
  caption: string; setCaption: (s: string) => void
  error: string | null
}) {
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <Label>Publicar como</Label>
      <div className="mt-2">
        {loadingProfiles ? (
          <div className="flex items-center gap-2 text-sm text-[#a89f8d]"><Loader2 className="h-4 w-4 animate-spin text-[#F2B705]" /> Carregando perfis…</div>
        ) : profiles.length === 0 ? (
          <p className="border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-sm text-[#0B0B0D]">Sem subperfis elegíveis. Crie um subperfil para postar.</p>
        ) : (
          <ProfileSelect userName={userName} profiles={profiles} selectedId={selectedProfileId} onSelect={onSelectProfile} ineligible={ineligible} />
        )}
      </div>

      {mode === "story" ? (
        <div className="mt-5">
          <Label>Legenda (opcional)</Label>
          <textarea
            value={caption} onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))} rows={2}
            placeholder="Diga algo curto…"
            className="fl-input mt-2 w-full resize-none border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-sm text-[#0B0B0D] placeholder:text-[#0B0B0D]/40 focus:outline-none"
          />
          <Counter n={caption.length} max={MAX_CAPTION} />
        </div>
      ) : (
        <>
          <div className="mt-5">
            <Label>Título</Label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
              placeholder="Trabalho que fiz ontem…"
              className="mt-2 w-full border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-sm text-[#0B0B0D] placeholder:text-[#0B0B0D]/40 focus:outline-none"
            />
            <Counter n={title.length} max={MAX_TITLE} />
          </div>
          <div className="mt-4">
            <Label>Descrição</Label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))} rows={3}
              placeholder="Conte o contexto…"
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
