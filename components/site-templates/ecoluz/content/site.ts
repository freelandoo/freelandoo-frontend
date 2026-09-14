// O QUE NÃO É SERVIÇO NEM ÁREA: o passo a passo, os benefícios, o FAQ geral e
// o time de atendimento.
//
// Tudo que aparece na home mora aqui — a página só monta.

import type { IconName } from "../icons";

/* ─────────────────────────── COMO FUNCIONA ──────────────────────────────── */

/**
 * ⚠️ O PASSO A PASSO É DO PROCESSO, não do resultado. Cada etapa descreve algo
 * que a EcoLuz faz e controla; nenhuma promete prazo, porque o prazo do meio
 * do caminho é da concessionária.
 */
export const STEPS: { n: string; title: string; text: string }[] = [
  {
    n: "01",
    title: "Diagnóstico da conta",
    text: "Analisamos o histórico de consumo e a tarifa da sua conta de luz para entender o cenário real — é ele que dimensiona o sistema, não um pacote pronto.",
  },
  {
    n: "02",
    title: "Visita e projeto",
    text: "Avaliação do telhado, do padrão de entrada e do sombreamento no local, seguida do projeto elétrico e da estimativa de geração.",
  },
  {
    n: "03",
    title: "Proposta com a conta aberta",
    text: "Você vê o tamanho do sistema, o que está incluído e o cenário de economia antes de decidir qualquer coisa.",
  },
  {
    n: "04",
    title: "Homologação",
    text: "Cuidamos da documentação e do processo junto à concessionária até a aprovação. É a etapa em que mais gente trava sozinha.",
  },
  {
    n: "05",
    title: "Instalação",
    text: "Equipe técnica no local, fixação adequada à cobertura e acabamento elétrico organizado — com a rotina da casa ou do negócio afetada o mínimo possível.",
  },
  {
    n: "06",
    title: "Geração e acompanhamento",
    text: "Sistema conectado e gerando. A partir daí o desempenho é monitorado, para que a economia do primeiro mês continue aparecendo anos depois.",
  },
];

/* ─────────────────────────── BENEFÍCIOS ─────────────────────────────────── */

export const BENEFITS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "wallet",
    title: "Conta menor todo mês",
    text: "A parte da conta que corresponde à energia consumida cai. O que sobra é o custo de disponibilidade e os tributos.",
  },
  {
    icon: "home",
    title: "Imóvel mais valorizado",
    text: "Um sistema instalado e homologado é benfeitoria: entra na negociação quando o imóvel for vendido ou alugado.",
  },
  {
    icon: "shield",
    title: "Proteção contra a tarifa",
    text: "Quanto mais a energia sobe, mais o sistema vale. É previsibilidade num custo que historicamente só aumenta.",
  },
  {
    icon: "leaf",
    title: "Energia limpa",
    text: "Geração sem emissão no local de consumo, com a matriz da casa ou do negócio saindo inteiramente do sol.",
  },
  {
    icon: "battery",
    title: "Autonomia quando precisa",
    text: "Com baterias, o sistema continua alimentando o essencial mesmo com a rede da concessionária fora do ar.",
  },
  {
    icon: "wrench",
    title: "Pouca manutenção",
    text: "Sem peça móvel e sem combustível. O que existe é limpeza periódica e acompanhamento do desempenho.",
  },
];

/* ─────────────────────────── FAQ DA HOME ────────────────────────────────── */

/**
 * ⚠️ ESTE FAQ RESPONDE O QUE SE PERGUNTA ANTES DE ESCOLHER SERVIÇO. As dúvidas
 * específicas de cada projeto vivem no FAQ da página dele — repetir as mesmas
 * perguntas nas duas faria a home e a página interna disputarem o mesmo
 * resultado de busca.
 */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "Energia solar funciona em dia nublado?",
    a: "Funciona, com geração menor. O sistema usa a luz do sol, não o calor — em dia encoberto ele continua produzindo, só que abaixo do máximo. É por isso que o dimensionamento é feito sobre a média do ano e não sobre o melhor dia.",
  },
  {
    q: "Preciso de bateria?",
    a: "Só se o objetivo for ter energia com a rede fora do ar. Para reduzir a conta, o sistema conectado à rede resolve e custa menos: o excedente do dia vira crédito na concessionária e você usa à noite. Bateria é sobre autonomia, não sobre economia.",
  },
  {
    q: "Quanto custa um sistema?",
    a: "Depende do consumo que ele precisa cobrir, do tipo de telhado e do arranjo escolhido. Qualquer número dito antes de olhar a conta de luz é chute — e chute nessa conversa costuma ser para baixo. A análise técnica é gratuita e é ela que responde.",
  },
  {
    q: "Em quanto tempo o sistema se paga?",
    a: "Isso também sai da análise: o retorno depende do consumo, da tarifa, do tamanho do projeto e da forma de pagamento. O que dá para dizer com honestidade é que a economia mensal é o que vai pagando o sistema, e ela começa assim que ele é conectado.",
  },
  {
    q: "O que acontece se faltar energia da concessionária?",
    a: "Num sistema conectado à rede, ele desliga junto — é uma exigência de segurança, para não energizar a rede enquanto alguém trabalha nela. Para continuar com energia na falta, o caminho é o sistema híbrido ou off-grid, com baterias.",
  },
  {
    q: "Vocês atendem fora de São Luís?",
    a: "Sim. A loja fica no Turu, em São Luís, e o atendimento cobre a Ilha do Maranhão — São José de Ribamar, Paço do Lumiar e Raposa. Para projetos fora da ilha, vale conversar: depende do porte e da localização.",
  },
];

/* ─────────────────────────── ATENDIMENTO ────────────────────────────────── */

/**
 * O time que aparece na página de contato.
 *
 * ⚠️ ESTES TRÊS NOMES NÃO SÃO PESSOAS REAIS DA ECOLUZ. Eles vieram do site
 * original e o Alex decidiu mantê-los (2026-09-14) depois de o problema ter
 * sido apontado: são nomes e cargos fabricados num site comercial, e quem
 * chamar por qualquer um dos três vai falar com o mesmo número — o do
 * Mauricio, que é o dono.
 *
 * ⚠️ POR ISSO OS TRÊS TÊM O MESMO `wa`: não existem três aparelhos. A escolha
 * do card muda só a frase com que a conversa abre, o que ao menos faz o
 * atendimento chegar sabendo qual é o assunto.
 *
 * Trocar por um card único com o nome do dono é uma linha daqui — a página lê
 * esta lista e desenha o que houver nela.
 */
export const TEAM: { name: string; role: string; text: string; wa: string }[] = [
  {
    name: "Rafael Andrade",
    role: "Atendimento inicial",
    text: "Para quem quer começar agora, tirar dúvidas e entender qual é o melhor caminho antes de decidir qualquer coisa.",
    wa: "Olá! Vim pelo site da EcoLuz e quero tirar umas dúvidas sobre energia solar.",
  },
  {
    name: "Mariana Costa",
    role: "Projeto residencial",
    text: "Para casas e famílias que querem reduzir a conta de luz com instalação segura e bem acabada.",
    wa: "Olá! Quero energia solar na minha casa. Podemos analisar a minha conta?",
  },
  {
    name: "Bruno Lima",
    role: "Empresas e negócios",
    text: "Para comércio, clínica, restaurante, escritório ou empresa que precisa de previsibilidade no custo de energia.",
    wa: "Olá! Quero energia solar para a minha empresa. Podemos avaliar o consumo?",
  },
];
