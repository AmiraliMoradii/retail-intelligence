import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

/** True when the OS or the in-app Settings ask for reduced motion — used to disable chart animation. */
export function usePrefersReducedMotion() {
  const appPref = useAppStore((s) => s.settings.reduceMotion);
  const [osPref, setOsPref] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
  );
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setOsPref(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return appPref || osPref;
}
