"use client";

import { createContext, useContext } from "react";
import type { TourKey } from "./tourConfig";
import type { TourStatus } from "./tourService";

export type TourActionName = "openDropside" | "closeDropside" | "openSidebar" | "closeSidebar";

export interface TourContextValue {
  startTour: (tourKey: TourKey) => void;
  completeTour: (tourKey: TourKey) => void;
  skipTour: (tourKey: TourKey) => void;
  resetTour: (tourKey: TourKey) => void;
  getStatus: (tourKey: TourKey) => TourStatus;
  hideAllTours: boolean;
  setHideAllTours: (value: boolean) => void;
  registerAction: (name: TourActionName, fn: () => void) => () => void;
  runAction: (name: TourActionName | undefined) => void;
}

export const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    return {
      startTour: () => {},
      completeTour: () => {},
      skipTour: () => {},
      resetTour: () => {},
      getStatus: () => "not_started" as TourStatus,
      hideAllTours: false,
      setHideAllTours: () => {},
      registerAction: () => () => {},
      runAction: () => {},
    };
  }
  return ctx;
}

export function useHasSeenTour(tourKey: TourKey): boolean {
  const { getStatus } = useTour();
  const status = getStatus(tourKey);
  return status === "completed" || status === "skipped";
}
