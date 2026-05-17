"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"
import { useRouter } from "next/navigation"

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
  /** Texto do botão. "continue_with" = "Continuar com Google" */
  text?: "signin_with" | "signup_with" | "continue_with"
  /** Para onde redirecionar após login bem-sucedido. */
  redirectTo?: string
  /** Override de tema. */
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
      try {
        const res = await fetch("/api/google-signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data?.error || data?.message || "Erro ao entrar com Google")
          setLoading(false)
          return
        }

        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
        window.dispatchEvent(new Event("auth:changed"))

        const target =
          redirectTo ||
          (data.email_verified === false || data.user?.email_verified === false
            ? "/verify-email"
            : "/search")
        router.push(target)
      } catch {
        setError("Erro ao conectar com o servidor")
        setLoading(false)
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
  }, [scriptReady, clientId, router, redirectTo, theme, text])

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
