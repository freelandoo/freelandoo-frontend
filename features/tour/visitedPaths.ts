"use client";

const STORAGE_KEY = "freelandoo_visited_paths_v1";

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

export function isPathVisited(path: string | null): boolean {
  if (!path) return false;
  return read().has(path);
}

export function markPathVisited(path: string | null) {
  if (!path) return;
  const set = read();
  if (set.has(path)) return;
  set.add(path);
  write(set);
}

export function resetVisitedPaths() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
