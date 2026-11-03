"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { getToken } from "@/lib/auth"
import { getGear, type GearBag, type GearCatalog, type Receipt } from "../../data"
import { celebrate } from "../rewards/reward-bus"
import type { GearAction, GearTr } from "./gear-card"

export function useWorkshop(t: GearTr, onReceipt?: (receipt: Receipt) => void) {
  const [catalog, setCatalog] = useState<GearCatalog | null>(null)
  const [bag, setBag] = useState<GearBag | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const flight = useRef(false)
  const keys = useRef(new Map<string, string>())
  const alive = useRef(true)
  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return setError(true)
    const result = await getGear(token)
    if (!alive.current) return
    if (!result.ok) { setError(true); return }
    setError(false)
    setCatalog(result.data.gear)
    setBag(result.data.bag)
  }, [])
  useEffect(() => {
    alive.current = true
    void load()
    return () => { alive.current = false }
  }, [load])
  const act: GearAction = useCallback(async (id, operation, success) => {
    const token = getToken()
    if (!token || flight.current) return
    flight.current = true
    setBusy(id)
    setMessage(null)
    // Resposta perdida reutiliza a chave: repetir recupera a mesma tentativa.
    const key = keys.current.get(id) || crypto.randomUUID()
    keys.current.set(id, key)
    try {
      const result = await operation(token, key)
      if (!alive.current) return
      if (!result.ok) {
        const ambiguous = result.status === 0 || result.status >= 500 || result.status === 200
        if (!ambiguous) keys.current.delete(id)
        setMessage(ambiguous ? t("forgeNetworkRetry", "Resposta não confirmada. Confira o estado e repita a mesma ação para recuperar o resultado sem cobrar novamente.") : result.error)
        await load()
        return
      }
      keys.current.delete(id)
      setBag(result.data.bag)
      const story = result.data.receipt?.result
      if (story?.action === "inspect_quest" && typeof story.lore === "string" && typeof story.item === "string") {
        setMessage(t("gearLore_" + story.item, story.lore))
      } else if (success) setMessage(success)
      if (result.data.receipt) (onReceipt || celebrate)(result.data.receipt)
    } finally {
      flight.current = false
      if (alive.current) setBusy(null)
    }
  }, [load, onReceipt, t])
  return { catalog, bag, busy, message, setMessage, error, load, act }
}
