"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "fl_cookie_consent"

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted")
    setVisible(false)
  }

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "dismissed")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-background shadow-lg">
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:p-5">
          <div className="flex-1 text-sm text-muted-foreground">
            Usamos cookies essenciais e analíticos para melhorar sua experiência.{" "}
            <Link href="/cookies-policy" className="text-primary hover:underline">
              Saiba mais
            </Link>
            .
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={dismiss}
              className="text-muted-foreground"
            >
              Só essenciais
            </Button>
            <Button size="sm" onClick={accept} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Aceitar todos
            </Button>
            <button
              onClick={dismiss}
              className="ml-1 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
