"use client";

import { useEffect, useState } from "react";
import { Play, RotateCcw, CheckCircle2, MessageCircle } from "lucide-react";
import { TOUR_CONFIGS } from "./tourConfig";
import { useTour } from "./useTour";
import type { TourStatus } from "./tourService";

// Rótulos amigáveis — nunca expor o estado técnico (ex.: "not_started").
const STATUS_LABEL: Record<TourStatus, string> = {
  not_started: "Disponível",
  in_progress: "Em andamento",
  completed: "Concluído",
  skipped: "Pulado",
};

const STATUS_TONE: Record<TourStatus, string> = {
  not_started: "bg-[#2A2218] text-[#C9C2B6]",
  in_progress: "bg-[#F2B705]/15 text-[#F2B705]",
  completed: "bg-emerald-500/15 text-emerald-300",
  skipped: "bg-[#2A2218] text-[#9A938A]",
};

const WHATSAPP_URL = "https://wa.me/5511962757599";

export function TourHelpCenter() {
  const { startTour, resetTour, completeTour, getStatus, hideAllTours, setHideAllTours } = useTour();
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoggedIn(typeof window !== "undefined" && !!localStorage.getItem("token"));
  }, []);

  const mainTour = TOUR_CONFIGS[0];

  // Evita divergência de hidratação (depende de login no cliente).
  if (!mounted) return null;

  // ── Deslogado: apresentação simples + suporte, sem controles técnicos ──
  if (!loggedIn) {
    return (
      <section className="mt-10 rounded-2xl border border-[#2A2218] bg-[#1D1810] p-7 text-left">
        <h3 className="fl-display text-2xl text-[#F5F1E8]">Novo por aqui?</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#9A938A]">
          Faça um tour rápido e guiado pela Freelandoo para entender perfil, vitrine, serviços e muito mais.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => startTour(mainTour.tourKey)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F2B705] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#F2B705]/90"
          >
            <Play className="h-4 w-4" /> Iniciar tour
          </button>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2A2218] px-6 py-3 text-sm font-semibold text-[#F5F1E8] transition hover:border-[#F2B705]/50"
          >
            <MessageCircle className="h-4 w-4" /> Falar com suporte
          </a>
        </div>
      </section>
    );
  }

  // ── Logado: controles amigáveis de tour ──
  const tours = TOUR_CONFIGS.slice(0, 6);
  return (
    <section className="mt-10 rounded-2xl border border-[#2A2218] bg-[#1D1810] p-7 text-left">
      <h3 className="fl-display text-2xl text-[#F5F1E8]">Tour da plataforma</h3>
      <p className="mt-1 text-sm text-[#9A938A]">Reveja as apresentações guiadas quando quiser.</p>

      <label className="mt-4 inline-flex items-center gap-2 text-sm text-[#C9C2B6]">
        <input
          type="checkbox"
          checked={hideAllTours}
          onChange={(event) => setHideAllTours(event.target.checked)}
          className="accent-[#F2B705]"
        />
        Não mostrar apresentações automaticamente
      </label>

      <div className="mt-5 grid gap-3">
        {tours.map((tour) => {
          const status = getStatus(tour.tourKey);
          return (
            <div
              key={tour.tourKey}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2A2218] bg-[#0b0804]/50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#F5F1E8]">{tour.title}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}>
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => startTour(tour.tourKey)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F2B705] px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#F2B705]/90"
                >
                  <Play className="h-3.5 w-3.5" /> Rever tour
                </button>
                <button
                  onClick={() => resetTour(tour.tourKey)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2218] px-3 py-2 text-xs font-medium text-[#C9C2B6] transition hover:border-[#F2B705]/40 hover:text-[#F5F1E8]"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reiniciar apresentação
                </button>
                {status !== "completed" && (
                  <button
                    onClick={() => completeTour(tour.tourKey)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2218] px-3 py-2 text-xs font-medium text-[#C9C2B6] transition hover:border-emerald-400/40 hover:text-emerald-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como concluído
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
