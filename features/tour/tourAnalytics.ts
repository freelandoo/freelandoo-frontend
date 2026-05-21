"use client";

import { track } from "@vercel/analytics";

const CONSENT_KEY = "fl_cookie_consent";

export function trackTourEvent(event: "tour_started" | "tour_step_viewed" | "tour_completed" | "tour_skipped" | "tour_cta_clicked", payload: Record<string, string | number | boolean | undefined>) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(CONSENT_KEY) !== "accepted") return;
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) cleaned[key] = value;
  }
  track(event, cleaned);
}
