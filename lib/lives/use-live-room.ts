"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  RoomEvent,
  type Participant,
  type Room,
} from "livekit-client"

// Mensagens trafegadas pelo data channel do LiveKit (sem backend no caminho).
export interface ChatMessage {
  id: string
  name: string
  text: string
  ts: number
  self?: boolean
}

export interface GiftBurst {
  id: string
  name: string
  emoji: string
  color: string
  animation: string
  gift_name: string
  ts: number
}

type WirePayload =
  | { t: "chat"; id: string; name: string; text: string; ts: number }
  | { t: "gift"; id: string; name: string; emoji: string; color: string; animation: string; gift_name: string; ts: number }

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const MAX_MESSAGES = 80

interface UseLiveRoomArgs {
  room: Room | null
  /** id_user do dono da live — para excluí-lo da contagem de espectadores. */
  broadcasterUserId: string | null
  selfName: string
}

export function useLiveRoom({ room, broadcasterUserId, selfName }: UseLiveRoomArgs) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [gifts, setGifts] = useState<GiftBurst[]>([])
  const [viewerCount, setViewerCount] = useState(0)
  const selfNameRef = useRef(selfName)
  useEffect(() => { selfNameRef.current = selfName }, [selfName])

  const recomputeViewers = useCallback(
    (r: Room) => {
      const broadcasterIdentity = broadcasterUserId ? `u_${broadcasterUserId}` : null
      const identities = new Set<string>()
      r.remoteParticipants.forEach((p: Participant) => identities.add(p.identity))
      if (r.localParticipant) identities.add(r.localParticipant.identity)
      if (broadcasterIdentity) identities.delete(broadcasterIdentity)
      setViewerCount(identities.size)
    },
    [broadcasterUserId],
  )

  useEffect(() => {
    if (!room) return

    const onData = (payload: Uint8Array) => {
      let msg: WirePayload
      try { msg = JSON.parse(decoder.decode(payload)) as WirePayload } catch { return }
      if (msg.t === "chat") {
        const c = msg
        setMessages((prev) => [...prev, { id: c.id, name: c.name, text: c.text, ts: c.ts }].slice(-MAX_MESSAGES))
      } else if (msg.t === "gift") {
        const g = msg
        setGifts((prev) => [...prev, { id: g.id, name: g.name, emoji: g.emoji, color: g.color, animation: g.animation, gift_name: g.gift_name, ts: g.ts }])
        setMessages((prev) => [...prev, { id: g.id, name: g.name, text: `enviou ${g.emoji} ${g.gift_name}`, ts: g.ts }].slice(-MAX_MESSAGES))
      }
    }

    const onParticipants = () => recomputeViewers(room)

    room.on(RoomEvent.DataReceived, onData)
    room.on(RoomEvent.ParticipantConnected, onParticipants)
    room.on(RoomEvent.ParticipantDisconnected, onParticipants)
    room.on(RoomEvent.Connected, onParticipants)
    recomputeViewers(room)

    return () => {
      room.off(RoomEvent.DataReceived, onData)
      room.off(RoomEvent.ParticipantConnected, onParticipants)
      room.off(RoomEvent.ParticipantDisconnected, onParticipants)
      room.off(RoomEvent.Connected, onParticipants)
    }
  }, [room, recomputeViewers])

  const publish = useCallback((payload: WirePayload) => {
    if (!room?.localParticipant) return
    try {
      room.localParticipant.publishData(encoder.encode(JSON.stringify(payload)), {
        reliable: true,
      })
    } catch { /* ignore */ }
  }, [room])

  const sendChat = useCallback((text: string) => {
    const clean = text.trim().slice(0, 200)
    if (!clean) return
    const payload = { t: "chat" as const, id: crypto.randomUUID(), name: selfNameRef.current, text: clean, ts: Date.now() }
    publish(payload)
    // Eco local (o LiveKit não devolve o próprio data packet).
    setMessages((prev) => [...prev, { id: payload.id, name: payload.name, text: clean, ts: payload.ts, self: true }].slice(-MAX_MESSAGES))
  }, [publish])

  // Dispara um presente (já cobrado no backend): anima localmente + avisa a sala.
  const broadcastGift = useCallback(
    (g: { emoji: string; color: string; animation: string; gift_name: string }) => {
      const payload = {
        t: "gift" as const,
        id: crypto.randomUUID(),
        name: selfNameRef.current,
        emoji: g.emoji,
        color: g.color,
        animation: g.animation,
        gift_name: g.gift_name,
        ts: Date.now(),
      }
      publish(payload)
      setGifts((prev) => [...prev, { ...payload }])
      setMessages((prev) => [...prev, { id: payload.id, name: payload.name, text: `enviou ${g.emoji} ${g.gift_name}`, ts: payload.ts, self: true }].slice(-MAX_MESSAGES))
    },
    [publish],
  )

  const removeGift = useCallback((id: string) => {
    setGifts((prev) => prev.filter((g) => g.id !== id))
  }, [])

  return { messages, gifts, viewerCount, sendChat, broadcastGift, removeGift }
}
