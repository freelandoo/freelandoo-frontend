"use client"

/**
 * components/forms/city-picker.tsx
 * Campo de cidade que só aceita município de verdade.
 *
 * ─── POR QUE ELE EXISTE ─────────────────────────────────────────────────────
 *
 * O campo era texto livre, e texto livre não casa com tabela. Quem digitasse
 * "sao bernardo", "S. Bernardo" ou "São Bernardo" recebia uma busca vazia — e
 * uma busca vazia é indistinguível de "não há empresas nessa cidade". O erro
 * ficava calado e do lado do usuário.
 *
 * ⚠️ A FONTE É A API DO IBGE, E ISSO NÃO É DETALHE: é EXATAMENTE a mesma que
 * `scripts/prospect/build-partitions.js` usa para resolver o município de cada
 * empresa da base fria (`/localidades/estados/{id}/municipios`). Escolher outra
 * lista — por bonita ou completa que fosse — reabriria a divergência que este
 * componente existe para fechar, só que mais difícil de enxergar.
 *
 * ⚠️ POR QUE COMBOBOX E NÃO `<select>`. São Paulo tem 645 municípios e Minas
 * 853: um `<select>` nativo com essa lista é uma rolagem impossível no celular.
 * Aqui a pessoa digita as primeiras letras e a lista se fecha em torno do que
 * ela quer — mas o VALOR só sai de um item escolhido, que é o que garante o
 * casamento com o banco.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"

type Municipio = { id: number; nome: string }

/**
 * ⚠️ A COMPARAÇÃO IGNORA ACENTO E CAIXA, e sem isso o campo seria pior que o
 * texto livre: digitar "sao" não acharia "São Paulo", e a pessoa concluiria que
 * a cidade dela não está na lista. Espelha o `normalizeCity` do backend.
 */
const COMBINING = /[\u0300-\u036f]/g

function fold(s: string) {
  return s
    .normalize("NFD")
    .replace(COMBINING, "")
    .toLowerCase()
    .trim()
}

export function CityPicker({
  uf,
  value,
  onChange,
  className,
  placeholder,
  disabledHint,
  loadingLabel,
  emptyLabel,
  id,
}: {
  uf: string
  value: string
  onChange: (city: string) => void
  className?: string
  placeholder?: string
  disabledHint?: string
  loadingLabel?: string
  emptyLabel?: string
  id?: string
}) {
  const [all, setAll] = useState<Municipio[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(value)
  const [cursor, setCursor] = useState(0)
  const boxRef = useRef<HTMLDivElement | null>(null)
  /**
   * ⚠️ MARCA O ECO. Digitar limpa a escolha (`onChange("")`), e esse valor
   * VOLTA pelo `value` — sem distinguir os dois, o efeito de sincronia
   * trataria o próprio eco como "o pai mudou de cidade" e apagaria o que a
   * pessoa está digitando: tirar uma letra de "Campinas" zerava o campo.
   */
  const echo = useRef(false)
  /**
   * ⚠️ O TEXTO PERTENCE A UMA UF. Editar a cidade escolhida já zera o `value`,
   * então trocar a UF depois manda `""` num estado que JÁ era `""`: o React não
   * re-renderiza, o efeito de sincronia não dispara, e o texto sobrevive
   * apontando para um estado onde aquela cidade não existe. Quem limpa aqui é
   * a troca de UF, que é o fato de verdade — não o valor, que pode não mudar.
   *
   * Guardado por ref para não limpar na PRIMEIRA renderização: aí a UF não
   * mudou, ela nasceu — e apagar apagaria uma cidade legitimamente restaurada.
   */
  const prevUf = useRef(uf)
  const listRef = useRef<HTMLUListElement | null>(null)

  // O pai é quem manda: se ele limpar o valor (trocar de UF, resetar filtros),
  // o texto na tela acompanha em vez de continuar exibindo a cidade antiga.
  useEffect(() => {
    if (echo.current) {
      echo.current = false
      return
    }
    setText(value)
  }, [value])

  useEffect(() => {
    if (prevUf.current === uf) return
    prevUf.current = uf
    setText("")
  }, [uf])

  useEffect(() => {
    const estado = ESTADOS_BRASIL.find((e) => e.uf === uf)
    if (!estado) {
      setAll([])
      return
    }
    let alive = true
    setLoading(true)
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado.id}/municipios`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setAll(
          Array.isArray(d)
            ? d.map((m: { id: number; nome: string }) => ({ id: m.id, nome: m.nome }))
            : []
        )
      })
      .catch(() => {
        // ⚠️ IBGE FORA DO AR NÃO PODE TRANCAR A BUSCA. Sem lista, o campo
        // continua aceitando o que a pessoa escrever — o backend normaliza de
        // qualquer forma. Degradar para o comportamento antigo é muito melhor
        // que um campo que não deixa pesquisar.
        if (alive) setAll([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [uf])

  /**
   * Fecha ao clicar fora — e DEVOLVE O TEXTO AO VALOR ESCOLHIDO.
   *
   * ⚠️ Sem essa devolução, digitar "Campi" e clicar fora deixaria o campo
   * exibindo "Campi" com o filtro valendo nada: a mesma armadilha do
   * placeholder que parecia valor preenchido. O campo tem que mostrar
   * sempre o que a busca vai usar.
   */
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
        setText(value)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open, value])

  /**
   * ⚠️ PREFIXO PRIMEIRO, DEPOIS O RESTO — foi o pedido ("com a referência das
   * primeiras letras") e é o que faz o campo parecer rápido. Só `includes`
   * colocaria "Álvares Florence" à frente de "Campinas" para quem digitou
   * "camp", porque a ordem alfabética não sabe o que a pessoa quis.
   */
  const matches = useMemo(() => {
    const q = fold(text)
    if (!q) return all.slice(0, 50)
    const starts: Municipio[] = []
    const contains: Municipio[] = []
    for (const m of all) {
      const n = fold(m.nome)
      if (n.startsWith(q)) starts.push(m)
      else if (n.includes(q)) contains.push(m)
    }
    return [...starts, ...contains].slice(0, 50)
  }, [all, text])

  useEffect(() => {
    setCursor(0)
  }, [text, uf])

  // Mantém o item destacado visível ao navegar pelo teclado.
  useEffect(() => {
    const el = listRef.current?.children?.[cursor] as HTMLElement | undefined
    el?.scrollIntoView({ block: "nearest" })
  }, [cursor])

  const choose = (m: Municipio) => {
    // ⚠️ O QUE SOBE É `m.nome`, O NOME DO IBGE — nunca o que foi digitado. É
    // esta linha que fecha o buraco: o valor enviado é byte a byte o mesmo que
    // a base gravou.
    onChange(m.nome)
    setText(m.nome)
    setOpen(false)
  }

  const noUf = !uf
  // O combobox precisa APONTAR para a lista que ele controla — é assim que o
  // leitor de tela sabe que as opções que aparecem pertencem a este campo.
  const listId = `${id || "city"}-listbox`

  return (
    <div className="relative" ref={boxRef}>
      <input
        id={id}
        value={text}
        disabled={noUf}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
          // ⚠️ DIGITAR LIMPA A ESCOLHA. Sem isto, apagar "Campinas" até "Camp"
          // deixaria o filtro ainda valendo "Campinas" — a tela mostraria um
          // texto e a busca usaria outro.
          if (value) {
            echo.current = true
            onChange("")
          }
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
            setOpen(true)
            return
          }
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setCursor((c) => Math.min(c + 1, matches.length - 1))
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setCursor((c) => Math.max(c - 1, 0))
          } else if (e.key === "Enter") {
            if (matches[cursor]) {
              e.preventDefault()
              choose(matches[cursor])
            }
          } else if (e.key === "Escape") {
            setOpen(false)
            setText(value)
          }
        }}
        placeholder={noUf ? disabledHint : placeholder}
        className={className}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && matches[cursor] ? `${listId}-o${cursor}` : undefined
        }
      />

      {open && !noUf && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 max-h-64 overflow-y-auto border-2 border-[#0B0B0D] bg-[#F5F1E8] shadow-[4px_4px_0_0_#0B0B0D]"
        >
          {loading && (
            <li className="px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#9A938A]">
              {loadingLabel}
            </li>
          )}
          {!loading && matches.length === 0 && (
            <li className="px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#9A938A]">
              {emptyLabel}
            </li>
          )}
          {!loading &&
            matches.map((m, i) => (
              <li key={m.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  id={`${listId}-o${i}`}
                  aria-selected={i === cursor}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => choose(m)}
                  className={[
                    "block w-full px-3 py-2 text-left text-sm font-semibold text-[#0B0B0D]",
                    i === cursor ? "bg-[#F2B705]" : "bg-transparent",
                  ].join(" ")}
                >
                  {m.nome}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
