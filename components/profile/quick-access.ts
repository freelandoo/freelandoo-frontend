"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Baby,
  Building2,
  Car,
  DollarSign,
  Dumbbell,
  Gamepad2,
  PawPrint,
  Signpost,
  Star,
  type LucideIcon,
} from "lucide-react"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { useUserFeature } from "@/components/feature-flags/UserFeaturesProvider"
import { getPublicBackendUrl } from "@/lib/backend-public"
import { getToken } from "@/lib/auth"

/**
 * O ACESSO RÁPIDO DO PERFIL (mig 260) — fonte ÚNICA da cor de cada espaço.
 *
 * Pedido do Alex (2026-09-24): no menu da foto, "cada um da cor da sua página",
 * e "uma maneira de gerenciar pills, e você pode escolher quais ficam no acesso
 * rápido do perfil". A mesma entrada serve os DOIS lugares — a linha do menu e
 * o pill atrás da foto — porque a cor é da PÁGINA de destino: escrita duas
 * vezes, o pill do carro e a linha do carro sairiam em vermelhos diferentes na
 * primeira troca de paleta. Mexeu na cor de uma página? Mexe aqui.
 *
 * ⚠️ As CHAVES são espelho de `utils/quickPills.js` no backend: chave nova entra
 * nos dois lugares, senão ela é descartada ao gravar.
 */
export type QuickKey =
  | "business"
  | "wallet"
  | "fitness"
  | "games"
  | "pet"
  | "car"
  | "condo"
  | "neighborhood"
  | "children"

export type QuickEntry = {
  key: QuickKey
  icon: LucideIcon
  /** Chave do namespace `Spaces`. */
  labelKey: string
  fallback: string
  bg: string
  bgHover: string
  /** Tinta sobre `bg` — preta nas cores claras, creme nas escuras. */
  fg: string
}

const CREAM = "#F1EDE2"
const INK = "#0B0B0D"

export const QUICK_ENTRIES: Record<QuickKey, QuickEntry> = {
  business: { key: "business", icon: Star, labelKey: "qpBusiness", fallback: "Business", bg: "#BE185D", bgHover: "#9F1239", fg: CREAM },
  wallet: { key: "wallet", icon: DollarSign, labelKey: "qpWallet", fallback: "Carteira", bg: "#15803D", bgHover: "#166F36", fg: CREAM },
  // O laranja escuro do ambiente fitness (`EMBER` em fitness-ui.ts).
  fitness: { key: "fitness", icon: Dumbbell, labelKey: "qpFitness", fallback: "Fitness", bg: "#9A3412", bgHover: "#7C2D12", fg: CREAM },
  games: { key: "games", icon: Gamepad2, labelKey: "qpGames", fallback: "Games", bg: "#6D28D9", bgHover: "#5B21B6", fg: CREAM },
  // O marrom-tan travado da pele do pet (`brown` em community-ui.ts).
  pet: { key: "pet", icon: PawPrint, labelKey: "myPet", fallback: "Meu pet", bg: "#A97C50", bgHover: "#8A6440", fg: INK },
  // O vermelho da pele `.fl-car`.
  car: { key: "car", icon: Car, labelKey: "myCar", fallback: "Meu carro", bg: "#B91C1C", bgHover: "#991B1B", fg: CREAM },
  // O grafite travado do condomínio.
  condo: { key: "condo", icon: Building2, labelKey: "myCondo", fallback: "Meu condomínio", bg: "#8E8E96", bgHover: "#71717A", fg: INK },
  // O azul do anexo do bairro (`.fl-hood`).
  neighborhood: { key: "neighborhood", icon: Signpost, labelKey: "myStreet", fallback: "Meu bairro", bg: "#2982CC", bgHover: "#1F6DB0", fg: CREAM },
  // O verde-petróleo do painel parental.
  children: { key: "children", icon: Baby, labelKey: "myChildren", fallback: "Meus filhos", bg: "#0E6B72", bgHover: "#0B5359", fg: CREAM },
}

/** Ordem de exibição no gerenciador. */
export const QUICK_ORDER: QuickKey[] = [
  "business", "wallet", "fitness", "games", "pet", "car", "condo", "neighborhood", "children",
]

/**
 * A pilha de quem NUNCA escolheu — a que existia antes do gerenciador. Sem ela,
 * o deploy desta mudança sumiria com os pills de todo mundo.
 */
export const DEFAULT_QUICK_PILLS: QuickKey[] = ["business", "wallet", "fitness", "games"]

/**
 * Teto por GEOMETRIA: 4 × 36px + 3 × 6px = 162px, e a foto tem 192px. Um quinto
 * escaparia por cima e por baixo. Espelho de `QUICK_PILL_MAX` no backend.
 */
export const QUICK_PILL_MAX = 4

/** Quais chaves a conta PODE usar agora (flags do admin e posse). */
export function useQuickAvailability(): Record<QuickKey, boolean> {
  // Hooks em consts separadas: `&&` inline deixaria a segunda chamada
  // condicional (rules-of-hooks).
  const communitiesOn = useUserFeature("communities")
  const walletOn = useUserFeature("wallet")
  const academyFlag = useFeature("fitness_academias")
  const fitnessPref = useUserFeature("fitness_academias")
  const gamesFlag = useFeature("games")
  const petFlag = useFeature("pet")
  const carFlag = useFeature("carro")
  const condoFlag = useFeature("condominio")
  const hoodFlag = useFeature("bairro")
  return {
    business: communitiesOn,
    wallet: walletOn,
    fitness: academyFlag && fitnessPref,
    games: gamesFlag,
    pet: petFlag,
    car: carFlag,
    condo: condoFlag,
    neighborhood: hoodFlag,
    children: true,
  }
}

// ── A escolha da pessoa ──────────────────────────────────────────────────────
// Cache de módulo + localStorage (só conveniência: pinta a pilha certa no
// primeiro quadro em vez de piscar a padrão). A verdade é o backend.
const LS_KEY = "fl_quick_pills"
const EVENT = "fl:quick-pills"
let memo: QuickKey[] | null | undefined

function readLocal(): QuickKey[] | null | undefined {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw === null) return undefined
    return JSON.parse(raw) as QuickKey[] | null
  } catch {
    return undefined
  }
}

function writeLocal(v: QuickKey[] | null) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(v))
  } catch {
    /* sem storage, segue só com o backend */
  }
}

function sanitize(v: unknown): QuickKey[] | null {
  if (!Array.isArray(v)) return null
  const out: QuickKey[] = []
  for (const k of v) {
    if (QUICK_ORDER.includes(k as QuickKey) && !out.includes(k as QuickKey)) out.push(k as QuickKey)
    if (out.length >= QUICK_PILL_MAX) break
  }
  return out
}

/**
 * Os pills que a pessoa escolheu — `null` enquanto ela nunca escolheu (vale a
 * pilha padrão). Vai DIRETO no Railway: nenhuma rota de proxy para uma leitura
 * de uma linha.
 */
export function useQuickPills(): {
  pills: QuickKey[] | null
  save: (next: QuickKey[]) => Promise<boolean>
} {
  const [pills, setPills] = useState<QuickKey[] | null>(() => (memo === undefined ? null : memo))

  useEffect(() => {
    if (memo === undefined) {
      const local = readLocal()
      if (local !== undefined) {
        memo = local
        setPills(local)
      }
    }
    const token = getToken()
    if (token) {
      fetch(`${getPublicBackendUrl()}/users/me/quick-pills`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!j) return
          const v = j.pills === null ? null : sanitize(j.pills)
          memo = v
          writeLocal(v)
          setPills(v)
        })
        .catch(() => {})
    }
    const onChange = () => setPills(memo === undefined ? null : memo)
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])

  const save = useCallback(async (next: QuickKey[]) => {
    const token = getToken()
    if (!token) return false
    try {
      const r = await fetch(`${getPublicBackendUrl()}/users/me/quick-pills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pills: next }),
      })
      if (!r.ok) return false
      const j = await r.json()
      memo = sanitize(j.pills) ?? []
      writeLocal(memo)
      window.dispatchEvent(new Event(EVENT))
      return true
    } catch {
      return false
    }
  }, [])

  return { pills, save }
}
