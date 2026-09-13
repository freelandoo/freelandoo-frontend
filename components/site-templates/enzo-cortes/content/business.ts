import type { TemplateLinks } from "../lib";
import { PAGE, pageHref } from "../lib";

/**
 * Fonte única do negócio (NAP), horário, preços de referência e navegação.
 *
 * ── REGRA DURA: NADA AQUI É INVENTADO ────────────────────────────────────
 * Só entra o que o cliente informou. NÃO existem "anos de mercado", "N
 * clientes atendidos", certificação, prêmio, garantia nem nota média —
 * porque nenhum desses dados foi fornecido. Se um dia forem, entram AQUI e
 * em mais lugar nenhum.
 *
 * Por que isso é regra e não zelo: nota média inventada é a única coisa
 * deste arquivo que renderia PENALIZAÇÃO MANUAL do Google numa ficha local.
 * As outras mentiras só decepcionam o cliente; essa derruba o site.
 *
 * ── O QUE FOI INFORMADO ──────────────────────────────────────────────────
 * Nome do dono, endereço completo, horário, e a tabela de preços inteira.
 * É muito mais do que a maioria dos sites de barbearia publica — e é
 * justamente a tabela de preços que este site usa como peça central,
 * porque é o que responde a pergunta que faz a pessoa fechar ou desistir.
 */

/**
 * ⚠️⚠️ TELEFONE: ESTE NÚMERO É UM ESPAÇO RESERVADO, NÃO É O DO ENZO.
 *
 * O número real ainda não foi informado. Um número "aleatório" de verdade
 * seria o telefone de ALGUÉM: num link `wa.me` publicado, as mensagens dos
 * clientes do Enzo iriam parar no WhatsApp de um terceiro que nunca pediu
 * nada. Por isso o escolhido é estruturalmente IMPOSSÍVEL de ser assinante:
 * celular brasileiro é `9` seguido de dígito entre 6 e 9, e este tem `0`.
 * Ele não toca em lugar nenhum.
 *
 * ⚠️ ENQUANTO ESTE NÚMERO ESTIVER AQUI, O SITE NÃO PODE SER PUBLICADO.
 * Aceitar a oferta na plataforma NÃO publica (é decisão de desenho da mig
 * 242), então o site pode ser entregue e conferido sem risco — mas
 * `POST /admin/managed-sites/<id>/publish` só depois de trocar as três
 * linhas abaixo pelo número real.
 *
 * São TRÊS formas porque são três empregos (o que se lê, o `tel:` e o
 * `wa.me`). Derivar uma da outra parece economia e erra no primeiro número
 * com nono dígito ausente ou DDD de duas casas.
 */
export const PHONE_IS_PLACEHOLDER = true;

export const BUSINESS = {
  name: "Enzo Cortes",
  /** O que o negócio é, em três palavras. Vai no `<title>` e no cabeçalho. */
  tagline: "Barbearia",
  subTagline: "Corte, barba e sobrancelha",
  owner: "Enzo",
  ownerFull: "Enzo Paes dos Santos",

  phoneDisplay: "(11) 90000-0000",
  phoneE164: "+5511900000000",
  whatsappNumber: "5511900000000",

  street: "Av. Vitória, 144",
  neighborhood: "Jardim Pinheiros",
  city: "São Bernardo do Campo",
  state: "SP",
  stateFull: "São Paulo",
  /** Conferido: o CEP da Av. Vitória no Jd. Pinheiros / região do Alvarenga. */
  postalCode: "09854-740",
  country: "BR",

  /**
   * ⚠️ NÃO EXISTE `geo` NESTE NEGÓCIO, E A AUSÊNCIA É DELIBERADA.
   *
   * A coordenada exata da Av. Vitória não foi informada, e São Bernardo do
   * Campo é uma cidade grande: usar o centro dela poria o alfinete a cerca
   * de 8 km do Alvarenga, que é o lado oposto do município. O tema do
   * Ricardo usa "centro aproximado" porque Aguaí é pequena e o centro é uma
   * aproximação honesta; aqui não seria.
   *
   * Campo vazio não vira campo: o `prune` do JSON-LD tira o bloco, e o
   * Google geocodifica pelo endereço + CEP, que são precisos e conferidos.
   * Alfinete no lugar errado é pior que alfinete nenhum.
   */

  /**
   * Horário informado em formato inequívoco (seg a sáb, 09h às 19h) — é o
   * que permite virar `openingHoursSpecification` no JSON-LD. Horário que
   * chegasse como texto livre ficaria só como texto.
   */
  hoursHuman: "Segunda a sábado, das 09h às 19h",
  hoursShort: "Seg–Sáb · 09h–19h",
  closedHuman: "Domingo: fechado",

  /**
   * Quando a tabela de preços foi informada.
   *
   * ⚠️ É UMA CONSTANTE, NUNCA `new Date()`. A tentação é escrever "valores
   * de {ano atual}" e deixar o ano sair do relógio — e aí, virado o ano, a
   * página passa a afirmar sozinha que os preços são vigentes num ano em que
   * ninguém os confirmou. Um site que se atualiza sozinho para dizer algo que
   * não sabe é pior que um site desatualizado: o desatualizado a pessoa
   * desconfia. (E render que lê o relógio ainda quebra o cache do ISR.)
   */
  pricesAsOf: "setembro de 2026",
} as const;

/** Horário em formato Schema.org. Ver a nota acima sobre por que ele existe. */
export const OPENING_HOURS = [
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    opens: "09:00",
    closes: "19:00",
  },
] as const;

export const TEL_HREF = `tel:${BUSINESS.phoneE164}`;

/** O endereço numa linha só — cabeçalho, rodapé e JSON-LD leem daqui. */
export const ADDRESS_LINE = `${BUSINESS.street} — ${BUSINESS.neighborhood}, ${BUSINESS.city}/${BUSINESS.state}`;

/**
 * Link de WhatsApp com mensagem de contexto.
 *
 * ⚠️ O host TEM que ser `wa.me`. É por ele que o painel de Indicadores da
 * Freelandoo reconhece o clique como lead; qualquer outro host — inclusive
 * `api.whatsapp.com`, que funciona igual para o visitante — some da conta
 * sem erro nenhum, e o painel do dono passa a dizer "zero", que é pior que
 * não dizer nada porque parece dado.
 */
export function whatsappLink(message: string): string {
  return `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * O menu.
 *
 * ⚠️ É FUNÇÃO DE `links`, nunca uma lista de caminhos literais — ver a nota
 * no topo de `lib.ts`.
 */
export function navFor(links: TemplateLinks) {
  return [
    { href: pageHref(links, PAGE.servicos), label: "Serviços e preços" },
    { href: pageHref(links, PAGE.sobre), label: "A barbearia" },
    { href: pageHref(links, PAGE.contato), label: "Onde fica" },
  ];
}
