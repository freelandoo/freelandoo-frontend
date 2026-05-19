"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import MessagesNavLink from "@/components/mensagens/MessagesNavLink"
import { UserDropside } from "@/components/layout/UserDropside"
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher"
import { CountrySwitcher } from "@/components/i18n/CountrySwitcher"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useNavCounts } from "@/components/navigation/use-nav-counts"

export default function SiteHeader() {
  const { user, status, logout } = useAuth()
  const pathname = usePathname() || "/"
  const router = useRouter()
  const [dropsideOpen, setDropsideOpen] = useState(false)
  const navCounts = useNavCounts()
  const tAuth = useTranslations("Auth")
  const tNav = useTranslations("Navigation")

  const isLoggedIn = status === "authenticated" && !!user
  const isOnAccountHome = pathname === "/account"
  const handleUserClick = () => {
    if (isOnAccountHome) {
      setDropsideOpen(true)
    } else {
      router.push("/account")
    }
  }

  const unreadSR = navCounts.serviceHasNew || navCounts.serviceUnread > 0

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="border-b border-white/10 bg-black">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3 md:gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src="/freelandoo-logo.png"
              alt="Freelandoo"
              width={200}
              height={56}
              className="h-8 w-auto md:h-9"
              priority
            />
            <span className="text-base font-bold tracking-tight text-primary md:text-lg">
              Freelandoo
            </span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <CountrySwitcher />
              <LanguageSwitcher />
            </div>
            {isLoggedIn ? (
              <>
                <MessagesNavLink />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUserClick}
                  aria-haspopup={isOnAccountHome ? "dialog" : undefined}
                  aria-expanded={isOnAccountHome ? dropsideOpen : undefined}
                  title={isOnAccountHome ? tNav("account", "Minha conta") : tNav("account", "Minha conta")}
                  className="relative border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground md:h-9"
                >
                  <User className="mr-1 h-4 w-4" />
                  <span className="hidden max-w-[120px] truncate sm:inline">{user.nome}</span>
                  {unreadSR && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-black" />
                  )}
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-white/85 transition hover:bg-white/10 hover:text-white sm:text-sm">
                  {tAuth("loginShort", "Login")}
                </Link>
                <Link href="/cadastro" className="hidden sm:block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white text-white hover:bg-white hover:text-black md:h-9"
                  >
                    {tAuth("register", "Cadastre-se")}
                  </Button>
                </Link>
                <Link href="/cadastro">
                  <Button
                    size="sm"
                    className="h-9 min-w-[132px] rounded-lg bg-primary px-4 font-semibold text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition hover:bg-[#ffd21a] active:scale-[0.98]"
                  >
                    {tNav("publishProject", "Publicar projeto")}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-2 sm:hidden">
          <div className="flex items-center justify-end gap-2">
            <CountrySwitcher variant="full" />
            <LanguageSwitcher variant="full" />
          </div>
        </div>
      </div>

      {!isLoggedIn && (
        <nav className="border-b border-neutral-200 bg-white">
          <div className="container mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 text-sm text-neutral-600">
            <Link href="/comofunciona" className="hover:text-neutral-900">
              {tNav("howItWorks", "Como funciona")}
            </Link>
            <Link href="/search" className="hover:text-neutral-900">
              {tNav("findFreelancers", "Encontrar Freelancers")}
            </Link>
            <Link href="/cadastro" className="hover:text-neutral-900">
              {tNav("findWork", "Encontrar Trabalho")}
            </Link>
          </div>
        </nav>
      )}

      {isLoggedIn && (
        <UserDropside
          open={dropsideOpen}
          onClose={() => setDropsideOpen(false)}
          user={user}
          unreadServiceRequest={unreadSR}
          onLogout={logout}
        />
      )}
    </header>
  )
}
