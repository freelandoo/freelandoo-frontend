"use client"

/**
 * LandingHeader — cabeçalho dark da homepage poster.
 * Logo + nav central + Entrar (outline) e Comece agora (gold). Menu mobile.
 * Mantém os links canônicos. Reage ao estado de auth.
 */
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Menu, X, User, ArrowRight } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { LINKS, NAV } from "./tokens"
import { GoldButton } from "./primitives"

export function LandingHeader() {
  const { user, status } = useAuth()
  const isLoggedIn = status === "authenticated" && !!user
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="border-b border-[#F5F1E8]/8 bg-[#15120E]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[#15120E]/65">
        <div className="mx-auto flex w-full max-w-[1180px] items-center gap-4 px-5 py-3.5 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Freelandoo, página inicial">
            <Image src="/freelandoo-logo.png" alt="Freelandoo" width={200} height={56} className="h-7 w-auto sm:h-8" priority />
            <span className="text-lg font-black tracking-tight text-[#F5F1E8]">freelandoo</span>
          </Link>

          <nav className="mx-auto hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <Link key={n.label} href={n.href} className="text-sm font-semibold text-[#F5F1E8]/75 transition hover:text-[#F5F1E8]">
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 lg:ml-0">
            {isLoggedIn ? (
              <Link href="/account" className="inline-flex items-center gap-2 rounded-full border border-[#F5F1E8]/20 px-4 py-2 text-sm font-bold text-[#F5F1E8] transition hover:border-[#F5F1E8]/40">
                <User className="h-4 w-4" />
                <span className="hidden max-w-[120px] truncate sm:inline">{user.nome}</span>
              </Link>
            ) : (
              <>
                <Link href={LINKS.login} className="hidden rounded-full border border-[#F5F1E8]/25 px-5 py-2 text-sm font-bold text-[#F5F1E8] transition hover:border-[#F5F1E8]/50 sm:inline-flex">
                  Entrar
                </Link>
                <GoldButton href={LINKS.cadastro} className="px-5 py-2.5 text-sm">
                  Comece agora <ArrowRight className="h-4 w-4" />
                </GoldButton>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#F5F1E8]/20 text-[#F5F1E8] lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-[#F5F1E8]/8 bg-[#15120E] lg:hidden">
            <nav className="mx-auto flex w-full max-w-[1180px] flex-col px-5 py-3 sm:px-8">
              {NAV.map((n) => (
                <Link key={n.label} href={n.href} onClick={() => setOpen(false)} className="border-b border-[#F5F1E8]/8 py-3 text-base font-semibold text-[#F5F1E8] last:border-0">
                  {n.label}
                </Link>
              ))}
              {!isLoggedIn && (
                <Link href={LINKS.login} onClick={() => setOpen(false)} className="py-3 text-base font-semibold text-[#F5F1E8]">
                  Entrar
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
