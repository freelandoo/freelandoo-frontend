"use client"

// A CASCA: barra, rodapé e o seguidor do cursor.
//
// A BARRA É UMA PEÇA FÍSICA: no topo ela quase some no branco; ao rolar, uma
// placa de prata acetinada desliza por trás do conteúdo, e um reflexo a
// atravessa UMA vez (na primeira entrada da placa — repetir a cada rolagem
// viraria tique).
//
// ⚠️ A barra RECOLHE ao descer (encolhe), mas o Case nunca some: carrinho
// escondido é venda perdida, e no celular não existe outro caminho até ele.
//
// ⚠️ SEM "CONTA": a compra é de convidada (nome, e-mail e WhatsApp no
// checkout, mig 271). Um link "Account" levaria a uma porta que não existe
// para quem compra aqui.

import { useEffect, useState } from "react"

import { catalogIndex, dropCollection } from "./content/catalog"
import { BRAND } from "./content/brand"
import { CaseButton, SearchButton } from "./commerce"
import { PAGE, pageHref, type TemplateLinks } from "./lib"
import { useCatalog } from "./store"

export function SiteHeader({ links }: { links: TemplateLinks }) {
  const catalog = useCatalog()
  const drop = dropCollection(catalog)
  const custom = catalogIndex(catalog).colBySlug.get("custom")
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(false)
  const [swept, setSwept] = useState(false)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    let last = window.scrollY
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        setSolid(y > 24)
        setHidden(y > 260 && y > last + 4)
        if (y < last - 4) setHidden(false)
        last = y
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  // o reflexo atravessa só na PRIMEIRA vez que a placa entra
  useEffect(() => {
    if (!solid || swept) return
    const t = window.setTimeout(() => setSwept(true), 1300)
    return () => window.clearTimeout(t)
  }, [solid, swept])

  const nav = [
    { label: "Shop", href: pageHref(links, PAGE.loja) },
    ...(drop ? [{ label: "New Drop", href: pageHref(links, drop.slug) }] : []),
    { label: "Collections", href: `${links.home}#colecoes` },
    { label: "Custom", href: pageHref(links, custom ? custom.slug : PAGE.sobre) },
  ]

  return (
    <header
      className={`pk-nav ${solid || menu ? "is-solid" : ""} ${solid && !swept ? "is-sweeping" : ""} ${
        hidden && !menu ? "is-hidden" : ""
      }`}
    >
      {!catalog.live ? (
        <p className="pk-nav__notice">Catálogo em prévia · fotos e preços definitivos em breve</p>
      ) : null}
      <div className="pk-nav__bar">
        <span className="pk-nav__plate" aria-hidden="true">
          <span className="pk-nav__sweep" />
        </span>
        <a href={links.home} className="pk-nav__logo" aria-label={`${BRAND.full} — início`}>
          Pinkoracats
        </a>
        <nav className="pk-nav__links" aria-label="Principal">
          {nav.map((n) => (
            <a key={n.label} className="pk-nav__link" href={n.href}>
              {n.label}
            </a>
          ))}
          <SearchButton />
        </nav>
        <div className="pk-nav__right">
          <CaseButton />
          <button
            type="button"
            className="pk-nav__burger"
            aria-expanded={menu}
            aria-controls="pk-menu"
            onClick={() => setMenu((m) => !m)}
          >
            {menu ? "Fechar" : "Menu"}
          </button>
        </div>
      </div>
      <div id="pk-menu" className={`pk-menu ${menu ? "is-open" : ""}`} hidden={!menu}>
        {nav.map((n) => (
          <a key={n.label} href={n.href} onClick={() => setMenu(false)}>
            {n.label}
          </a>
        ))}
        {catalog.collections.map((c) => (
          <a key={c.slug} className="pk-menu__sub" href={pageHref(links, c.slug)} onClick={() => setMenu(false)}>
            {c.name}
          </a>
        ))}
        <a className="pk-menu__sub" href={pageHref(links, PAGE.sobre)} onClick={() => setMenu(false)}>
          Sobre a marca
        </a>
        <SearchButton className="pk-menu__search" />
      </div>
    </header>
  )
}

export function SiteFooter({ links }: { links: TemplateLinks }) {
  const catalog = useCatalog()
  return (
    <footer className="pk-footer pk-mat-satin">
      <p className="pk-footer__giant" aria-hidden="true">
        Pinkoracats
      </p>
      <div className="pk-footer__grid">
        <div>
          <p className="pk-eyebrow">Press-on objects</p>
          <p className="pk-footer__lead">
            Sets autorais de press-on nails, expostos em caixas acrílicas. Feitos à mão em {BRAND.city}/{BRAND.state}.
          </p>
        </div>
        <nav aria-label="Coleções" className="pk-footer__col">
          <p className="pk-mono pk-footer__h">Collections</p>
          {catalog.collections.map((c) => (
            <a key={c.slug} href={pageHref(links, c.slug)}>
              {c.name}
            </a>
          ))}
        </nav>
        <nav aria-label="Loja" className="pk-footer__col">
          <p className="pk-mono pk-footer__h">Shop</p>
          <a href={pageHref(links, PAGE.loja)}>Todo o catálogo</a>
          <a href={pageHref(links, PAGE.sobre)}>Sobre a marca</a>
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
          {BRAND.instagram ? (
            <a href={BRAND.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          ) : null}
        </nav>
      </div>
      <p className="pk-footer__fine pk-mono">© {BRAND.full} · feito à mão · retirada em {BRAND.city}/{BRAND.state}</p>
    </footer>
  )
}

/**
 * O seguidor do cursor: um quadrado preto pequeno que diz VIEW / OPEN / DRAG.
 *
 * ⚠️ SÓ COM PONTEIRO FINO E SEM movimento reduzido — no toque não existe
 * cursor. E ele NÃO substitui o cursor nativo: só acompanha.
 */
export function CursorFollower() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!fine || reduced) return
    const root = document.querySelector<HTMLElement>(".tpl-pinkora")
    const dot = root?.querySelector<HTMLElement>(".pk-cursor")
    if (!root || !dot) return
    setOn(true)
    let x = -100
    let y = -100
    let tx = -100
    let ty = -100
    let raf = 0
    const tick = () => {
      x += (tx - x) * 0.24
      y += (ty - y) * 0.24
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) raf = requestAnimationFrame(tick)
      else raf = 0
    }
    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor]")
      const label = t?.dataset.cursor || ""
      if (dot.dataset.label !== label) {
        dot.dataset.label = label
        dot.textContent = label
      }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    root.addEventListener("pointermove", move, { passive: true })
    return () => {
      root.removeEventListener("pointermove", move)
      cancelAnimationFrame(raf)
    }
  }, [])
  return <div className={`pk-cursor ${on ? "is-on" : ""}`} aria-hidden="true" />
}
