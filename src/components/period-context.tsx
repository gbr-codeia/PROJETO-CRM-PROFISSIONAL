"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface Period {
  month: number; // 1-12
  year: number;
}

interface PeriodContextValue {
  period: Period;
  setPeriod: (p: Period) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  isCurrent: boolean;
}

const STORAGE_KEY = "editflow.period";

function currentPeriod(): Period {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriodState] = useState<Period>(currentPeriod);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Period;
        if (parsed?.month >= 1 && parsed?.month <= 12 && parsed?.year > 2000) {
          setPeriodState(parsed);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setPeriod = useCallback((p: Period) => {
    setPeriodState(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, []);

  const shift = useCallback(
    (delta: number) => {
      setPeriod(
        (() => {
          const idx = period.year * 12 + (period.month - 1) + delta;
          return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
        })(),
      );
    },
    [period, setPeriod],
  );

  const value = useMemo<PeriodContextValue>(() => {
    const cur = currentPeriod();
    return {
      period,
      setPeriod,
      next: () => shift(1),
      prev: () => shift(-1),
      reset: () => setPeriod(cur),
      isCurrent: period.month === cur.month && period.year === cur.year,
    };
  }, [period, setPeriod, shift]);

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod deve ser usado dentro de <PeriodProvider>");
  return ctx;
}
