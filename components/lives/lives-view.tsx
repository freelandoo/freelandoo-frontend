"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, Hammer, Loader2, Radio, RefreshCw, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { fetchActiveLives } from "@/lib/lives/api"
import type { Live } from "@/lib/lives/types"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { GoLiveOverlay } from "./go-live-overlay"
import { LiveViewerOverlay } from "./live-viewer-overlay"

const SPRING = { type: "spring" as const, stiffness: 120, damping: 20 }

interface LivesViewProps {
  /** Volta para o feed de Bees. */
  onBack: () => void
}

export function LivesView({ onBack }: LivesViewProps) {
  const t = useTranslations("Lives")
  const router = useRouter()
  const [lives, setLives] = useState<Live[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [goLiveOpen, setGoLiveOpen] = useState(false)
  const [viewingId, setViewingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setLives(await fetchActiveLives())
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError", "Erro ao carregar lives"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#0b0804]">
      {/* Modal "em construção": Lives ainda não está liberada — bloqueia a tela
          e o Fechar leva pra conta do usuário. */}
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={SPRING}
          role="dialog"
          aria-modal="true"
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-[#141009] to-black p-6 text-center"
        >
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
            <Hammer className="h-7 w-7 text-red-400" />
          </span>
          <h2 className="mt-4 text-lg font-bold tracking-tight text-white">
            {t("soonTitle", "Estamos construindo")}
          </h2>
          <p className="mt-1 text-sm text-white/65">{t("soonSubtitle", "Em breve.")}</p>
          <button
            type="button"
            onClick={() => router.push("/account")}
            className="mt-5 w-full rounded-full bg-yellow-400 px-6 py-3 text-sm font-bold text-zinc-950 transition hover:bg-yellow-300"
          >
            {t("soonClose", "Fechar")}
          </button>
        </motion.div>
      </div>

      {/* Barra mínima (sem header de site): voltar + título + atualizar */}
      <div className="flex items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label={t("backToBees", "Voltar para Bees")}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex items-center gap-1.5 text-lg font-bold text-white">
          <Radio className="h-5 w-5 text-red-500" /> Lives
        </h1>
        <button
          type="button"
          onClick={load}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
          aria-label={t("refresh", "Atualizar")}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 [scrollbar-width:thin]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-white/60">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-white/80">
            <p className="text-sm">{error}</p>
            <button
              type="button"
              onClick={load}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
            >
              {t("retry", "Tentar de novo")}
            </button>
          </div>
        ) : lives.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/75">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
              <Radio className="h-8 w-8 text-red-400" />
            </span>
            <p className="text-base font-semibold">{t("emptyTitle", "Nenhuma live no ar agora")}</p>
            <p className="max-w-xs text-sm text-white/55">
              {t("emptyDesc", "Seja o primeiro a transmitir. Toque em “Ir ao vivo” e mostre o seu trampo em tempo real.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            {lives.map((live) => (
              <LiveCard key={live.id_live} live={live} onOpen={() => setViewingId(live.id_live)} />
            ))}
          </div>
        )}
      </div>

      {/* CTA fixo: Ir ao vivo */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <motion.button
          type="button"
          onClick={() => setGoLiveOpen(true)}
          whileTap={{ scale: 0.96 }}
          transition={SPRING}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_32px_-8px_rgba(220,38,38,0.7)] transition hover:bg-red-500"
        >
          <Radio className="h-5 w-5" /> {t("goLive", "Ir ao vivo")}
        </motion.button>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {goLiveOpen && (
          <GoLiveOverlay
            open={goLiveOpen}
            onClose={() => setGoLiveOpen(false)}
            onLiveStarted={() => { /* já está transmitindo no overlay */ }}
            onLiveEnded={() => { setGoLiveOpen(false); load() }}
          />
        )}
      </AnimatePresence>

      <LiveViewerOverlay
        liveId={viewingId}
        onClose={() => { setViewingId(null); load() }}
        onEnded={() => { setViewingId(null); load() }}
      />
    </div>
  )
}

function LiveCard({ live, onOpen }: { live: Live; onOpen: () => void }) {
  const ring = live.machine?.color_ring || "#ef4444"
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileTap={{ scale: 0.97 }}
      transition={SPRING}
      className="group relative flex aspect-[3/4] flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 text-left"
    >
      {/* Fundo: avatar do perfil borrado como capa */}
      {live.profile.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={live.profile.avatar_url}
          alt=""
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-[1px] transition group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/80" />

      {/* Selo AO VIVO */}
      <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
      </span>

      {/* Rodapé: avatar + nome */}
      <div className="relative z-10 mt-auto flex items-center gap-2 p-2.5">
        <Avatar className="h-9 w-9 ring-2" style={{ boxShadow: `0 0 0 2px ${ring}` }}>
          {live.profile.avatar_url && (
            <AvatarImage src={live.profile.avatar_url} alt={live.profile.display_name || ""} />
          )}
          <AvatarFallback className="bg-zinc-800 text-[11px] text-white/80">
            {live.profile.display_name?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{live.profile.display_name}</p>
          {live.title ? (
            <p className="truncate text-[11px] text-white/70">{live.title}</p>
          ) : (
            <p className="flex items-center gap-1 text-[11px] text-white/60">
              <Users className="h-3 w-3" /> {live.peak_viewers}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  )
}
