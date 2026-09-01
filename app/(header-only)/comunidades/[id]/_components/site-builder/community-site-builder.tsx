"use client"

// "Meu Site": construtor/visualizador do site da comunidade (mig 212).
//
// Entra INLINE na aba "Site" da página da comunidade — não é modal. Foi pedido
// assim e a razão é boa: um construtor de página inteira dentro de uma caixinha
// com scroll próprio mente sobre o resultado.
//
// Quem NÃO é líder cai no mesmo componente sem a camada de edição — nenhuma
// barra, nenhum contentEditable. E quem não pode nem ver recebe o aviso de
// trancado, decidido pelo BACKEND (o front nunca é a autoridade sobre isso).

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  Globe,
  Loader2,
  Lock,
  Monitor,
  Palette,
  Plus,
  Smartphone,
  Tablet,
  Upload,
} from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import {
  DEFAULT_SITE_THEME,
  SITE_VIEWPORTS,
  emptySectionData,
  newLocalId,
  type CommunitySiteConfig,
  type CommunitySiteResponse,
  type SiteSection,
  type SiteSectionKind,
  type SiteViewport,
} from "@/types/community-site"
import { SiteCanvas } from "./site-canvas"
import { SiteAddSectionMenu } from "./site-add-section-menu"
import { SiteColorPalettePicker } from "./site-color-palette-picker"
import { SiteDomainsPanel } from "./site-domains-panel"

/** Pausa do autosave. Longa o bastante para um parágrafo virar UM save. */
const AUTOSAVE_MS = 1200

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error"

export function CommunitySiteBuilder({
  idProfile,
  isLeader,
  accent,
}: {
  idProfile: string
  isLeader: boolean
  /** Cor da comunidade — pinta só o CHROME do construtor, não o site. */
  accent: string
}) {
  const t = useTranslations("CommunitySite")

  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [missing, setMissing] = useState(false)
  const [config, setConfig] = useState<CommunitySiteConfig | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewport, setViewport] = useState<SiteViewport>("desktop")
  const [editing, setEditing] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [domainsOpen, setDomainsOpen] = useState(false)

  // Guarda o que está pendente de gravação. Ref e não estado: mudar isso não
  // deve repintar a tela, e o timer precisa enxergar sempre o valor MAIS NOVO
  // (uma captura em closure gravaria o config de 1,2s atrás).
  const pendingRef = useRef<CommunitySiteConfig | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  // ─── Carga ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/communities/${idProfile}/site`, { headers: authHeaders() })
      .then((r) => r.json() as Promise<CommunitySiteResponse & { error?: string }>)
      .then((data) => {
        if (!alive) return
        if (data.error) {
          setError(data.error)
          return
        }
        setLocked(!!data.locked)
        setIsPublished(!!data.is_published)
        if (data.config) {
          setConfig(data.config)
          // Site que ainda não existe abre JÁ em edição para o líder: ele veio
          // aqui para construir, e um passo extra de "editar" só atrasaria.
          if (isLeader && !data.exists) setEditing(true)
        } else {
          setMissing(true)
        }
      })
      .catch(() => {
        if (alive) setError(t("loadError", "Não foi possível carregar o site."))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [idProfile, isLeader, authHeaders, t])

  // ─── Gravação ─────────────────────────────────────────────────────────────
  const persist = useCallback(
    async (next: CommunitySiteConfig) => {
      // Um save por vez: duas requisições simultâneas sobre o MESMO documento
      // podem chegar fora de ordem e o servidor gravaria a versão mais velha.
      if (savingRef.current) {
        pendingRef.current = next
        return
      }
      savingRef.current = true
      setSaveState("saving")
      try {
        const res = await fetch(`/api/communities/${idProfile}/site`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ config: next }),
        })
        const data = (await res.json()) as CommunitySiteResponse & { error?: string }
        if (!res.ok || data.error) {
          setSaveState("error")
          setError(data.error || t("saveError", "Não foi possível salvar."))
          return
        }
        setIsPublished(!!data.is_published)
        setError(null)
        setSaveState("saved")
      } catch {
        setSaveState("error")
        setError(t("saveError", "Não foi possível salvar."))
      } finally {
        savingRef.current = false
        // Alguém editou enquanto este save estava no ar: grava a versão nova.
        const queued = pendingRef.current
        if (queued) {
          pendingRef.current = null
          void persist(queued)
        }
      }
    },
    [idProfile, authHeaders, t]
  )

  const scheduleSave = useCallback(
    (next: CommunitySiteConfig) => {
      pendingRef.current = next
      setSaveState("dirty")
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        const value = pendingRef.current
        pendingRef.current = null
        if (value) void persist(value)
      }, AUTOSAVE_MS)
    },
    [persist]
  )

  const flushSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const value = pendingRef.current
    if (value) {
      pendingRef.current = null
      void persist(value)
    }
  }, [persist])

  // Sair da aba com edição pendente perderia o último trecho digitado.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!editing) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingRef.current || savingRef.current) e.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [editing])

  const applyChange = useCallback(
    (next: CommunitySiteConfig) => {
      setConfig(next)
      scheduleSave(next)
    },
    [scheduleSave]
  )

  // ─── Upload de imagem ─────────────────────────────────────────────────────
  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      const fd = new FormData()
      fd.append("file", file)
      try {
        const res = await fetch(`/api/communities/${idProfile}/site/media`, {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        })
        const data = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !data.url) {
          setError(data.error || t("uploadError", "Não foi possível enviar a imagem."))
          return null
        }
        return data.url
      } catch {
        setError(t("uploadError", "Não foi possível enviar a imagem."))
        return null
      }
    },
    [idProfile, authHeaders, t]
  )

  // ─── Publicação ───────────────────────────────────────────────────────────
  const togglePublish = useCallback(
    async (next: boolean) => {
      // Publicar o que ainda não subiu publicaria a versão ANTERIOR.
      flushSave()
      setPublishing(true)
      try {
        const res = await fetch(`/api/communities/${idProfile}/site/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ published: next }),
        })
        const data = (await res.json()) as CommunitySiteResponse & { error?: string }
        if (!res.ok || data.error) {
          setError(data.error || t("publishError", "Não foi possível publicar."))
          return
        }
        setIsPublished(!!data.is_published)
        setError(null)
      } catch {
        setError(t("publishError", "Não foi possível publicar."))
      } finally {
        setPublishing(false)
      }
    },
    [idProfile, authHeaders, flushSave, t]
  )

  const addSection = useCallback(
    (kind: SiteSectionKind) => {
      if (!config) return
      const section = {
        id: newLocalId(),
        kind,
        enabled: true,
        title: "",
        subtitle: "",
        data: emptySectionData(kind),
      } as SiteSection
      applyChange({ ...config, sections: [...config.sections, section] })
    },
    [config, applyChange]
  )

  const frameWidth = SITE_VIEWPORTS[viewport]
  const statusLabel = useMemo(() => {
    switch (saveState) {
      case "saving":
        return t("statusSaving", "Salvando…")
      case "dirty":
        return t("statusPending", "Alterações pendentes")
      case "saved":
        return t("statusSaved", "Todas as alterações salvas")
      case "error":
        return t("statusError", "Falha ao salvar")
      default:
        return ""
    }
  }, [saveState, t])

  // ─── Estados de borda ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: accent }} />
      </div>
    )
  }

  if (locked) {
    return (
      <div className="border-2 border-[#0B0B0D] bg-[#15120E] px-6 py-14 text-center">
        <Lock className="mx-auto h-10 w-10" style={{ color: accent }} />
        <p className="mt-3 text-sm text-[#F5F1E8]/70">
          {t("lockedNotice", "Entre na comunidade para ver o site dela.")}
        </p>
      </div>
    )
  }

  if (missing || !config) {
    return (
      <div className="border-2 border-[#0B0B0D] bg-[#15120E] px-6 py-14 text-center">
        <Globe className="mx-auto h-10 w-10" style={{ color: accent }} />
        <p className="mt-3 text-sm text-[#F5F1E8]/70">
          {error || t("noSiteYet", "Esta comunidade ainda não publicou um site.")}
        </p>
      </div>
    )
  }

  return (
    <div className="fl-sharp">
      {isLeader && (
        <div
          className="sticky top-0 z-40 mb-4 flex flex-wrap items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] p-2"
          style={{ boxShadow: "4px 4px 0 0 #0B0B0D" }}
        >
          {/* Editar × Ver: o mesmo canvas, com e sem a camada de edição. É a
              prévia mais honesta possível — não há segunda árvore para divergir. */}
          <button
            type="button"
            onClick={() => {
              if (editing) flushSave()
              setEditing((v) => !v)
            }}
            className="border-2 border-[#0B0B0D] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em]"
            style={
              editing
                ? { background: accent, color: "#0B0B0D" }
                : { background: "#1D1810", color: "#F5F1E8" }
            }
          >
            {editing ? t("modeEditing", "Editando") : t("modeViewing", "Visualizando")}
          </button>

          <div className="flex items-center gap-1">
            {(
              [
                ["desktop", Monitor, t("viewportDesktop", "Desktop")],
                ["tablet", Tablet, t("viewportTablet", "Tablet")],
                ["mobile", Smartphone, t("viewportMobile", "Celular")],
              ] as const
            ).map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setViewport(key)}
                title={label}
                aria-label={label}
                aria-pressed={viewport === key}
                className="grid h-9 w-9 place-items-center border-2 border-[#0B0B0D]"
                style={
                  viewport === key
                    ? { background: accent, color: "#0B0B0D" }
                    : { background: "#1D1810", color: "#9A938A" }
                }
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {editing && (
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAddOpen((v) => !v)}
                  aria-expanded={addOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8]"
                >
                  <Plus className="h-4 w-4" style={{ color: accent }} />
                  {t("addSection", "Adicionar seção")}
                </button>
                {addOpen && (
                  <SiteAddSectionMenu
                    onPick={addSection}
                    onClose={() => setAddOpen(false)}
                    t={t}
                  />
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPaletteOpen((v) => !v)}
                  aria-expanded={paletteOpen}
                  className="flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8]"
                >
                  <Palette className="h-4 w-4" style={{ color: accent }} />
                  {t("paletteButton", "Cores")}
                  <span
                    className="ml-1 h-4 w-4 border-2 border-[#0B0B0D]"
                    style={{ background: config.theme.primary }}
                  />
                </button>
                {paletteOpen && (
                  <SiteColorPalettePicker
                    theme={config.theme}
                    onChange={(theme) => applyChange({ ...config, theme })}
                    onClose={() => setPaletteOpen(false)}
                    t={t}
                  />
                )}
              </div>
            </>
          )}

          <span className="ml-auto flex items-center gap-2 px-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
            {saveState === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saveState === "saved" && <Check className="h-3.5 w-3.5" style={{ color: accent }} />}
            {statusLabel}
          </span>

          {isPublished && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDomainsOpen((v) => !v)}
                aria-expanded={domainsOpen}
                className="flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8]"
              >
                <Globe className="h-4 w-4" style={{ color: accent }} />
                {t("domainsButton", "Endereço")}
              </button>
              {domainsOpen && (
                <SiteDomainsPanel
                  idProfile={idProfile}
                  accent={accent}
                  onClose={() => setDomainsOpen(false)}
                  t={t}
                />
              )}
            </div>
          )}

          <button
            type="button"
            disabled={publishing}
            onClick={() => void togglePublish(!isPublished)}
            className="flex items-center gap-1.5 border-2 border-[#0B0B0D] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] disabled:opacity-60"
            style={
              isPublished
                ? { background: "#1D1810", color: "#F5F1E8" }
                : { background: accent, color: "#0B0B0D" }
            }
          >
            {publishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isPublished ? (
              <Globe className="h-3.5 w-3.5" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {isPublished ? t("unpublish", "Publicado · despublicar") : t("publish", "Publicar site")}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-3 border-2 border-[#0B0B0D] bg-[#2a1410] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#ff8c7a]">
          {error}
        </div>
      )}

      {isLeader && !isPublished && (
        <div className="mb-3 border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
          {t("draftNotice", "Rascunho — só você enxerga este site até publicar.")}
        </div>
      )}

      {/* Moldura da prévia. Em Desktop o site ocupa a largura toda; nos outros
          a largura é travada para simular o aparelho, com fundo neutro em volta
          para a borda do "aparelho" ficar legível. */}
      <div
        className="flex w-full justify-center"
        style={frameWidth ? { background: "#0B0B0D", padding: "16px 8px" } : undefined}
      >
        <div
          className="w-full border-2 border-[#0B0B0D]"
          style={frameWidth ? { maxWidth: frameWidth } : undefined}
        >
          <SiteCanvas
            config={config}
            editing={editing && isLeader}
            onChange={applyChange}
            onUpload={uploadImage}
            t={t}
          />
        </div>
      </div>
    </div>
  )
}

export { DEFAULT_SITE_THEME }
