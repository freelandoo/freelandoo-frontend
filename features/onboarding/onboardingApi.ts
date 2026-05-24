import type {
  DismissReason,
  MonetizationStatus,
  TourPathDetail,
} from "./types"

function authHeader(): HeadersInit {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchMonetizationStatus(): Promise<MonetizationStatus | null> {
  try {
    const res = await fetch("/api/onboarding/monetization/status", {
      headers: authHeader(),
      cache: "no-store",
    })
    if (!res.ok) return null
    return (await res.json()) as MonetizationStatus
  } catch {
    return null
  }
}

export async function selectMonetizationPath(pathKey: string): Promise<boolean> {
  try {
    const res = await fetch("/api/onboarding/monetization/select", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ path_key: pathKey }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function dismissMonetization(reason: DismissReason): Promise<boolean> {
  try {
    const res = await fetch("/api/onboarding/monetization/dismiss", {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function fetchTourPath(pathKey: string): Promise<TourPathDetail | null> {
  try {
    const res = await fetch(`/api/tour-paths/${encodeURIComponent(pathKey)}`, {
      headers: authHeader(),
      cache: "no-store",
    })
    if (!res.ok) return null
    return (await res.json()) as TourPathDetail
  } catch {
    return null
  }
}

export async function startTourPath(pathKey: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tour-paths/${encodeURIComponent(pathKey)}/start`, {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: "{}",
    })
    return res.ok
  } catch {
    return false
  }
}

export async function reportTourProgress(pathKey: string, currentStep: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/tour-paths/${encodeURIComponent(pathKey)}/progress`, {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ current_step: currentStep }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function completeTourPath(pathKey: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tour-paths/${encodeURIComponent(pathKey)}/complete`, {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: "{}",
    })
    return res.ok
  } catch {
    return false
  }
}

export async function skipTourPath(pathKey: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tour-paths/${encodeURIComponent(pathKey)}/skip`, {
      method: "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: "{}",
    })
    return res.ok
  } catch {
    return false
  }
}
