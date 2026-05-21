"use client";

import { getToken } from "@/lib/auth";
import type { TourKey } from "./tourConfig";

const API = "/api/tours";
const LOCAL_KEY = "freelandoo_tour_progress_v1";

export type TourStatus = "not_started" | "in_progress" | "completed" | "skipped";

export interface TourProgressItem {
  tour_key: TourKey;
  status: TourStatus;
  current_step: number;
}

export interface TourSettings {
  hide_all_tours: boolean;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchTourProgress(): Promise<TourProgressItem[]> {
  const token = getToken();
  if (!token) return readLocalProgress();
  const response = await fetch(`${API}/progress`, { headers: { ...authHeaders() }, cache: "no-store" });
  if (!response.ok) return [];
  const data = (await response.json()) as { items?: TourProgressItem[] };
  return Array.isArray(data.items) ? data.items : [];
}

export async function fetchTourSettings(): Promise<TourSettings> {
  const token = getToken();
  if (!token) {
    return { hide_all_tours: localStorage.getItem("freelandoo_hide_all_tours") === "1" };
  }
  const response = await fetch(`${API}/progress`, { headers: { ...authHeaders() }, cache: "no-store" });
  if (!response.ok) return { hide_all_tours: false };
  const data = (await response.json()) as { settings?: TourSettings };
  return data.settings || { hide_all_tours: false };
}

async function postStatus(path: string, tourKey: TourKey, currentStep = 0) {
  const token = getToken();
  if (!token) {
    writeLocalProgress(tourKey, path === "complete" ? "completed" : path === "skip" ? "skipped" : path === "start" ? "in_progress" : "not_started", currentStep);
    return;
  }
  await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ tourKey, currentStep }),
  });
}

export function readLocalProgress(): TourProgressItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TourProgressItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalProgress(tourKey: TourKey, status: TourStatus, currentStep = 0) {
  if (typeof window === "undefined") return;
  const current = readLocalProgress().filter((item) => item.tour_key !== tourKey);
  current.push({ tour_key: tourKey, status, current_step: currentStep });
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(current));
}

export function startTourProgress(tourKey: TourKey, currentStep = 0) {
  return postStatus("start", tourKey, currentStep);
}

export function completeTourProgress(tourKey: TourKey, currentStep = 0) {
  return postStatus("complete", tourKey, currentStep);
}

export function skipTourProgress(tourKey: TourKey, currentStep = 0) {
  return postStatus("skip", tourKey, currentStep);
}

export function resetTourProgress(tourKey: TourKey) {
  return postStatus("reset", tourKey, 0);
}

export async function setHideAllTours(hideAllTours: boolean) {
  const token = getToken();
  if (!token) {
    localStorage.setItem("freelandoo_hide_all_tours", hideAllTours ? "1" : "0");
    return;
  }
  await fetch(`${API}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ hideAllTours }),
  });
}
