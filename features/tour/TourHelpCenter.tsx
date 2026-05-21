"use client";

import { Button } from "@/components/ui/button";
import { TOUR_CONFIGS } from "./tourConfig";
import { useTour } from "./useTour";

export function TourHelpCenter() {
  const { startTour, resetTour, getStatus, hideAllTours, setHideAllTours } = useTour();
  return (
    <section className="mt-10 rounded-2xl border border-amber-500/30 bg-zinc-900/60 p-5">
      <h3 className="text-lg font-semibold text-amber-200">Ajuda / Tours</h3>
      <p className="mt-1 text-sm text-zinc-300">Reveja o tour inicial ou tours de módulos específicos.</p>
      <label className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-200">
        <input
          type="checkbox"
          checked={hideAllTours}
          onChange={(event) => setHideAllTours(event.target.checked)}
        />
        Não mostrar tours automaticamente
      </label>
      <div className="mt-4 grid gap-3">
        {TOUR_CONFIGS.slice(0, 10).map((tour) => (
          <div key={tour.tourKey} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-700/80 bg-zinc-950/40 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-zinc-100">{tour.title}</p>
              <p className="text-xs text-zinc-400">Status: {getStatus(tour.tourKey)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => resetTour(tour.tourKey)}>
                Resetar
              </Button>
              <Button size="sm" className="bg-amber-400 text-zinc-950 hover:bg-amber-300" onClick={() => startTour(tour.tourKey)}>
                Iniciar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
