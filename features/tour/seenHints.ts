"use client";

/**
 * Persistência de quais hover-hints já foram vistos pelo usuário.
 * Cada HintId aparece UMA única vez no hover/focus. Após a primeira exibição
 * o id é marcado como visto e o tooltip nunca mais abre naquele elemento —
 * independentemente de página visitada.
 */

const STORAGE_KEY = "freelandoo_seen_hints_v1";

function read(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function write(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore quota errors
  }
}

export function isHintSeen(id: string): boolean {
  return read().has(id);
}

export function markHintSeen(id: string) {
  const set = read();
  if (set.has(id)) return;
  set.add(id);
  write(set);
}

export function resetSeenHints() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
