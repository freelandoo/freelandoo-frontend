// O NEGÓCIO — a fonte ÚNICA de tudo que identifica a EcoLuz.
//
// ⚠️ NADA AQUI É REPETIDO EM OUTRO ARQUIVO. Telefone, endereço e e-mail
// aparecem na barra, no rodapé, no botão flutuante, na página de contato e no
// JSON-LD — cinco superfícies. Escritos em cada uma, o dia em que o número
// mudar, uma delas fica para trás anunciando o antigo, sem erro nenhum.

/** O telefone tem TRÊS formas porque tem três empregos, e derivar uma da
 *  outra erra no primeiro número com nono dígito ausente ou DDD de duas
 *  casas. Ele é o mesmo em todas — o que muda é o formato. */
export const BUSINESS = {
  name: "EcoLuz Energia Solar",
  owner: "Mauricio Sousa Rocha",

  /** O que se lê. */
  phoneDisplay: "(98) 99138-0808",
  /** O `tel:` do clique no celular. */
  phoneE164: "+5598991380808",
  /** O que o `wa.me` recebe — só dígitos, com o 55 na frente. */
  whatsappNumber: "5598991380808",

  email: "ecoluzmaranhao@gmail.com",
  instagram: "https://www.instagram.com/ecoluzmaranhao",

  street: "Av. Mário Andreazza, 03 — loja 05",
  complement: "Centro Comercial Bougainville",
  district: "Turu",
  city: "São Luís",
  state: "MA",
  stateFull: "Maranhão",
  postalCode: "65073-000",
  country: "BR",
} as const;

/** O endereço numa linha, como se escreve num envelope. */
export const ADDRESS_LINE = `${BUSINESS.street}, ${BUSINESS.complement} — ${BUSINESS.district}, ${BUSINESS.city}/${BUSINESS.state}, ${BUSINESS.postalCode}`;

export const TEL_HREF = `tel:${BUSINESS.phoneE164}`;
export const MAIL_HREF = `mailto:${BUSINESS.email}`;

/**
 * O link do WhatsApp, com a mensagem já escrita.
 *
 * ⚠️ O HOST É `wa.me` E ISSO NÃO É ESTILO: é por ele que o painel de
 * Indicadores do dono reconhece o clique como lead (`site-analytics`). Outro
 * host — `api.whatsapp.com`, um encurtador — e o lead some da conta dele sem
 * erro nenhum aparecer.
 *
 * ⚠️ E É O NUMÉRICO, não o link curto do WhatsApp Business
 * (`wa.me/message/…`). O curto NÃO aceita texto pré-preenchido, e a mensagem
 * pronta é o que faz a conversa começar já sabendo de onde a pessoa veio e o
 * que ela quer — sem ela, chega um "oi" sem contexto e o atendimento recomeça
 * do zero. Os dois apontam para o mesmo aparelho.
 */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${BUSINESS.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** A mensagem de quem chega sem passar por serviço nenhum. */
export const WA_DEFAULT =
  "Olá! Vim pelo site da EcoLuz e quero saber quanto posso economizar com energia solar.";

/**
 * O mapa da página de contato, derivado do endereço que já está aqui em cima.
 *
 * Campo próprio seria a segunda verdade de sempre: o endereço mudaria num
 * lugar e o alfinete continuaria no antigo. O formato `?q=…&output=embed` não
 * pede chave de API, e `www.google.com` já está no `frame-src` da CSP da
 * plataforma.
 */
export const MAP_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(
  `${BUSINESS.street}, ${BUSINESS.district}, ${BUSINESS.city} - ${BUSINESS.state}, ${BUSINESS.postalCode}`,
)}&output=embed`;
