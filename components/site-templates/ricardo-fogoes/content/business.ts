import type { TemplateLinks } from "@/types/site-template";
import { PAGE, pageHref } from "../lib";

/**
 * Fonte única do negócio (NAP), links e navegação.
 *
 * REGRA DURA: nada aqui é inventado. Só entra o que o cliente informou.
 * Não existem "anos de mercado", "nº de clientes", certificação, garantia
 * nem nota média — porque nenhum desses dados foi fornecido. Se um dia
 * forem, entram AQUI e em mais lugar nenhum.
 *
 * Por que isso é regra e não zelo: nota média inventada é a única coisa
 * que renderia PENALIZAÇÃO MANUAL do Google numa ficha local. As outras
 * mentiras só decepcionam o cliente; essa derruba o site.
 */

/**
 * ⚠️ NÃO EXISTE MAIS `SITE_URL` NESTE TEMA, e a remoção é a correção.
 *
 * O endereço do site é `links.origin`, que a plataforma entrega e que é o
 * DOMÍNIO DO CLIENTE quando ele tem um. Uma constante com o domínio gravado
 * aqui continuaria compilando e publicaria canônico e `@id` de JSON-LD
 * apontando para o lugar errado em duas das três origens — sem erro nenhum,
 * e justamente no dado que o buscador usa para decidir quem é o dono da
 * página.
 */

export const BUSINESS = {
  name: "Ricardo Fogões",
  tagline: "Conserto e reforma de fogões",
  subTagline: "Residencial e industrial · multimarcas",
  owner: "Ricardo",

  phoneDisplay: "(19) 99495-7125",
  phoneE164: "+5519994957125",
  whatsappNumber: "5519994957125",

  street: "Rua Teófilo Fontes Rodrigues",
  city: "Aguaí",
  state: "SP",
  stateFull: "São Paulo",
  postalCode: "13860-000",
  country: "BR",

  /** Centro aproximado de Aguaí/SP. Geo de referência, não endereço exato. */
  geo: { lat: -22.0578, lng: -46.9739 },

  hoursHuman: "Segunda a sexta, das 08h às 18h",
  hoursShort: "Seg–sex · 08h–18h",
  closedHuman: "Sábado e domingo: fechado",
  scheduling: "Atendimento com hora marcada",

  payments: ["Cartão de débito", "Cartão de crédito"] as const,
  amenities: ["Wi-Fi", "Estacionamento"] as const,
} as const;

/**
 * Horário em formato Schema.org.
 *
 * ⚠️ Só existe porque o horário foi informado em formato inequívoco
 * (seg–sex, 08h–18h). Horário que chega como texto livre NÃO vira
 * openingHoursSpecification — adivinhar dia e hora publica horário
 * que ninguém escreveu.
 */
export const OPENING_HOURS = [
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "18:00",
  },
] as const;

export const TEL_HREF = `tel:${BUSINESS.phoneE164}`;

/**
 * Agenda do perfil na Freelandoo.
 *
 * `null` é valor legítimo e o site tem que continuar de pé sem ele:
 * o botão de agendar some e o WhatsApp assume. Botão que abre um passo 1
 * vazio é pior que botão nenhum — e boa parte deste ramo trabalha sob
 * orçamento, então agendar nem sempre é o caminho.
 *
 * Ao portar para a Freelandoo isto vira `links.booking` do TemplateProps.
 */
/**
 * O botão "Agendar visita" continua DESLIGADO, como no site de origem.
 *
 * ⚠️ A plataforma oferece `links.booking` quando o perfil tem serviço
 * cadastrado, e ligá-lo aqui seria uma linha. Não está ligado de propósito:
 * este site foi desenhado para mandar todo mundo ao WhatsApp, e acender um
 * segundo caminho de conversão mudaria a página sem ninguém ter pedido.
 * Quem quiser o agendamento troca este `null` por `links.booking` — e aí
 * confere as três telas em que `Actions` aparece.
 */
export const BOOKING_URL: string | null = null;

/**
 * Link de WhatsApp com mensagem de contexto.
 *
 * ⚠️ O host TEM que ser `wa.me`. É por ele que o painel de Indicadores da
 * Freelandoo reconhece o clique como lead; qualquer outro host (api.whatsapp
 * .com inclusive) some da conta sem erro nenhum.
 */
export function whatsappLink(message: string): string {
  return `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * O menu.
 *
 * ⚠️ VIROU FUNÇÃO DE `links`. No projeto de origem era uma lista de caminhos
 * literais, porque lá o site morava numa origem só. Aqui o MESMO site responde
 * em três (plataforma, subdomínio e domínio do cliente) e um "/servicos" fixo
 * acertaria em uma e daria 404 nas outras duas.
 */
export function navFor(links: TemplateLinks) {
  return [
    { href: pageHref(links, PAGE.servicos), label: "Serviços" },
    { href: pageHref(links, PAGE.areas), label: "Onde atendemos" },
    { href: pageHref(links, PAGE.sobre), label: "Sobre" },
    { href: pageHref(links, PAGE.contato), label: "Contato" },
  ];
}
