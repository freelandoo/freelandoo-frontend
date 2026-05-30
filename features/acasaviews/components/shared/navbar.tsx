"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-md border-b border-black/20 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-32 h-12 sm:w-40 sm:h-14">
            <a href="/acasaviews">
              <Image src="/acasaviews/logo2.png" alt="Studio Views Logo" fill className="object-contain" priority />
            </a>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="/acasaviews#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Home
          </a>
          <Link href="/acasaviews/debates" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Debates
          </Link>
          <Link href="/acasaviews/mafia" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Mafia
          </Link>
          <Link href="/acasaviews/robot" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Robot
          </Link>
          <Link href="/acasaviews/investidores" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            A Casa Views
          </Link>
        </div>

        <button
          className="md:hidden text-foreground p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-white/10">
          <div className="px-4 py-4 space-y-3">
            <a
              href="/acasaviews#about"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </a>
            <Link
              href="/acasaviews/debates"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Debates
            </Link>
            <Link
              href="/acasaviews/mafia"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Mafia
            </Link>
            <Link
              href="/acasaviews/robot"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Robot
            </Link>
            <Link
              href="/acasaviews/investidores"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              A Casa Views
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
