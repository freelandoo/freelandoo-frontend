"use client";

import { useEffect } from "react";

/**
 * A camada de movimento: revelar o bloco quando ele entra na tela.
 *
 * ⚠️ `IntersectionObserver` PURO, e não GSAP. Os outros temas da casa usam
 * GSAP porque têm gestos que exigem uma linha do tempo (filete que abre,
 * paralaxe com `scrub`). Aqui o gesto é UM — o bloco aparece —, e para um
 * gesto só a biblioteca é um chunk inteiro carregado no site de um cliente
 * para fazer o que o navegador já faz. Quem anima é o CSS (`theme.css`); este
 * arquivo só acende a classe.
 *
 * ⚠️ SÓ `transform` E `opacity` — as duas coisas que o navegador COMPÕE sem
 * recalcular layout nem repintar. Está no CSS, mas a regra vale para qualquer
 * gesto novo: animar altura, largura ou margem custa o DOCUMENTO INTEIRO por
 * quadro, e o sintoma é a rolagem travada, que ninguém relaciona à animação.
 *
 * ⚠️ O ESCOPO É O ELEMENTO DO TEMA, nunca o documento. O site roda DENTRO da
 * aplicação da Freelandoo, e um `querySelectorAll("[data-reveal]")` solto
 * capturaria elementos da plataforma que por acaso tivessem o atributo.
 *
 * ⚠️ QUEM ESCONDE O BLOCO ANTES É O CSS, sob o gate `data-motion="on"` posto
 * por um script INLINE (ver `index.tsx`), que roda durante o parse do HTML —
 * antes da primeira pintura. Posto aqui, num efeito, ele chegaria DEPOIS: o
 * conteúdo apareceria, sumiria e voltaria animando. E sem JavaScript o
 * atributo nunca é escrito, então a página aparece inteira em vez de ficar em
 * branco — o que importa para quem tem JS bloqueado e para o robô.
 */
export default function ScrollMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tpl-ecoluz");
    if (!root) return;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!nodes.length) return;

    // Movimento reduzido: revela tudo de uma vez. Não é "animação mais
    // curta" — é ausência de animação, que é o que a preferência pede.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      for (const el of nodes) el.classList.add("is-in");
      return;
    }

    // Sem suporte, tudo aparece. Degradar para visível, nunca para invisível:
    // o CSS já escondeu os blocos, e falhar aqui em silêncio deixaria a
    // página em branco.
    if (typeof IntersectionObserver === "undefined") {
      for (const el of nodes) el.classList.add("is-in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          // O escalonamento é por ATRIBUTO e não por índice na lista: a ordem
          // do DOM não é a ordem visual numa grade de duas colunas, e o
          // atraso calculado pelo índice faz a segunda coluna entrar depois
          // da primeira inteira, como se a página estivesse lenta.
          const delay = Number(el.dataset.revealDelay ?? 0);
          if (delay > 0) el.style.transitionDelay = `${delay}ms`;
          el.classList.add("is-in");
          io.unobserve(el);
        }
      },
      // 12% da altura da janela de folga: o bloco começa a aparecer pouco
      // antes de estar inteiro na tela, que é o que faz o gesto parecer
      // natural em vez de atrasado.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    for (const el of nodes) io.observe(el);
    return () => io.disconnect();
  }, []);

  return null;
}
