"use client"

import { useEffect, useState } from "react"
import { Download, Share, Plus, X, MoreHorizontal } from "lucide-react"

// Evento não-padronizado do Chrome/Android. Tipado localmente.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "fl_pwa_install_dismissed_at"
const DISMISS_DAYS = 14
const COOKIE_KEY = "fl_cookie_consent"

function recentlyDismissed(): boolean {
  try {
    const at = localStorage.getItem(DISMISS_KEY)
    if (!at) return false
    return Date.now() - Number(at) < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua)
  const webkit = /WebKit/.test(ua)
  const notChromeOrFirefox = !/CriOS|FxiOS|EdgiOS/.test(ua)
  return iOS && webkit && notChromeOrFirefox
}

/**
 * Registra o service worker e oferece o convite de instalação ("Adicionar à
 * tela inicial"). Em Android/Chrome usa o evento beforeinstallprompt; em iOS
 * Safari mostra a dica manual (Compartilhar → Adicionar à Tela de Início).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [mode, setMode] = useState<"none" | "android" | "ios">("none")

  // Registro do service worker.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
    if (document.readyState === "complete") onLoad()
    else window.addEventListener("load", onLoad)
    return () => window.removeEventListener("load", onLoad)
  }, [])

  // Detecção do convite de instalação.
  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setMode("android")
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)

    // iOS não dispara beforeinstallprompt — mostra a dica manual após um tempo,
    // e só depois que o banner de cookies já foi resolvido (evita empilhar).
    let iosTimer: ReturnType<typeof setTimeout> | undefined
    if (isIosSafari()) {
      iosTimer = setTimeout(() => {
        try {
          if (localStorage.getItem(COOKIE_KEY)) setMode((m) => (m === "none" ? "ios" : m))
        } catch {
          setMode((m) => (m === "none" ? "ios" : m))
        }
      }, 4000)
    }

    const onInstalled = () => {
      setMode("none")
      setDeferred(null)
    }
    window.addEventListener("appinstalled", onInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
    setMode("none")
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setMode("none")
  }

  if (mode === "none") return null

  return (
    <div className="fixed inset-x-0 top-0 z-[60] border-b-2 border-black bg-[#FFC600] pt-[env(safe-area-inset-top)] shadow-[0_3px_0_0_#0b0b0d]">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-3 py-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="Freelandoo" className="h-10 w-10 shrink-0 rounded-xl border-2 border-black" />
        <div className="min-w-0 flex-1 text-black">
          {mode === "android" ? (
            <>
              <p className="text-sm font-extrabold leading-tight">Instalar a Freelandoo</p>
              <p className="text-xs leading-snug opacity-80">Adicione o app à sua tela inicial — abre rápido e em tela cheia.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-extrabold leading-tight">Instalar a Freelandoo</p>
              <p className="text-xs leading-snug">
                Clique nos <MoreHorizontal className="inline h-4 w-4 align-text-bottom" />, vá em{" "}
                <span className="font-bold">Compartilhar</span>{" "}
                <Share className="inline h-3.5 w-3.5 align-text-bottom" /> e depois em{" "}
                <span className="font-bold">“Adicionar à Tela de Início”</span>{" "}
                <Plus className="inline h-3.5 w-3.5 align-text-bottom" />.
              </p>
            </>
          )}
        </div>
        {mode === "android" ? (
          <button
            onClick={install}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-black bg-black px-3.5 py-2 text-xs font-extrabold uppercase tracking-wide text-[#FFC600] active:translate-y-px"
          >
            <Download className="h-4 w-4" /> Instalar
          </button>
        ) : null}
        <button onClick={dismiss} aria-label="Fechar" className="shrink-0 rounded-full p-1 text-black/70 hover:text-black">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
