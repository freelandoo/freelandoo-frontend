// "Esta seção tem o que mostrar?" — a pergunta é feita AQUI e em nenhum outro
// lugar.
//
// ═══ POR QUE A DECISÃO SUBIU PARA UM LUGAR SÓ ═══
//
// Cada seção sabia responder por si ("sem foto eu não desenho nada") e devolvia
// nada em leitura. Só que o cabeçalho — eyebrow, título gigante e linha de
// apoio — não é desenhado pela seção: é a casca (`SectionShell`) que o desenha,
// por fora. Resultado: a vitrine sem serviço cadastrado sumia, e sobrava na
// página um "CATÁLOGO DE SERVIÇOS / O QUE OFERECEMOS" anunciando o vazio, com
// a faixa inteira de `py-24` embaixo. O menu da barra, que é derivado do título
// das seções habilitadas, ainda oferecia um link para lá.
//
// Quem monta o cabeçalho e o menu é o canvas, então é o canvas que precisa
// saber se a seção existe na página — e para isso a resposta tem que estar
// fora dos componentes. Seção nova = declarar o caso aqui.
//
// ⚠️ Isto vale só para LEITURA. No construtor a seção vazia continua inteira,
// com a instrução de como preenchê-la: sumir lá esconderia do líder que ela
// existe, e ele a recriaria do zero.

import type { SiteSection } from "@/types/community-site"

/**
 * O que a resposta depende de fora do documento.
 *
 * Hoje só a vitrine: os serviços não moram no site, vêm do cadastro real a
 * cada leitura (2026-09-04) — por isso "tem serviço?" não é uma pergunta que a
 * seção consiga responder sozinha olhando os próprios dados.
 */
export type SectionContentContext = {
  serviceCount: number
}

export function sectionHasContent(
  section: SiteSection,
  ctx: SectionContentContext
): boolean {
  switch (section.kind) {
    // Sem slide não há banner: um bloco de meia tela vazio seria pior do que
    // não existir.
    case "hero":
      return section.data.slides.length > 0

    // O conteúdo é o cadastro do líder, não o documento. Zero serviço ativo =
    // vitrine sem nada para vender.
    case "services_catalog":
      return ctx.serviceCount > 0

    case "gallery":
      return section.data.photos.length > 0

    case "testimonials":
      return section.data.items.length > 0

    case "cta":
      return Boolean(
        section.data.badge ||
          section.data.items.length > 0 ||
          section.data.ctaText ||
          section.data.note
      )

    case "contact":
      return Boolean(
        section.data.address ||
          section.data.mapsUrl ||
          section.data.whatsapp ||
          section.data.email ||
          section.data.hours ||
          section.data.socials.length > 0
      )

    // "Sobre" e "quem está por trás" carregam texto do líder e desenham algo em
    // qualquer estado — o título da seção já é conteúdo delas.
    case "about":
    case "person":
      return true

    // Pergunta sem resposta escrita não é conteúdo — e um bloco "Perguntas
    // frequentes" vazio é justamente o que faz o visitante achar que o site
    // está pela metade.
    case "faq":
      return section.data.items.some((i) => i.question.trim() || i.answer.trim())

    // Basta o nome da cidade: a observação é opcional de propósito (nem toda
    // área atendida tem detalhe a dar).
    case "areas":
      return section.data.items.some((i) => i.name.trim())
  }
}

/**
 * As seções que a página realmente mostra.
 *
 * No construtor é tudo (inclusive a oculta, esmaecida); em leitura, só o que
 * está habilitado E tem conteúdo. É desta lista que saem, na ordem: a
 * alternância de faixas, a seta do banner para a seção seguinte, o recuo do
 * topo quando a página não começa com banner e os itens do menu.
 */
export function visibleSections(
  sections: SiteSection[],
  editing: boolean,
  ctx: SectionContentContext
): SiteSection[] {
  if (editing) return sections
  return sections.filter((s) => s.enabled && sectionHasContent(s, ctx))
}
