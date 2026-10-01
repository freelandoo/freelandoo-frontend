"use client"

// O LINK COM ELEMENTO COMPARTILHADO entre páginas (View Transition entre
// documentos — `@view-transition { navigation: auto }` em `theme.css`).
//
// Clique na placa da coleção: a PRÓPRIA placa cresce e vira o herói da
// coleção, em vez de clique → flash → página nova.
//
// ⚠️ O NOME É POSTO NA HORA DO CLIQUE, e só no elemento clicado: a mesma
// coleção (ou o mesmo produto) aparece em várias vitrines, e dois elementos
// com o mesmo `view-transition-name` fazem o navegador ABORTAR a transição.
// Na página de destino o nome é fixo, porque lá o elemento é único.
//
// ⚠️ SEM SUPORTE (Firefox, Safari antigo) é um link comum: a navegação
// acontece igual, só sem a passagem.

export function VtLink({
  href,
  name,
  className = "",
  cursor,
  children,
}: {
  href: string
  /** O `view-transition-name` do destino (ex.: `pk-col-chrome`). */
  name: string
  className?: string
  cursor?: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className={className}
      data-cursor={cursor}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        const src = e.currentTarget.querySelector<HTMLElement>("[data-vt-source]") || e.currentTarget
        src.style.viewTransitionName = name
      }}
    >
      {children}
    </a>
  )
}

