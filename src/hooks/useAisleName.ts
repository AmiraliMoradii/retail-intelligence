import { useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { AISLE_BASELINES } from "@/data/mockAisles";

/** Returns a formatter that respects the "show aisle codes" setting (e.g. "A3 · Snacks"). */
export function useAisleLabel() {
  const showCodes = useAppStore((s) => s.settings.showAisleCodes);
  return useCallback(
    (aisleId: string, name: string) => {
      const code = AISLE_BASELINES[aisleId]?.aisleCode;
      return showCodes && code ? `${code} · ${name}` : name;
    },
    [showCodes],
  );
}
