"use client";

/**
 * Snooze de tours: o usuário escolheu "Ver depois" e o tour reaparece
 * automaticamente após 24h. Armazena `{ [tourKey]: epoch_ms_até_quando }`
 * em localStorage. Snooze expirado é tratado como inexistente.
 */

const STORAGE_KEY = "freelandoo_snoozed_tours_v1";
export const SNOOZE_MS = 24 * 60 * 60 * 1000;

function read(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

export function isTourSnoozed(tourKey: string): boolean {
  const map = read();
  const until = map[tourKey];
  if (!until) return false;
  if (Date.now() < until) return true;
  // Snooze expirou — limpa de uma vez
  delete map[tourKey];
  write(map);
  return false;
}

export function snoozeTour(tourKey: string, ms: number = SNOOZE_MS) {
  const map = read();
  map[tourKey] = Date.now() + ms;
  write(map);
}

export function clearTourSnooze(tourKey: string) {
  const map = read();
  if (map[tourKey] != null) {
    delete map[tourKey];
    write(map);
  }
}
