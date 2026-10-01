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

// ⚠️ A PRÉVIA × A LOJA deixou de ser uma constante daqui: quem decide é o
// catálogo (`content/catalog.ts`, campo `live`), que vira sozinho no dia em que
// a Taiz liga o primeiro produto na Loja dela. O pagamento é o carrinho do
// site (`/store-carts`, mig 271), não mais a página de cada produto.

export function whatsappLink(message: string): string | null {
  if (!BRAND.whatsappNumber) return null
  return `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`
}

export function mailtoOrder(subject: string, body: string): string {
  return `mailto:${BRAND.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
