"use client";

/**
 * HERO.
 *
 * O momento orquestrado do site é UM: o queimador acende. Ele roda uma vez,
 * no carregamento, e nada mais na página se move sozinho depois disso —
 * exceto a chama, que é fogo e fogo não fica parado.
 *
 * ── As camadas, de trás para frente ──────────────────────────────────────
 *   1. campo térmico WebGPU (fixo, na página inteira, fora deste arquivo)
 *   2. FOTO, com parallax
 *   3. véu da foto — é ele que segura o contraste do texto
 *   4. o queimador: desenho SVG + chama WebGPU por cima
 *   5. o texto
 *
 * ⚠️ O véu (3) não é enfeite e não pode ser afrouxado sem medir. A manchete
 * é giz claro sobre grafite; com a foto entrando sem véu, o contraste cai
 * exatamente na região em que o técnico aparece — que é onde o olho já está.
 */

import Image from "next/image";
import { BUSINESS } from "./content/business";
import { CITIES } from "./content/cities";
import { Actions, Shell } from "./ui";
import { useParallax } from "./motion";
import BurnerFlame from "./draw/burner-flame";
import heroBg from "./assets/hero-bg.webp";

export default function Hero() {
  const bgRef = useParallax<HTMLDivElement>(0.1);
  const ringRef = useParallax<HTMLDivElement>(-0.07);

  return (
    <section className="relative pt-28 pb-16 md:pt-32 md:pb-24">
      {/*
        O FUNDO — e o ÚNICO recorte desta seção.

        ⚠️ O `overflow-hidden` mora AQUI, e não na <section>. Na seção ele
        recortava também o QUEIMADOR, que é mais alto que o bloco de texto e
        por isso passa da borda de baixo: a chama saía com um corte reto no
        meio dos jatos, e o corte só aparece na tela — nada acusa.

        Quem precisa de recorte é só a FOTO, que sangra 14% para o parallax
        ter folga. Ela fica dentro desta caixa; a chama segue livre para a
        seção seguinte, que não tem fundo próprio e por isso a deixa passar.

        Regra: o recorte vai no FUNDO, nunca no invólucro.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/*
          ⚠️ A sangria de 14% em cima e embaixo existe por causa do parallax:
          com `speed 0.10` a camada anda ~±10% da altura da janela, e sem
          folga ela expõe a borda no topo ou no rodapé da seção. É o defeito
          mais comum de parallax de fundo, e só aparece rolando.
        */}
        <div
          ref={bgRef}
          className="absolute -bottom-[14%] -top-[14%] left-0 right-0"
        >
          <Image
            src={heroBg}
            alt=""
            fill
            priority
            sizes="100vw"
            // `object-position` puxado para a direita: o lado esquerdo da
            // foto é escuro e vazio, que é exatamente onde a manchete mora.
            // Centrar traria o técnico para debaixo do texto.
            className="object-cover object-[78%_center] opacity-[0.26] md:opacity-[0.32]"
          />
        </div>

        {/*
          VÉU. Mais fechado à esquerda (onde está o texto) e mais aberto à
          direita (onde está o técnico), para a foto existir sem disputar
          legibilidade com a manchete.
        */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              "linear-gradient(to right, rgb(30 33 36 / 0.93) 0%, rgb(30 33 36 / 0.86) 34%, rgb(30 33 36 / 0.46) 66%, rgb(30 33 36 / 0.62) 100%)",
              "linear-gradient(to bottom, rgb(30 33 36 / 0.55) 0%, rgb(30 33 36 / 0) 22%, rgb(30 33 36 / 0) 62%, rgb(30 33 36 / 0.95) 100%)",
            ].join(","),
          }}
        />
      </div>

      <Shell className="relative">
        {/* 52rem: largura em que "FOGÃO PARADO" cabe numa linha a 6rem. */}
        <div className="datum relative max-w-[52rem]">
          <span className="tick" aria-hidden="true" />

          <h1 className="d-xl text-[var(--rf-chalk)]">
            Fogão parado
            <br />
            não espera
          </h1>

          <p className="mt-7 max-w-[52ch] text-lg leading-relaxed text-[var(--rf-chalk-dim)] md:text-xl">
            {BUSINESS.tagline}, residencial e industrial. Diagnóstico antes de
            trocar peça, e a chama volta a ser azul.
          </p>

          <Actions
            waMessage="Olá, Ricardo! Vi o site e preciso de atendimento no meu fogão."
            className="mt-9"
          />

          {/* 1 coluna no celular: com 2 colunas e 3 células, a quarta ficava
              vazia e lia como um bloco quebrado. */}
          <dl className="mt-12 grid max-w-[44rem] grid-cols-1 gap-px border border-[var(--rf-line)] bg-[var(--rf-line)] sm:grid-cols-3">
            <Cell label="Atendimento">{BUSINESS.hoursShort}</Cell>
            <Cell label="Visita">{BUSINESS.scheduling}</Cell>
            <Cell label="Cidades">
              {CITIES.map((c) => c.name).join(", ")}
            </Cell>
          </dl>
        </div>

        {/*
          O QUEIMADOR: desenho + chama.

          ⚠️ Ele MUDA DE LUGAR, e não é capricho de breakpoint.

          No celular não há largura para o texto e o anel dividirem a mesma
          faixa: espremido na borda, ele saía cortado ao meio e com o brilho
          exatamente atrás do botão de WhatsApp — decoração disputando com a
          única coisa que a tela precisa que a pessoa aperte. Em vez de
          encolher a peça até ela não dizer mais nada, ela ganha espaço
          próprio: entra no fluxo, inteira e centrada, depois do bloco de
          texto. Quem rola vê o fogo de verdade.

          No desktop ela volta a ser absoluta e pousa SOBRE A FOTO, e não
          no vazio ao lado. A altura é decisão de composição e já mudou:
          hoje ela corre na faixa do braço e da bancada, acima do fogão em
          que o técnico trabalha. O limite de cima é o ROSTO DELE — com a
          chama sobre a cara, a peça deixa de ler como queimador e vira
          acidente na foto. Subiu? Confira essa borda antes de fechar.

          ⚠️ A SEÇÃO "defeitos" LEVA `z-10` E ISSO FICA. Hoje a peça não
          chega a invadi-la (numa janela de 1920 ela para a 7px do topo
          dela), então o `z-10` não está corrigindo nada AGORA — ele é o
          guard de quem crescer ou descer a peça de novo. Sem ele, o
          desenho, que é posicionado, pinta por cima do título de lá.

          ⚠️ O TAMANHO E OS DOIS DESLOCAMENTOS ANDAM JUNTOS. `right` e `top`
          ancoram a peça pelo canto superior direito, então mexer só na
          largura arrasta o CENTRO dela para cima e para a direita — para
          fora do fogão da foto, que é o único lugar em que ela faz sentido.
          Ao mudar a largura em N px, compense metade disso: `right` cresce
          N/2 sobre a largura do Shell e `top` cresce N/2 sobre a altura
          dele. Foi assim que o diâmetro caiu 30% sem a peça sair do lugar.

          Mexeu na foto, no recorte dela ou na altura do bloco de texto?
          Confira as duas posições de novo.
        */}
        <div
          ref={ringRef}
          aria-hidden="true"
          className="pointer-events-none relative mx-auto mt-14 w-[59vw] max-w-[280px] lg:absolute lg:right-[6.1%] lg:top-[29.6%] lg:mx-0 lg:mt-0 lg:w-[23.1vw] lg:max-w-[504px]"
        >
          <div className="relative">
            <BurnerTop />
            <BurnerFlame />
          </div>
        </div>
      </Shell>
    </section>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[color-mix(in_srgb,var(--rf-sheet)_85%,transparent)] px-4 py-3.5 backdrop-blur-[2px]">
      <dt className="note">{label}</dt>
      <dd className="mt-1 text-sm leading-snug text-[var(--rf-chalk)]">{children}</dd>
    </div>
  );
}

/**
 * Queimador de cima: a estrutura desenhada.
 *
 * A coroa acende saída por saída, uma vez, e FICA — ela é o cone interno,
 * que num queimador bem regulado é firme. Quem flameja é o envelope
 * externo, e esse é o `BurnerFlame` em WebGPU por cima.
 *
 * Essa divisão também é o caminho de reserva: sem WebGPU, a coroa continua
 * acesa; só perde o movimento.
 */
function BurnerTop() {
  const crown = Array.from({ length: 24 }, (_, i) => i);
  return (
    <svg viewBox="0 0 600 600" fill="none" className="h-auto w-full">
      {/* trempe */}
      <g
        stroke="var(--rf-line)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      >
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <path
            key={a}
            d="M300 300 L300 92"
            transform={`rotate(${a} 300 300)`}
          />
        ))}
        <circle cx="300" cy="300" r="208" strokeWidth="1.5" opacity="0.5" />
      </g>

      {/* corpo do queimador */}
      <circle cx="300" cy="300" r="132" stroke="var(--rf-line-mid)" strokeWidth="2" />
      <circle cx="300" cy="300" r="104" stroke="var(--rf-line-mid)" strokeWidth="1.5" />
      <circle cx="300" cy="300" r="42" stroke="var(--rf-line-hi)" strokeWidth="2" />
      <circle cx="300" cy="300" r="13" stroke="var(--rf-line-hi)" strokeWidth="1.5" />

      {/* a coroa: 24 saídas, o cone interno */}
      <g className="ignite">
        {crown.map((i) => (
          <path
            key={i}
            d="M300 168 L300 140"
            transform={`rotate(${i * 15} 300 300)`}
            stroke="#DCF2FF"
            strokeWidth="4.5"
            strokeLinecap="round"
            style={{ ["--i" as string]: i }}
          />
        ))}
      </g>

      {/*
        A cota "CHAMA AZUL = REGULADO" foi REMOVIDA daqui, de propósito.

        Ela existia enquanto a coroa era traço estático e precisava explicar
        o próprio azul. Com a chama viva por cima, o desenho afirma sozinho —
        e o texto passou a cair em cima dos jatos, disputando com a coisa que
        ele estava tentando explicar. A frase continua dita na linha de apoio
        da manchete ("a chama volta a ser azul"), que é onde ela é lida.
      */}
    </svg>
  );
}
