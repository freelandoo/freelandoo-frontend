import type { ChosenPath, DismissReason, IntentStatus } from "./types"

function authHeader(): HeadersInit {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchIntentStatus(): Promise<IntentStatus | null> {
  try {
    const res = await fetch("/api/onboarding/intent/status", {
      headers: authHeader(),
      cache: "no-store",
    })
    if (!res.ok) return null
    return (await res.json()) as IntentStatus
  } catch {
    return null
  }
}

export async function chooseIntent(pathKey: string): Promise<ChosenPath | null> {
  try {
    const res = await fetch("/api/onboarding/intent/choose", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ path_key: pathKey }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.path ?? null
  } catch {
    return null
  }
}

export async function dismissIntent(reason: DismissReason): Promise<boolean> {
  try {
    const res = await fetch("/api/onboarding/intent/dismiss", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    return res.ok
  } catch {
    return false
  }
}
