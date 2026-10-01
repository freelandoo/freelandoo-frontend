// A MARCA — a fonte ÚNICA de tudo que identifica a Pinkoracats.
//
// ⚠️ Nada aqui é repetido em outro arquivo: barra, rodapé, carrinho, JSON-LD
// e o e-mail do pedido leem daqui. Escrito em cada superfície, o dia em que
// um dado mudar uma delas fica para trás anunciando o antigo.

export const BRAND = {
  name: "Pinkoracats",
  handle: "PINKORACATS_NAIL_ART",
  full: "Pinkoracats Nail Art",
  owner: "Taiz Herrera",
  email: "taizherrera.nails@gmail.com",
  city: "São Bernardo do Campo",
  state: "SP",
  country: "BR",
  /**
   * ⚠️ `null` DE PROPÓSITO. O briefing proíbe link de rede social que não
   * exista de verdade, e nenhum endereço foi informado. Preenchido, o link
   * aparece sozinho no rodapé.
   */
  instagram: null as string | null,
  /**
   * ⚠️ `null` DE PROPÓSITO: nenhum número foi informado, e um número
   * inventado mandaria o cliente para o WhatsApp de um desconhecido. Com ele
   * preenchido (só dígitos, com o 55), o carrinho ganha "Pedir pelo WhatsApp"
   * — pelo host `wa.me`, que é o que o painel de Indicadores conta como lead.
   */
  whatsappNumber: null as string | null,
} as const

/**
 * ⚠️⚠️ O CATÁLOGO AINDA É PRÉVIA. Nomes, preços e estoques de
 * `products.mock.ts` são provisórios — ninguém os aprovou como oferta.
 *
 * Enquanto for `true`: uma faixa discreta diz "catálogo em prévia", o JSON-LD
 * NÃO declara preço (preço chutado no dado estruturado é o que rende ação
 * manual) e o carrinho fecha pedido por e-mail em vez de prometer pagamento.
 * Virar `false` é a decisão de que os preços são reais.
 */
export const PLACEHOLDER_CATALOG = true

/**
 * A Loja da Freelandoo onde o pagamento acontece (retirada combinada).
 *
 * É o perfil-conta da Taiz — é ELE que é dono da Loja. Um produto do site
 * passa a ser comprável no dia em que `storeProductId` for preenchido com o id
 * do produto cadastrado lá; o site nunca cobra nada por conta própria.
 */
export const STORE = {
  origin: "https://www.freelandoo.com.br",
  profileId: "cd3abc4f-e743-4017-b13e-7c3e53593740",
} as const

export function storeProductUrl(id: string): string {
  return `${STORE.origin}/p/${STORE.profileId}/produto/${id}`
}

export function whatsappLink(message: string): string | null {
  if (!BRAND.whatsappNumber) return null
  return `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`
}

export function mailtoOrder(subject: string, body: string): string {
  return `mailto:${BRAND.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
