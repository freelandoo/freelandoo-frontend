// O QUE NÃO É SERVIÇO, SEGMENTO NEM DADO DA EMPRESA: o passo a passo, os
// diferenciais e o FAQ geral.
//
// Vizinhos: `content/offer.ts` (segmentos, financiamento, cargas) e
// `content/company.ts` (números, projetos, unidades, avaliações, equipe).

import type { IconName } from "../icons";

/* ══════════════════ § 5 — COMO FUNCIONA ═════════════════════════════════ */

/**
 * ⚠️ O PASSO A PASSO É DO PROCESSO, NÃO DO RESULTADO. Cada etapa descreve algo
 * que a EcoLuz faz e controla; nenhuma promete prazo, porque o prazo do meio do
 * caminho é da concessionária e virar promessa aqui seria uma cobrança que a
 * empresa não tem como honrar.
 *
 * ⚠️ A INSTALAÇÃO VEM ANTES DA HOMOLOGAÇÃO, e a ordem foi corrigida para esta
 * na entrega de 17/09 — é a ordem do brief e é a ordem real do processo no
 * Brasil: o projeto é aprovado, o sistema é instalado, e só então a
 * concessionária vistoria e troca o medidor. A versão anterior deste arquivo
 * punha a homologação em quarto lugar, o que descrevia um processo que não
 * existe.
 */
export const STEPS: { n: string; title: string; text: string }[] = [
  {
    n: "01",
    title: "Análise do consumo",
    text: "Lemos o histórico e a tarifa da sua conta de luz. É esse número que dimensiona o sistema — não um pacote pronto, e não o tamanho do telhado.",
  },
  {
    n: "02",
    title: "Visita técnica",
    text: "Avaliação do local: cobertura, estrutura, padrão de entrada e sombreamento ao longo do dia. É a visita que separa o que parece possível do que é.",
  },
  {
    n: "03",
    title: "Dimensionamento e projeto",
    text: "Projeto elétrico, definição dos equipamentos e estimativa de geração, com a proposta aberta: você vê o que está incluído antes de decidir qualquer coisa.",
  },
  {
    n: "04",
    title: "Instalação",
    text: "Equipe técnica no local, fixação adequada à sua cobertura e acabamento elétrico organizado — com a rotina da casa ou do negócio afetada o mínimo possível.",
  },
  {
    n: "05",
    title: "Homologação",
    text: "Conduzimos a documentação e o processo na concessionária até a vistoria e a troca do medidor. É a etapa em que mais gente trava sozinha.",
  },
  {
    n: "06",
    title: "Acompanhamento pós-venda",
    text: "Sistema gerando e monitorado. A partir daí o desempenho é acompanhado, para que a economia do primeiro mês continue aparecendo anos depois.",
  },
];

/* ══════════════════ § 3 — POR QUE ESCOLHER A ECOLUZ ═════════════════════ */

/**
 * ⚠️ ESTA SEÇÃO FALA DA ECOLUZ, NÃO DE ENERGIA SOLAR.
 *
 * Ela substituiu (17/09) uma lista de benefícios genéricos do produto — "conta
 * menor", "imóvel valorizado", "energia limpa" — que qualquer concorrente
 * poderia copiar sem trocar uma vírgula, porque não dizia nada sobre quem
 * escreveu. O brief foi explícito: "evitar frases muito genéricas e mostrar o
 * que realmente fazemos".
 *
 * O que se perdeu não se perdeu: o benefício do produto é o assunto do segundo
 * ato da abertura e das páginas de serviço, que é onde ele responde a uma
 * pergunta que alguém está fazendo.
 *
 * ⚠️ CADA LINHA AQUI É UMA PROMESSA OPERACIONAL. Item novo só entra se a
 * empresa fizer aquilo em toda obra — diferencial que vale "às vezes" vira
 * reclamação na primeira vez que não valer.
 */
export const DIFFERENTIALS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "file",
    title: "Projeto personalizado",
    text: "O sistema é dimensionado sobre o seu consumo real e sobre o que a visita técnica encontrou no local. Nada de kit fechado vendido por faixa de conta.",
  },
  {
    icon: "wrench",
    title: "Instalação completa",
    text: "Estrutura, módulos, inversor, proteções e acabamento elétrico. Uma responsabilidade só, do parafuso ao disjuntor — sem repassar parte da obra para você resolver.",
  },
  {
    icon: "team",
    title: "Equipe especializada",
    text: "Quem projeta e quem instala é equipe própria, treinada para trabalho em altura e para o padrão elétrico da concessionária daqui.",
  },
  {
    icon: "shield",
    title: "Homologação acompanhada",
    text: "A documentação e o processo na Equatorial ficam com a EcoLuz, até a vistoria e a troca do medidor. É a parte burocrática que trava quem compra sozinho.",
  },
  {
    icon: "support",
    title: "Pós-venda de verdade",
    text: "Depois de ligado o sistema continua sendo acompanhado. Se a geração cair, a gente quer saber antes de você — é para isso que serve o monitoramento.",
  },
  {
    icon: "pin",
    title: "Atendimento no Maranhão",
    text: "Empresa maranhense, com loja em São Luís e unidade em Vitória do Mearim. Quem atende está perto, e isso aparece no dia em que alguma coisa precisa ser resolvida.",
  },
];

/* ══════════════════ § 12 — FAQ DA HOME ══════════════════════════════════ */

/**
 * ⚠️ ESTE FAQ RESPONDE O QUE SE PERGUNTA ANTES DE ESCOLHER SERVIÇO. As dúvidas
 * específicas de cada projeto vivem no FAQ da página dele — repetir as mesmas
 * perguntas nas duas faria a home e a página interna disputarem o mesmo
 * resultado de busca.
 *
 * ⚠️ ELE É MARCADO EM JSON-LD (`FaqLd`, montado em `index.tsx`), então toda
 * pergunta aqui PRECISA estar visível na página. Marcar pergunta que o
 * visitante não encontra é conteúdo oculto, e rende ação manual.
 *
 * As perguntas são as que o próprio cliente listou no brief como "as que
 * realmente chegam", mais a do dia nublado — que é a mais buscada do ramo.
 */
export const FAQ: { q: string; a: string }[] = [
  {
    q: "A conta de energia fica zerada?",
    a: "Não, e quem promete isso está vendendo o que não entrega. O sistema abate a parte da conta que corresponde à energia consumida. Continuam sendo cobrados o custo de disponibilidade — a taxa mínima da concessionária, que existe enquanto houver ligação — e os tributos. O que dá para fazer é reduzir a conta de forma relevante, e é isso que a análise mostra em número.",
  },
  {
    q: "Quanto custa um projeto?",
    a: "Depende do consumo que ele precisa cobrir, do tipo de telhado e do arranjo escolhido. Qualquer número dito antes de olhar a conta de luz é chute — e chute nessa conversa costuma ser para baixo, o que vira surpresa desagradável na proposta. A análise técnica é gratuita e é ela que responde.",
  },
  {
    q: "Posso financiar?",
    a: "Pode. Trabalhamos com linhas de financiamento para energia solar, em até 120 meses, e a análise entra junto com a proposta técnica. Condições, prazo e taxa dependem da aprovação de crédito pela instituição financeira — a EcoLuz não aprova crédito, apenas encaminha.",
  },
  {
    q: "Vocês fazem toda a instalação?",
    a: "Sim. Estrutura, módulos, inversor, proteções e acabamento elétrico são executados pela nossa equipe. Você não precisa contratar eletricista à parte nem acompanhar fornecedor de estrutura: é uma responsabilidade só.",
  },
  {
    q: "Vocês cuidam da homologação com a Equatorial?",
    a: "Cuidamos. A documentação, o pedido de acesso e o acompanhamento até a vistoria e a troca do medidor ficam com a EcoLuz. É a etapa em que mais gente trava quando compra equipamento por conta própria.",
  },
  {
    q: "Quanto tempo leva para instalar?",
    a: "A instalação em si costuma ser questão de poucos dias, conforme o porte do sistema e a cobertura. O que alonga o calendário é a etapa na concessionária, que tem prazo próprio e não depende de nós — por isso a gente prefere dizer em que etapa o seu projeto está a dar uma data que não controla.",
  },
  {
    q: "Vocês atendem minha cidade?",
    a: "A loja fica no Turu, em São Luís, e temos unidade em Vitória do Mearim. O atendimento cobre a Ilha do Maranhão — São Luís, São José de Ribamar, Paço do Lumiar e Raposa — e outras localidades do estado. Se a sua cidade não está nessa lista, vale perguntar: depende do porte do projeto e da distância.",
  },
  {
    q: "Preciso ter um telhado próprio?",
    a: "Precisa ter onde instalar e autorização para isso. Telhado é o caso mais comum, mas o sistema também pode ir ao solo, em estrutura sobre laje ou em cobertura de garagem. Em imóvel alugado dá para instalar com a autorização do proprietário — vale conversar antes, porque o sistema é benfeitoria e isso entra na conversa com ele.",
  },
  {
    q: "Como funciona a economia com energia solar?",
    a: "Durante o dia os módulos geram e o consumo do imóvel sai dessa geração. O que sobra é injetado na rede e vira crédito na concessionária, que você usa à noite e nos dias de menor geração. A conta passa a cobrar principalmente o custo de disponibilidade e os tributos — e a diferença entre isso e o que você paga hoje é a economia.",
  },
  {
    q: "Energia solar funciona em dia nublado?",
    a: "Funciona, com geração menor. O sistema usa a luz do sol, não o calor — em dia encoberto ele continua produzindo, só que abaixo do máximo. É por isso que o dimensionamento é feito sobre a média do ano e não sobre o melhor dia.",
  },
];
