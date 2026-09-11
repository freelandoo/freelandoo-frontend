"use client"

// Vitrine de serviços: UMA FILEIRA de cards com foto, nome, descrição, preço e
// duração, com setas para alcançar os que não couberam na tela.
//
// ═══ O CONTEÚDO NÃO MORA NO SITE (2026-09-04, decisão do Alex) ═══
//
// Os cards são os serviços REAIS cadastrados na Freelandoo, servidos pelo
// backend a cada leitura. Antes eram texto livre: o líder digitava nome, preço
// e duração no construtor. Isso dava ao site uma SEGUNDA VERDADE sobre preço —
// bastava reajustar o serviço de verdade e esquecer do site para a página
// pública seguir anunciando o valor antigo, sem erro nenhum aparecer.
//
// Por isso aqui não há nada editável dentro do card, nem em modo de edição: o
// que o líder vê no construtor é exatamente o que sai publicado, porque é a
// mesma consulta. Para mudar um serviço, muda-se o serviço. Inclusive a FOTO:
// ela é a mesma do card do perfil, e é lá que se troca.
//
// O que continua sendo do site é a APRESENTAÇÃO: quantos cards cabem por tela,
// e o título e o subtítulo da seção (que vivem na casca, não aqui).
//
// ═══ FILEIRA, E NÃO GRADE (2026-09-11, pedido do Alex) ═══
//
// A grade empilhava os serviços em duas, três linhas e comia a página inteira
// antes de o visitante chegar em qualquer outra coisa — numa lista longa a
// seção virava o site. O trilho horizontal mostra a primeira leva com uma
// pista do próximo card e aceita seis ou vinte serviços sem mudar de forma. É
// a mesma escolha já feita nos depoimentos.
//
// A rolagem é NATIVA (arrasto do dedo e roda do mouse já funcionam); as setas
// existem porque no computador não há gesto de arrastar, e um trilho sem botão
// esconde o que tem dentro de quem usa mouse.

import { useCallback, useEffect, useRef, useState } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ImageOff,
  MessageCircle,
} from "lucide-react"
import { useSiteRuntime } from "../site-runtime"
import { whatsappHref } from "../site-chrome"
import type { ServicesCatalogData, ShowcaseService, SiteColorTheme } from "@/types/community-site"

/**
 * Largura do card por "quantos cabem por tela".
 *
 * O número que o líder escolhe governa o DESKTOP. Abaixo de `lg` o trilho fixa
 * dois, e no celular um card de largura fixa: 240px num aparelho de 360 deixa
 * a borda do próximo card aparecendo, e é essa pista que diz que o trilho anda
 * para o lado — três cards espremidos numa tela de celular não dizem nada.
 *
 * A conta desconta os vãos: para N cards visíveis há N−1 `gap-5` (1.25rem).
 */
const RAIL_ITEM_CLASS: Record<ServicesCatalogData["columns"], string> = {
  2: "sm:w-[calc((100%-1.25rem)/2)]",
  3: "sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]",
  4: "sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3.75rem)/4)]",
}

/**
 * Preço em centavos → moeda no idioma de quem lê.
 *
 * O backend manda centavos justamente para que a formatação aconteça aqui: o
 * site é servido em três idiomas, e um texto "R$ 1.200,00" gravado no servidor
 * ficaria em português para todo mundo.
 */
function formatPrice(cents: number | null | undefined, locale: string) {
  if (cents === null || cents === undefined) return null
  const value = Number(cents)
  if (!Number.isFinite(value)) return null
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format(value / 100)
}

/** 90 → "1h30". Minutos crus ("90min") leem pior do que a conta já feita. */
function formatDuration(minutes: number | null | undefined, hourSuffix: string, minSuffix: string) {
  const total = Number(minutes)
  if (!Number.isFinite(total) || total <= 0) return null
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}${minSuffix}`
  if (m === 0) return `${h}${hourSuffix}`
  return `${h}${hourSuffix}${String(m).padStart(2, "0")}`
}

export function ServicesCatalogSection({
  data,
  onChange,
  editing,
  theme,
  services,
  providerHref,
  whatsapp,
  locale,
  labels,
}: {
  data: ServicesCatalogData
  onChange: (next: ServicesCatalogData) => void
  editing: boolean
  theme: SiteColorTheme
  /** Os serviços ativos do cadastro. Vêm do backend, não do documento do site. */
  services: ShowcaseService[]
  /**
   * Destino de reserva quando o site NÃO tem página de agendamento (o perfil do
   * prestador). Enquanto existir a página própria, é ela que recebe o clique —
   * ver o comentário do botão, abaixo.
   */
  providerHref: string | null
  /**
   * O WhatsApp do negócio — o MESMO da seção de contato, descido pela casca.
   *
   * Não é campo desta seção de propósito: um número próprio aqui seria a
   * segunda verdade que a casca inteira existe para evitar (o líder troca o
   * número no contato e o botão do card continua ligando para o antigo).
   */
  whatsapp: string
  locale: string
  labels: {
    /** Quantos cards cabem por tela (o antigo "colunas"). */
    perView: string
    cta: string
    /** Rótulo quando o clique abre o agendamento do próprio site. */
    book: string
    /** Serviço sob orçamento: no lugar do preço e no lugar do botão. */
    quoteBadge: string
    quoteCta: string
    /** Mensagem já escrita no WhatsApp. `{service}` vira o nome do serviço. */
    quoteMessage: string
    empty: string
    emptyHint: string
    /** Instrução do construtor no lugar da foto que falta. */
    noPhoto: string
    /** Aria das setas do trilho. */
    prev: string
    next: string
    hourSuffix: string
    minSuffix: string
  }
}) {
  // Vazia, esta seção não chega até aqui em leitura: quem corta é o canvas,
  // pela regra única de `section-content.ts` — e ele corta a MOLDURA inteira,
  // com o cabeçalho que a casca desenha por fora. Cortar aqui dentro deixaria
  // na página um título anunciando o vazio.

  const { bookingHref } = useSiteRuntime()

  const railRef = useRef<HTMLDivElement | null>(null)
  // Começa sem seta nenhuma e o efeito acende as que têm destino. O sentido do
  // erro importa: um quadro a mais sem seta ninguém vê, enquanto uma seta que
  // aparece e some parece defeito.
  const [reach, setReach] = useState({ prev: false, next: false })

  const measure = useCallback(() => {
    const el = railRef.current
    if (!el) return
    // A folga de 1px não é preciosismo: `scrollLeft` volta fracionário em tela
    // com DPI não inteiro e com o zoom da prancheta, e a comparação exata
    // deixaria a seta acesa no fim do trilho, apontando para lugar nenhum.
    const max = el.scrollWidth - el.clientWidth
    setReach({ prev: el.scrollLeft > 1, next: el.scrollLeft < max - 1 })
  }, [])

  useEffect(() => {
    const el = railRef.current
    // Sem card não há trilho — e são o número de cards e a largura escolhida
    // que decidem se sobra algo escondido, por isso o efeito depende dos dois.
    if (!el || services.length === 0 || !data.columns) return

    measure()

    // ResizeObserver, e não `window.resize`: no construtor a prancheta troca de
    // largura (Desktop/Tablet/Celular) e recebe zoom SEM a janela mudar de
    // tamanho. Sem observar o próprio trilho, a seta ficaria mentindo até
    // alguém rolar.
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, services.length, data.columns])

  /** Anda ~90% do que está à vista: a sobra deixa uma pista do card anterior. */
  const page = (dir: 1 | -1) => {
    const el = railRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" })
  }

  /**
   * A seta é CONTROLE, não conteúdo do site.
   *
   * O fundo do canvas desfaz a seleção no `pointerdown`; sem parar o gesto
   * aqui, o líder que seleciona a seção e clica na seta para ver o próximo
   * serviço perde a seleção e o painel fecha na mão dele. Mesma regra da barra
   * de ferramentas da seção.
   */
  const arrowStop = (e: React.PointerEvent) => e.stopPropagation()

  const arrowStyle = {
    background: theme.primary,
    color: theme.background,
    boxShadow: `3px 3px 0 0 ${theme.background}`,
  }

  return (
    <>
      {editing && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
            {labels.perView}
          </span>
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ ...data, columns: n })}
              className="h-7 w-7 border-2 border-[#0B0B0D] text-[10px] font-extrabold"
              style={
                data.columns === n
                  ? { background: theme.primary, color: theme.background }
                  : { background: "#1D1810", color: "#9A938A" }
              }
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {services.length === 0 ? (
        <div
          className="border-2 border-dashed p-6 text-center"
          style={{ borderColor: theme.textSecondary }}
        >
          <p className="text-sm font-extrabold" style={{ color: theme.textPrimary }}>
            {labels.empty}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: theme.textSecondary }}>
            {labels.emptyHint}
          </p>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={railRef}
            onScroll={measure}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto overflow-y-hidden pb-3 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ msOverflowStyle: "none" }}
          >
          {services.map((service) => {
            const price = formatPrice(service.price_amount, locale)
            const duration = formatDuration(
              service.duration_minutes,
              labels.hourSuffix,
              labels.minSuffix
            )
            // ═══ SOB ORÇAMENTO NÃO AGENDA: ELE CONVERSA ═══
            //
            // O serviço sem preço não pode passar pelo agendamento, que cobra
            // sinal — o backend recusa (mig 239) e o cliente descobriria isso
            // três telas adiante. Então o card troca de destino: o botão vira
            // "Pedir orçamento" e abre o WhatsApp do negócio já dizendo de qual
            // serviço se trata, que é a informação que se perde quando a pessoa
            // chega no chat de mãos vazias.
            const quote = service.price_on_request === true
            const quoteHref = quote ? whatsappHref(whatsapp) : ""
            const quoteLink = quoteHref
              ? `${quoteHref}?text=${encodeURIComponent(
                  labels.quoteMessage.replace("{service}", service.name)
                )}`
              : ""
            // O serviço viaja na URL para a página de agendamento abrir já com
            // ele marcado — quem clicou no card já escolheu.
            const ctaHref = quote
              ? quoteLink
              : bookingHref
                ? `${bookingHref}?servico=${service.id_profile_service}`
                : providerHref
            return (
              <article
                key={service.id_profile_service}
                className={`relative flex w-[15rem] shrink-0 snap-start flex-col border-2 border-[#0B0B0D] ${RAIL_ITEM_CLASS[data.columns]}`}
                style={{ background: theme.surface, boxShadow: `4px 4px 0 0 ${theme.background}` }}
              >
                {/* ═══ A FOTO É SEMPRE DESENHADA, TENHA OU NÃO IMAGEM ═══
                    Em 4:5, a MESMA proporção do card da vitrine do perfil — é
                    lá que a foto é enquadrada (o editor de zoom e arraste corta
                    nessa moldura), e um recorte diferente aqui cortaria de novo
                    o que a pessoa já tinha escolhido mostrar.
                    A moldura fica de pé mesmo sem foto porque numa FILEIRA os
                    cards dividem a linha: um sem imagem ao lado de um com
                    imagem desalinharia nome, preço e botão de todos. */}
                <div
                  className="relative aspect-[4/5] w-full shrink-0 overflow-hidden border-b-2 border-[#0B0B0D]"
                  style={{ background: theme.background }}
                >
                  {service.image_url ? (
                    // <img> e não next/image: a foto vem do R2 e é conteúdo de
                    // alto volume — a política do projeto reserva a otimização
                    // da Vercel para superfícies de baixa cardinalidade. É a
                    // mesma escolha do `EditableImage` ao lado.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={service.image_url}
                      alt={service.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
                      <ImageOff
                        className="h-8 w-8 shrink-0"
                        style={{ color: theme.primary, opacity: 0.45 }}
                        aria-hidden
                      />
                      {/* A instrução é só do construtor: no site publicado a
                          moldura vazia é discreta, e não um aviso de obra para
                          o cliente do negócio ler. */}
                      {editing && (
                        <span
                          className="text-[10px] font-bold leading-snug"
                          style={{ color: theme.textSecondary }}
                        >
                          {labels.noPhoto}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3
                    className="text-base font-extrabold uppercase tracking-[0.06em]"
                    style={{ color: theme.textPrimary }}
                  >
                    {service.name}
                  </h3>

                  {service.description && (
                    <p
                      className="whitespace-pre-wrap text-xs leading-relaxed"
                      style={{ color: theme.textSecondary }}
                    >
                      {service.description}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
                    {quote ? (
                      <span
                        className="text-[11px] font-extrabold uppercase tracking-[0.12em]"
                        style={{ color: theme.primary }}
                      >
                        {labels.quoteBadge}
                      </span>
                    ) : (
                      price && (
                        <span className="fl-display text-xl leading-none" style={{ color: theme.primary }}>
                          {price}
                        </span>
                      )
                    )}
                    {duration && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" style={{ color: theme.textSecondary }} />
                        <span
                          className="text-[11px] font-extrabold uppercase tracking-[0.1em]"
                          style={{ color: theme.textSecondary }}
                        >
                          {duration}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* O botão leva ao perfil onde o serviço é contratado — é lá
                      que moram agenda, sinal e pagamento. Um botão que só
                      abrisse um formulário aqui prometeria uma contratação que
                      este site não sabe concluir.
                      Em edição ele é inerte: clicar levaria o líder para fora
                      do construtor no meio da montagem. */}
                  {/* ═══ PARA ONDE O BOTÃO LEVA ═══
                      Para a página de agendamento DESTE site, com o serviço já
                      escolhido — é ela que abre a agenda de quem oferece o
                      serviço e cobra o sinal. O perfil do prestador continua
                      sendo o destino quando não há página de agendamento.

                      Isto também conserta o card no domínio próprio: ali um
                      "/freelancer/..." não existe (o proxy devolve a home do
                      cliente), e o botão levava a lugar nenhum.

                      Em edição ele é inerte: clicar levaria o líder para fora
                      do construtor no meio da montagem. */}
                  {ctaHref && (
                    <div className="pt-2">
                      {editing ? (
                        <span
                          className="block border-2 border-[#0B0B0D] px-4 py-2 text-center text-[11px] font-extrabold uppercase tracking-[0.12em]"
                          style={{ background: theme.primary, color: theme.background }}
                        >
                          {quote ? labels.quoteCta : bookingHref ? labels.book : labels.cta}
                        </span>
                      ) : (
                        <a
                          href={ctaHref}
                          {...(bookingHref && !quote
                            ? {}
                            : { target: "_blank", rel: "noopener noreferrer" })}
                          className="flex items-center justify-center gap-1.5 border-2 border-[#0B0B0D] px-4 py-2 text-center text-[11px] font-extrabold uppercase tracking-[0.12em]"
                          style={
                            quote
                              ? // Verde do WhatsApp: o botão diz para onde leva
                                // antes de ser lido. Fora da paleta do site de
                                // propósito — quem reconhece o canal é a cor.
                                { background: "#1FAF52", color: "#04120A", borderColor: "#0B0B0D" }
                              : { background: theme.primary, color: theme.background }
                          }
                        >
                          {quote ? labels.quoteCta : bookingHref ? labels.book : labels.cta}
                          {quote ? (
                            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <CalendarDays className="h-3 w-3 shrink-0" />
                          )}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
          </div>

          {/* As setas só existem quando há para onde ir. A da esquerda nasce
              escondida e aparece depois do primeiro avanço: sem ela, quem
              rolasse ficaria só com o caminho de ida. */}
          {reach.prev && (
            <button
              type="button"
              onPointerDown={arrowStop}
              onClick={() => page(-1)}
              aria-label={labels.prev}
              className="absolute left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center border-2 border-[#0B0B0D]"
              style={arrowStyle}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
          )}
          {reach.next && (
            <button
              type="button"
              onPointerDown={arrowStop}
              onClick={() => page(1)}
              aria-label={labels.next}
              className="absolute right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center border-2 border-[#0B0B0D]"
              style={arrowStyle}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>
      )}
    </>
  )
}
