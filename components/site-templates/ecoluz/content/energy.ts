// A ENERGIA EM MOVIMENTO — o texto das cenas que MOSTRAM como o sistema
// funciona, em vez de só dizer.
//
// Vizinhos: `content/site.ts` (passo a passo, diferenciais, FAQ) e
// `content/offer.ts` (segmentos, financiamento, cargas). Este arquivo guarda o
// que as peças visuais novas contam: o fluxo sol → crédito, as três
// topologias (com rede, sem rede, as duas) e o caminho da homologação.
//
// ⚠️ NENHUM NÚMERO AQUI, E É DE PROPÓSITO. As cenas explicam o MECANISMO —
// para onde a energia vai —, não quanto ela rende. Rendimento depende de
// consumo, tarifa, telhado e local, e a única peça do site que fala em número
// é a calculadora, porque lá o número é da pessoa, não nosso.
//
// ⚠️ E O CRÉDITO É DESCRITO "CONFORME AS REGRAS DA COMPENSAÇÃO". A regra do
// crédito de energia é da regulação e da concessionária, muda com o tempo e
// tem prazo e condições. Escrever "o excedente vira dinheiro" seria uma
// promessa que a EcoLuz não controla.

import type { IconName } from "../icons";

/* ══════════════════ O FLUXO: SOL → CRÉDITO ══════════════════════════════ */

export type FlowStage = {
  /** A etiqueta curta, que vai no nó do diagrama e no sobretítulo. */
  tag: string;
  title: string;
  text: string;
};

/**
 * Os seis momentos da energia, na ordem em que ela anda.
 *
 * ⚠️ A ORDEM É A DO DIAGRAMA (`energy-flow.tsx`): cada índice aqui acende o
 * nó de mesmo índice lá. Acrescentar um momento no meio desta lista sem
 * desenhar o nó correspondente deixaria o texto falando de uma peça que a
 * imagem não tem.
 */
export const FLOW: FlowStage[] = [
  {
    tag: "Sol",
    title: "A luz chega aos módulos.",
    text: "O sistema trabalha com a luz do dia, não com o calor. Em dia encoberto a geração cai, mas não para — é por isso que o projeto é feito sobre a média do ano, e não sobre o melhor dia.",
  },
  {
    tag: "Geração",
    title: "Os módulos transformam luz em energia.",
    text: "Cada módulo gera corrente contínua. Quantos módulos, em que arranjo e virados para onde é exatamente o que o dimensionamento decide a partir da sua conta.",
  },
  {
    tag: "Inversor",
    title: "A corrente vira a energia da tomada.",
    text: "O inversor converte a corrente dos módulos na energia que o imóvel usa e registra quanto foi gerado — é dele que sai o monitoramento.",
  },
  {
    tag: "Consumo",
    title: "O imóvel usa primeiro o que gera.",
    text: "Durante o dia, o que está ligado na casa ou no negócio é alimentado pela geração solar. Essa parte nem chega a passar pela conta.",
  },
  {
    tag: "Rede",
    title: "O que sobra vai para a rede.",
    text: "O excedente é injetado na rede da concessionária através do medidor bidirecional, instalado na homologação — ele registra o que entra e o que sai.",
  },
  {
    tag: "Crédito",
    title: "E volta como crédito na conta.",
    text: "A energia injetada vira crédito, conforme as regras da compensação, e abate o consumo da noite e dos dias de menor geração. O custo de disponibilidade e os tributos continuam sendo cobrados.",
  },
];

/* ══════════════════ AS TRÊS TOPOLOGIAS ══════════════════════════════════ */

export type SystemMode = "on" | "off" | "hybrid";

export type SystemInfo = {
  mode: SystemMode;
  label: string;
  /** A frase de uma linha — o que a topologia desenhada está dizendo. */
  line: string;
  text: string;
  /** Para quem costuma fazer sentido. Descritivo, nunca "é o melhor para". */
  fits: string[];
  /** Página de serviço que aprofunda — o slug em `content/services.ts`. */
  page: string;
};

/**
 * ⚠️ O HÍBRIDO NÃO TEM PÁGINA PRÓPRIA e aponta para a de off-grid: é lá que o
 * site já separa os três arranjos e explica o que cada um exige. Uma página
 * nova só para ele teria que afirmar detalhe técnico que o cliente não
 * informou — e a de off-grid já responde a pergunta.
 */
export const SYSTEMS: SystemInfo[] = [
  {
    mode: "on",
    label: "On-grid",
    line: "Conectado à rede. A rede guarda o que sobra.",
    text: "O arranjo mais comum. O sistema gera, o imóvel consome, e o excedente vai para a rede e volta como crédito. Sem bateria, costuma ser o de menor investimento — mas desliga junto quando a rede cai, por segurança de quem trabalha nela.",
    fits: ["Casas e comércios com rede estável", "Quem quer reduzir a conta", "Quem não precisa de reserva de energia"],
    page: "energia-solar-residencial",
  },
  {
    mode: "off",
    label: "Off-grid",
    line: "Sem rede. A bateria guarda o que sobra.",
    text: "O sistema não depende da concessionária: o que é gerado de dia carrega o banco de baterias, e é ele que alimenta a noite. O dimensionamento é mais exigente, porque não existe rede para socorrer um dia ruim.",
    fits: ["Sítios e chácaras onde a rede não chega", "Bomba de poço e cargas que não podem parar", "Quem não quer depender da rede"],
    page: "sistema-off-grid",
  },
  {
    mode: "hybrid",
    label: "Híbrido",
    line: "Rede e bateria. As duas guardam o que sobra.",
    text: "Continua conectado à rede e ganha baterias. No dia a dia funciona como o on-grid; quando a rede cai, as cargas escolhidas seguem ligadas pela bateria. É a resposta para quem convive com queda de energia.",
    fits: ["Onde a queda de energia é rotina", "Comércio que não pode parar", "Quem quer o crédito e a reserva"],
    page: "sistema-off-grid",
  },
];

/* ══════════════════ A HOMOLOGAÇÃO ═══════════════════════════════════════ */

/**
 * O caminho do projeto na concessionária, até o sistema gerar.
 *
 * ⚠️ É UMA VISUALIZAÇÃO DO PROCESSO, NÃO O STATUS DE UM CLIENTE. Nada aqui é
 * dado real de obra — a tela deixa isso escrito em voz alta. E nenhuma etapa
 * tem prazo: o prazo do meio do caminho é da concessionária, e virar data
 * aqui seria uma cobrança que a EcoLuz não tem como honrar (a mesma regra do
 * passo a passo em `content/site.ts`).
 */
export const HOMOLOGATION: { icon: IconName; label: string; text: string }[] = [
  { icon: "file", label: "Projeto", text: "Projeto elétrico assinado por responsável técnico." },
  { icon: "file", label: "Documentação", text: "Formulários, diagramas e dados do imóvel reunidos por nós." },
  { icon: "building", label: "Concessionária", text: "Pedido de acesso protocolado e acompanhado na Equatorial." },
  { icon: "shield", label: "Vistoria", text: "A concessionária confere a instalação no local." },
  { icon: "bolt", label: "Medidor", text: "Troca pelo medidor bidirecional, que registra o que entra e o que sai." },
  { icon: "sun", label: "Sistema ativo", text: "Liberado para gerar — e o monitoramento começa." },
];

/* ══════════════════ O MAPA ══════════════════════════════════════════════ */

/**
 * As cidades marcadas no mapa, em coordenadas geográficas (graus decimais).
 *
 * ⚠️ AS COORDENADAS SÃO DO CENTRO DE CADA MUNICÍPIO (sede), não do endereço da
 * loja. O mapa responde "até onde a EcoLuz vai", e um alfinete no endereço
 * exato de uma rua seria uma precisão que ele não precisa ter — e que, errada
 * por uma quadra, mandaria gente para o lugar errado.
 *
 * `slug` liga a cidade à página dela, quando existe (`content/areas.ts`).
 */
export const MAP_CITIES: {
  name: string;
  lat: number;
  lon: number;
  slug?: string;
  note: string;
  base?: boolean;
  unit?: boolean;
}[] = [
  { name: "São Luís", lat: -2.5297, lon: -44.3028, slug: "sao-luis", note: "Loja no Turu — a nossa base.", base: true, unit: true },
  { name: "São José de Ribamar", lat: -2.5617, lon: -44.0542, slug: "sao-jose-de-ribamar", note: "Do centro às áreas mais afastadas da ilha." },
  { name: "Paço do Lumiar", lat: -2.5325, lon: -44.1075, slug: "paco-do-lumiar", note: "Bairros residenciais em expansão." },
  { name: "Raposa", lat: -2.4254, lon: -44.0973, slug: "raposa", note: "Litoral: maresia pede estrutura certa." },
  { name: "Vitória do Mearim", lat: -3.4622, lon: -44.8706, note: "Nossa segunda unidade, no interior.", unit: true },
];
