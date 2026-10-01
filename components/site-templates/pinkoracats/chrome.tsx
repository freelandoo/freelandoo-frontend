"use client"

// A CASCA: barra, rodapé e o seguidor do cursor.
//
// ⚠️ A barra RECOLHE ao descer e volta ao subir — mas o Case nunca some: ele
// fica num botão que é desenhado nos dois estados. Carrinho escondido é
// venda perdida.

import { useEffect, useState } from "react"

import { dropCollection } from "./content/catalog"
import { BRAND } from "./content/brand"
import { CaseButton, SearchButton } from "./commerce"
import { PAGE, pageHref, type TemplateLinks } from "./lib"
import { useCatalog } from "./store"

export function SiteHeader({ links }: { links: TemplateLinks }) {
  const catalog = useCatalog()
  const drop = dropCollection(catalog)
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(false)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    let last = window.scrollY
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        setSolid(y > 24)
        setHidden(y > 240 && y > last + 4)
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

  return (
    <header className={`pk-nav ${solid ? "is-solid" : ""} ${hidden && !menu ? "is-hidden" : ""}`}>
      {!catalog.live ? (
        <p className="pk-nav__notice">Catálogo em prévia · fotos e preços definitivos em breve</p>
      ) : null}
      <div className="pk-nav__bar">
        <a href={links.home} className="pk-nav__logo" aria-label={`${BRAND.full} — início`}>
          PINKORA<span>CATS</span>
        </a>
        <nav className="pk-nav__links" aria-label="Principal">
          <a className="pk-nav__link" href={pageHref(links, PAGE.loja)}>
            Shop
          </a>
          {drop ? (
            <a className="pk-nav__link" href={pageHref(links, drop.slug)}>
              {drop.name}
            </a>
          ) : null}
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
        <a href={pageHref(links, PAGE.loja)} onClick={() => setMenu(false)}>
          Shop
        </a>
        {catalog.collections.map((c) => (
          <a key={c.slug} href={pageHref(links, c.slug)} onClick={() => setMenu(false)}>
            {c.name}
          </a>
        ))}
        <a href={pageHref(links, PAGE.sobre)} onClick={() => setMenu(false)}>
          Sobre
        </a>
      </div>
    </header>
  )
}

export function SiteFooter({ links }: { links: TemplateLinks }) {
  const catalog = useCatalog()
  return (
    <footer className="pk-footer pk-silver">
      <p className="pk-footer__giant" aria-hidden="true">
        PINKORA
        <br />
        CATS
      </p>
      <div className="pk-footer__grid">
        <div>
          <p className="pk-eyebrow">Nail art as object</p>
          <p className="pk-footer__lead">
            Sets autorais de unhas, charms e peças sob encomenda. Feitos à mão em {BRAND.city}/{BRAND.state}.
          </p>
        </div>
        <nav aria-label="Coleções" className="pk-footer__col">
          {catalog.collections.map((c) => (
            <a key={c.slug} href={pageHref(links, c.slug)}>
              {c.name}
            </a>
          ))}
        </nav>
        <nav aria-label="Loja" className="pk-footer__col">
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
      <p className="pk-footer__fine">
        © {BRAND.full} · feito à mão
      </p>
    </footer>
  )
}

/**
 * O seguidor do cursor: um ponto pequeno que diz VIEW / SELECT / DRAG.
 *
 * ⚠️ SÓ COM PONTEIRO FINO E SEM movimento reduzido — no toque não existe
 * cursor, e um ponto parado no canto da tela seria lixo visual. E ele NÃO
 * substitui o cursor nativo: só acompanha.
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
      x += (tx - x) * 0.22
      y += (ty - y) * 0.22
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
