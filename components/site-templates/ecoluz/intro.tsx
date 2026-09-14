"use client";

import { useEffect, useState } from "react";

import { Monogram } from "./icons";

/**
 * A ABERTURA — o raio de sol atravessando a tela.
 *
 * O site original (o HTML puro em `ecoluz-five.vercel.app`) abria com isto, e
 * era a melhor coisa que ele tinha. O que NÃO volta é o custo dela.
 *
 * ── O QUE MATAVA O LCP, E COMO ISSO FOI DESFEITO ──────────────────────────
 *
 * Lá a intro era uma camada `fixed inset-0` com `background` OPACO cobrindo a
 * tela por 1,05s, mais `overflow: hidden` no `<html>`. Ou seja: durante quase
 * dois segundos o conteúdo existia e ninguém podia ver nem rolar. Dentro da
 * plataforma isso atrasa o LCP e o primeiro quadro do que o buscador lê.
 *
 * Aqui são três mudanças, e juntas elas trocam "cortina que abre" por
 * "clarão que passa":
 *
 *   1. MONTA SÓ DEPOIS DA HIDRATAÇÃO. Não existe no HTML do servidor, então o
 *      herói já está pintado quando o raio começa. O LCP é o herói.
 *   2. NÃO TEM FUNDO. Sem scrim, sem travar a rolagem, `pointer-events: none`
 *      e `mix-blend-mode: screen` — que só SOMA luz, nunca esconde. O texto
 *      do herói continua legível durante a passagem inteira.
 *   3. SAI DO DOM. Camada do tamanho da janela com blend não pode ficar
 *      residente; ela é temporária de propósito, e é isso que a torna aceita
 *      pela regra de nunca animar uma camada do tamanho da janela.
 *
 * ── AS OUTRAS TRÊS REGRAS ─────────────────────────────────────────────────
 *
 * ⚠️ AS PEÇAS QUE SE MOVEM SÃO `absolute` DENTRO DE UM `fixed` COM
 * `overflow: hidden`. O raio viaja de -185% a +90% da própria largura — solto
 * numa camada sem recorte, esse traslado abre ROLAGEM HORIZONTAL no documento
 * inteiro, com o sintoma aparecendo só no celular e sem parecer ter nada a ver
 * com a animação. É a mesma armadilha do botão flutuante, e o site original já
 * a resolvia assim.
 *
 * ⚠️ UMA VEZ POR SESSÃO. Sem isto ela tocaria a cada navegação interna — e
 * este site tem 14 páginas ligadas entre si. `sessionStorage` pode ESTOURAR
 * (janela anônima, cookies bloqueados), e aí a leitura falha: o `catch`
 * decide não tocar, porque repetir a abertura é pior que não tê-la.
 *
 * ⚠️ `prefers-reduced-motion` NÃO MONTA NADA. Não é "animação mais curta" — é
 * ausência de animação.
 *
 * ⚠️ E NÃO HÁ FOTOGRAFIA. No original existia uma camada `intro-scene` com um
 * PNG de telhado. Este tema não tem foto por decisão (ver `hero.tsx`), então o
 * centro é o `<Monogram>`, que já é SVG nosso: sem requisição, sem CDN, sem
 * salto de layout.
 */

const KEY = "ecoluz:intro";
/** O tempo da peça mais longa (1,55s) mais a saída. Ver `theme.css`. */
const LIFETIME_MS = 2000;

export default function SunIntro() {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Sem sessionStorage não há como saber se já tocou nesta visita, e uma
      // abertura que se repete a cada clique é pior que abertura nenhuma.
      return;
    }

    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!playing) return;
    // ⚠️ TEMPORIZADOR, E NÃO `animationend`. São cinco camadas com durações
    // diferentes, e escutar a "última" seria apostar em qual delas termina por
    // último a cada ajuste de timing. Se uma animação for pulada pelo
    // navegador, o `animationend` nunca chega e a camada fica residente — que
    // é justamente o que não pode acontecer.
    const t = window.setTimeout(() => setPlaying(false), LIFETIME_MS);
    return () => window.clearTimeout(t);
  }, [playing]);

  if (!playing) return null;

  return (
    <div className="el-intro" aria-hidden="true">
      <div className="el-intro__ambient" />
      <div className="el-intro__halo" />
      <Monogram className="el-intro__logo" />
      <div className="el-intro__beam" />
      <div className="el-intro__core" />
    </div>
  );
}
