"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * A CAMADA DE MOVIMENTO — GSAP + ScrollTrigger, escopado no elemento do tema.
 *
 * A direção é a mesma que o `theme.css` escreve em estática: a LUZ como
 * matéria. Em movimento isso vira três verbos, e todo gesto pertence a um
 * deles — é o que impede a página de virar uma coleção de efeitos:
 *
 *   a luz chega      [data-reveal]     o bloco entra
 *   a medida se      [data-rule]       o filete abre da esquerda
 *     desenha        [data-parallax]   a camada anda mais devagar que a rolagem
 *   o número sobe    (na calculadora, que tem contador próprio)
 *
 * ── POR QUE GSAP AGORA, se este arquivo já defendeu o contrário ───────────
 *
 * A versão anterior usava IntersectionObserver puro, com o argumento de que
 * um gesto só não paga um chunk inteiro. Os dois lados daquela conta mudaram:
 *
 *   1. O trabalho agora TEM linha do tempo e scrub (paralaxe, filete que
 *      abre, manchete mascarada) — que é exatamente a condição que aquele
 *      comentário nomeou como a hora de trocar.
 *   2. O CHUNK JÁ DESCE NESTA ROTA. O `registry.ts` importa os quatro temas
 *      ESTATICAMENTE, e `enzo-cortes` e `oficina-local` importam `gsap` — ou
 *      seja, em /c/<slug> o GSAP já é baixado hoje, mesmo servindo a EcoLuz.
 *      Usá-lo aqui custa zero byte a mais.
 *
 * ── AS REGRAS QUE MORDEM EM SILÊNCIO ──────────────────────────────────────
 *
 * ⚠️ SÓ `transform` E `opacity`. São as duas coisas que o navegador COMPÕE
 * sem recalcular layout nem repintar. Altura, largura, margem e padding
 * custam o DOCUMENTO INTEIRO por quadro, e o sintoma é a rolagem travada —
 * que ninguém relaciona com a animação.
 *
 * ⚠️ NADA DE ANIMAÇÃO NUMA CAMADA DO TAMANHO DA JANELA. A `.tpl-ecoluz__bg`
 * continua pintada UMA vez. A profundidade vem dos halos que cada seção
 * carrega DENTRO dela (`[data-parallax]`), recortados pela própria seção. A
 * plataforma pagou essa conta em 2026-09-09 com o shader WebGPU: o custo é
 * POR PIXEL e divide a GPU com o compositor — quem engasga é a rolagem
 * inteira, e a causa parece estar em qualquer outro lugar.
 *
 * ⚠️ O ESCOPO É O ELEMENTO DO TEMA, nunca o documento. O site roda DENTRO da
 * aplicação da Freelandoo, e um seletor solto capturaria elementos da
 * plataforma que por acaso tivessem o atributo. `gsap.context` com elemento
 * de escopo resolve as duas coisas de uma vez: os seletores só enxergam a
 * subárvore do tema, e o `revert()` só desfaz o que criou.
 *
 * ⚠️ QUEM ESCONDE O BLOCO ANTES É O CSS, sob o gate `data-motion="on"` posto
 * por um script INLINE (ver `index.tsx`), que roda durante o PARSE — antes da
 * primeira pintura. Num `useEffect` ele chegaria depois: o conteúdo
 * apareceria, sumiria e voltaria animando. E sem JavaScript o atributo nunca
 * é escrito e a página aparece INTEIRA, que é o que importa para quem tem JS
 * bloqueado e para o robô, que não executa script.
 *
 * ⚠️ `[data-parallax]` E `[data-reveal]` CONVIVEM no mesmo elemento: o reveal
 * anda em `y` (pixels) e a paralaxe em `yPercent`, e o GSAP compõe os dois no
 * mesmo transform sem brigar. O que NÃO pode é a limpeza final do reveal
 * apagar o transform que a paralaxe ainda governa — por isso ela pula quem
 * tem paralaxe.
 */
export default function ScrollMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tpl-ecoluz");
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const nodes = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      const rules = gsap.utils.toArray<HTMLElement>("[data-rule]");
      const lines = gsap.utils.toArray<HTMLElement>("[data-line]");

      // Movimento reduzido: tudo visível de uma vez. Não é "animação mais
      // curta" — é AUSÊNCIA de animação, que é o que a preferência pede.
      if (reduced) {
        gsap.set(nodes, { opacity: 1, clearProps: "transform,willChange" });
        gsap.set(rules, { scaleX: 1, clearProps: "willChange" });
        gsap.set(lines, { yPercent: 0, clearProps: "transform,willChange" });
        return;
      }

      /* ── A LUZ CHEGA: o bloco entra ─────────────────────────────────── */
      nodes.forEach((el) => {
        const kind = el.dataset.reveal || "up";
        // A manchete mascarada é tratada pelo bloco de linhas, logo abaixo.
        if (kind === "lines") return;

        // ⚠️ O ATRASO É POR ATRIBUTO, NUNCA PELO ÍNDICE DA LISTA. A ordem do
        // DOM não é a ordem visual numa grade de duas colunas: calculado pelo
        // índice, o atraso faz a segunda coluna inteira entrar depois da
        // primeira, e a página parece lenta em vez de escalonada.
        const delay = Number(el.dataset.revealDelay ?? 0) / 1000;

        const from: gsap.TweenVars =
          kind === "left"
            ? { opacity: 0, x: -28 }
            : kind === "right"
              ? { opacity: 0, x: 28 }
              : kind === "fade"
                ? { opacity: 0 }
                : kind === "scale"
                  ? { opacity: 0, scale: 0.975, y: 18 }
                  : { opacity: 0, y: 22 };

        gsap.fromTo(el, from, {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.8,
          delay,
          ease: "power3.out",
          force3D: true,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onComplete: () => {
            // ⚠️ A LIMPEZA DEVOLVE A CAMADA. Um `translate3d` residual promove
            // o elemento a camada de composição e ela fica na memória para
            // sempre — com 59 blocos no site isso é caro, e o custo não
            // aparece em lugar nenhum a não ser na máquina fraca.
            if (el.hasAttribute("data-parallax")) {
              gsap.set(el, { clearProps: "willChange" });
              return;
            }
            gsap.set(el, { clearProps: "transform,willChange" });
          },
        });
      });

      /* ── A LUZ CHEGA: a manchete, linha a linha ─────────────────────────
         A máscara é do CSS (`.el-line`, com folga para o descendente); aqui
         só as linhas de dentro sobem. É o gesto de maior peso tipográfico do
         site — e a tipografia é a voz dele. */
      gsap.utils.toArray<HTMLElement>("[data-reveal=lines]").forEach((head) => {
        const inner = Array.from(head.querySelectorAll<HTMLElement>("[data-line]"));
        if (!inner.length) return;

        gsap.set(head, { opacity: 1 });
        gsap.fromTo(
          inner,
          { yPercent: 108 },
          {
            yPercent: 0,
            duration: 1.05,
            ease: "power4.out",
            stagger: 0.085,
            force3D: true,
            scrollTrigger: { trigger: head, start: "top 90%", once: true },
            onComplete: () => gsap.set(inner, { clearProps: "transform,willChange" }),
          },
        );
      });

      /* ── A MEDIDA SE DESENHA: o filete ──────────────────────────────────
         A régua do desenhista abrindo antes do texto. É o gesto mais fiel à
         tese deste site: ele não decora, ele MEDE. */
      rules.forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
            onComplete: () => gsap.set(el, { clearProps: "willChange" }),
          },
        );
      });

      /* ── A MEDIDA SE DESENHA: a paralaxe ────────────────────────────────
         ⚠️ `yPercent` E NÃO PIXELS. Em pixels fixos o mesmo número dá efeito
         forte no celular e imperceptível num monitor grande, e a correção
         viraria um número por breakpoint. */
      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
        const amount = Number(el.dataset.parallax || 6);
        gsap.to(el, {
          yPercent: amount,
          ease: "none",
          force3D: true,
          scrollTrigger: {
            trigger: el.parentElement ?? el,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      });
    }, root);

    // ⚠️ O ScrollTrigger PRECISA REMEDIR DEPOIS QUE AS FONTES ASSENTAM. A
    // Archivo com eixo `wdth` tem métricas bem diferentes da fallback, e sem
    // isto os gatilhos ficam calculados sobre a altura errada — os blocos do
    // fim da página entram cedo demais ou não entram nunca.
    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts?.ready) document.fonts.ready.then(refresh).catch(() => {});
    const tmr = window.setTimeout(refresh, 600);

    return () => {
      window.clearTimeout(tmr);
      ctx.revert();
    };
  }, []);

  return null;
}
