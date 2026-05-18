"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import { extractAuthSession, setSession } from "@/lib/auth"
import { clientFetchWithTimeout, isClientFetchTimeout } from "@/lib/fetch-with-timeout"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            ux_mode?: "popup" | "redirect"
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black"
              size?: "small" | "medium" | "large"
              text?: "signin_with" | "signup_with" | "continue_with" | "signin"
              shape?: "rectangular" | "pill" | "circle" | "square"
              logo_alignment?: "left" | "center"
              width?: number
              locale?: string
            },
          ) => void
          prompt: () => void
        }
      }
    }
  }
}

type Props = {
  text?: "signin_with" | "signup_with" | "continue_with"
  redirectTo?: string
  theme?: "outline" | "filled_blue" | "filled_black"
  className?: string
}

export function GoogleSignInButton({
  text = "continue_with",
  redirectTo,
  theme = "filled_black",
  className,
}: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!scriptReady) return
    if (!clientId) {
      setError("Login com Google indisponível: configurar NEXT_PUBLIC_GOOGLE_CLIENT_ID.")
      return
    }
    if (!window.google || !containerRef.current) return

    const handleCredential = async ({ credential }: { credential: string }) => {
      setLoading(true)
      setError(null)
      let didRedirect = false
      try {
        const res = await clientFetchWithTimeout(
          "/api/google-signin",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential }),
          },
          9000
        )
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
        if (!res.ok) {
          const msg =
            typeof data?.error === "string"
              ? data.error
              : typeof data?.message === "string"
                ? data.message
                : "Erro ao entrar com Google"
          setError(msg)
          return
        }

        const session = extractAuthSession(data)
        if (!session) {
          setError("Login com Google retornou sem sessão. Tente novamente.")
          return
        }

        setSession(session.token, session.user)

        const target =
          redirectTo ||
          (session.emailVerified === false ? "/verify-email" : "/search")
        didRedirect = true
        try {
          router.replace(target)
          router.refresh()
        } catch {
          /* ignore */
        }
        window.setTimeout(() => {
          if (window.location.pathname !== target) {
            window.location.replace(target)
          }
        }, 400)
      } catch (err) {
        if (isClientFetchTimeout(err)) {
          setError("Servidor demorou para responder. Tente novamente.")
        } else {
          setError("Erro ao conectar com o servidor")
        }
      } finally {
        if (!didRedirect) setLoading(false)
      }
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredential,
      ux_mode: "popup",
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    containerRef.current.innerHTML = ""
    window.google.accounts.id.renderButton(containerRef.current, {
      theme,
      size: "large",
      text,
      shape: "pill",
      logo_alignment: "center",
      width: 320,
      locale: "pt-BR",
    })
  }, [scriptReady, clientId, redirectTo, theme, text, router])

  return (
    <div className={className}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="flex justify-center" aria-busy={loading} />
      {error ? (
        <p className="mt-2 text-center text-xs text-rose-400">{error}</p>
      ) : null}
    </div>
  )
}
