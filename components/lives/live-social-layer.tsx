"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Send, Users } from "lucide-react"
import type { Room } from "livekit-client"
import { getStoredUser } from "@/lib/auth"
import { useLiveRoom } from "@/lib/lives/use-live-room"
import { reportViewers } from "@/lib/lives/api"
import type { Live } from "@/lib/lives/types"
import { GiftAnimationLayer } from "./gift-animation-layer"
import { GiftTray } from "./gift-tray"

interface LiveSocialLayerProps {
  room: Room | null
  live: Live
  role: "broadcaster" | "viewer"
}

export function LiveSocialLayer({ room, live, role }: LiveSocialLayerProps) {
  const selfName = getStoredUser()?.nome || "Você"
  const { messages, gifts, viewerCount, sendChat, broadcastGift, removeGift } = useLiveRoom({
    room,
    broadcasterUserId: live.id_user,
    selfName,
  })
  const [draft, setDraft] = useState("")
  const feedRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll do chat.
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [messages])

  // Transmissor persiste o pico de espectadores (throttle ~5s).
  useEffect(() => {
    if (role !== "broadcaster") return
    const t = setTimeout(() => reportViewers(live.id_live, viewerCount), 800)
    return () => clearTimeout(t)
  }, [role, viewerCount, live.id_live])

  const submit = () => {
    if (!draft.trim()) return
    sendChat(draft)
    setDraft("")
  }

  return (
    <>
      {/* Animações de presentes (fullscreen, não bloqueia toques) */}
      <GiftAnimationLayer gifts={gifts} onDone={removeGift} />

      {/* Contador de espectadores (topo, centro) */}
      <div className="pointer-events-none absolute left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-20 -translate-x-1/2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          <Users className="h-3.5 w-3.5" /> {viewerCount}
        </span>
      </div>

      {/* Chat (canto inferior esquerdo) */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div
          ref={feedRef}
          className="mb-2 max-h-[34vh] w-full max-w-[78%] space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ maskImage: "linear-gradient(to bottom, transparent, black 18%)" }}
        >
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 26 }}
                className="w-fit max-w-full rounded-2xl bg-black/45 px-3 py-1.5 text-sm text-white backdrop-blur"
              >
                <span className="mr-1.5 font-semibold text-yellow-300">{m.name}</span>
                <span className="text-white/90">{m.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Composer + presentes */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 backdrop-blur">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 200))}
              onKeyDown={(e) => { if (e.key === "Enter") submit() }}
              placeholder="Comentar…"
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim()}
              className="text-yellow-300 disabled:text-white/30"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <GiftTray liveId={live.id_live} onSent={broadcastGift} />
        </div>
      </div>
    </>
  )
}
