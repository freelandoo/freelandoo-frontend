"use client";

/**
 * BOTÃO FLUTUANTE DE WHATSAPP.
 *
 * ⚠️⚠️ O BRILHO É `box-shadow`, NUNCA `transform: scale`.
 *
 * Este botão é `fixed` e encosta na borda. O `overflow-x: clip` mora no
 * `main` e no `footer` — ele é IRMÃO deles e não é recortado por nada.
 * A conta já foi medida: um anel `animate-ping` (que é scale(2)) num botão
 * de 56px a 16px da borda chega a 112px, 28px para cada lado, 12px além da
 * tela — e o documento inteiro ganha 8px de rolagem horizontal. O sintoma
 * aparece só no celular e não parece ter nada a ver com o botão.
 *
 * Sombra é pintada FORA da caixa e não entra na região rolável. Mesmo
 * efeito visual, custo zero de layout.
 *
 * ⚠️ O host TEM que ser `wa.me` — é por ele que o painel de Indicadores da
 * Freelandoo reconhece o clique como lead.
 */

import { useEffect, useState } from "react";
import { whatsappLink } from "./content/business";

export default function WhatsappFab() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Só aparece depois que a pessoa desceu do topo: no primeiro quadro ela
    // já tem dois botões de contato à vista, e um terceiro flutuando por
    // cima só tapa o conteúdo.
    const onScroll = () => setShown(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href={whatsappLink(
        "Olá, Ricardo! Vi o site e preciso de atendimento no meu fogão.",
      )}
      target="_blank"
      rel="noopener"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center transition-[opacity,box-shadow] duration-300"
      style={{
        background: "#25D366",
        color: "#0b2e18",
        opacity: shown ? 1 : 0,
        pointerEvents: shown ? "auto" : "none",
        boxShadow: shown
          ? "0 0 0 6px rgb(37 211 102 / 0.16), 0 10px 30px rgb(0 0 0 / 0.45)"
          : "0 0 0 0 rgb(37 211 102 / 0)",
      }}
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.83 2.41a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.19-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42l-.47-.01c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.04s.88 2.37 1 2.53c.12.17 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z" />
      </svg>
    </a>
  );
}
