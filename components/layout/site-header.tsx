"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LogOut, Search, User, CreditCard, Shield } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserData {
  id_user: string
  nome: string
  email: string
  is_admin?: boolean
  roles?: { id_role: string; desc_role: string }[]
}

function readUserFromStorage(): UserData | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem("user")
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserData
  } catch {
    return null
  }
}

export default function SiteHeader() {
  // Sempre `null` no 1.º render (SSR + hidratação) para bater com o HTML do servidor;
  // usuário só após mount — evita mismatch com localStorage no cliente.
  const [user, setUser] = useState<UserData | null>(null)
  const [query, setQuery] = useState("")
  const router = useRouter()

  useEffect(() => {
    const fromStorage = readUserFromStorage()
    if (fromStorage) {
      setUser(fromStorage)
    }

    const token = localStorage.getItem("token")
    if (!token) return

    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        if (data && data.id_user) {
          setUser(data)
        }
      })
      .catch(() => {})
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    router.push("/")
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search")
  }

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="border-b border-white/10 bg-black">
        <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-3 md:flex-nowrap md:gap-4">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/freelandoo-logo.png"
              alt="Freelandoo"
              width={200}
              height={56}
              className="h-8 w-auto md:h-9"
              priority
            />
          </Link>

          <form
            onSubmit={submitSearch}
            className="order-3 flex w-full min-w-0 flex-1 items-center gap-2 md:order-none md:max-w-xl md:mx-4"
          >
            <Select defaultValue="freelancers">
              <SelectTrigger
                size="sm"
                className="h-9 w-[130px] shrink-0 border-white/20 bg-white/10 text-xs text-white md:w-[140px] md:text-sm [&_svg]:text-white/80"
              >
                <SelectValue placeholder="Freelancers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="freelancers">Freelancers</SelectItem>
                <SelectItem value="influencers">Influenciadores</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative min-w-0 flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar freelancers"
                className="h-9 border-white/20 bg-white/10 pr-10 text-sm text-white placeholder:text-white/50 focus-visible:ring-primary/40"
                aria-label="Buscar freelancers"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                aria-label="Buscar"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground md:h-9"
                  >
                    <User className="mr-1 h-4 w-4" />
                    <span className="hidden max-w-[120px] truncate sm:inline">{user.nome}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => router.push("/account")} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Minha conta
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/pagamentos")} className="cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Minha Assinatura
                  </DropdownMenuItem>
                  {(user.is_admin || user.roles?.some((r) => r.desc_role === "Administrator")) && (
                    <DropdownMenuItem onClick={() => router.push("/admin")} className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      Administração
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login" className="text-xs font-medium text-white hover:text-white/80 sm:text-sm">
                  Login
                </Link>
                <Link href="/cadastro" className="hidden sm:block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white text-white hover:bg-white hover:text-black md:h-9"
                  >
                    Cadastre-se
                  </Button>
                </Link>
                <Link href="/cadastro">
                  <Button
                    size="sm"
                    className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90 md:h-9"
                  >
                    Publicar projeto
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <nav className="border-b border-neutral-200 bg-white">
        <div className="container mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 text-sm text-neutral-600">
          <Link href="/comofunciona" className="hover:text-neutral-900">
            Como funciona
          </Link>
          <Link href="/search" className="hover:text-neutral-900">
            Encontrar Freelancers
          </Link>
          <Link href="/cadastro" className="hover:text-neutral-900">
            Encontrar Trabalho
          </Link>
        </div>
      </nav>
    </header>
  )
}
