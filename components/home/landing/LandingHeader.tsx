"use client"

/**
 * LandingHeader — cabeçalho light da homepage editorial.
 * Sticky, fundo papel translúcido com blur. Mantém os links canônicos
 * (login/cadastro/explorar) intactos. Reage ao estado de auth.
 */
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Menu, X, User } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { LINKS } from "./tokens"
import { GoldButton } from "./primitives"

const NAV = [
  { label: "Explorar", href: LINKS.explorar },
  { label: "Cursos", href: LINKS.cursos },
  { label: "Como funciona", href: LINKS.comoFunciona },
  { label: "Afiliados", href: LINKS.afiliados },
]

export function LandingHeader() {
  const { user, status } = useAuth()
  const isLoggedIn = status === "authenticated" && !!user
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="border-b border-[#14110B]/8 bg-[#FAF7F0]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[#FAF7F0]/70">
        <div className="mx-auto flex w-full max-w-[1200px] items-center gap-4 px-5 py-3 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Freelandoo, página inicial">
            <Image
              src="/freelandoo-logo.png"
              alt="Freelandoo"
              width={200}
              height={56}
              className="h-7 w-auto sm:h-8"
              priority
            />
            <span className="text-lg font-black tracking-tight text-[#14110B]">Freelandoo</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-6 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm font-semibold text-[#2A2418]/80 transition hover:text-[#14110B]"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <Link
                href="/account"
                className="inline-flex items-center gap-2 rounded-full border border-[#14110B]/15 bg-white px-4 py-2 text-sm font-bold text-[#14110B] transition hover:border-[#14110B]/35"
              >
                <User className="h-4 w-4" />
                <span className="hidden max-w-[120px] truncate sm:inline">{user.nome}</span>
              </Link>
            ) : (
              <>
                <Link
                  href={LINKS.login}
                  className="hidden rounded-full px-4 py-2 text-sm font-bold text-[#14110B] transition hover:bg-[#14110B]/5 sm:inline-flex"
                >
                  Entrar
                </Link>
                <GoldButton href={LINKS.cadastro} className="px-5 py-2.5 text-sm">
                  Começar agora
                </GoldButton>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#14110B]/15 text-[#14110B] lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {open && (
          <div className="border-t border-[#14110B]/8 bg-[#FAF7F0] lg:hidden">
            <nav className="mx-auto flex w-full max-w-[1200px] flex-col px-5 py-3 sm:px-8">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-[#14110B]/5 py-3 text-base font-semibold text-[#14110B] last:border-0"
                >
                  {n.label}
                </Link>
              ))}
              {!isLoggedIn && (
                <Link
                  href={LINKS.login}
                  onClick={() => setOpen(false)}
                  className="py-3 text-base font-semibold text-[#14110B]"
                >
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
