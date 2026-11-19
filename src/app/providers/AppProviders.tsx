import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./ThemeProvider";
import { useAppStore } from "@/store/useAppStore";

function ThemedToaster() {
  const theme = useAppStore((s) => s.settings.theme);
  return (
    <Toaster
      position="bottom-right"
      theme={theme}
      richColors
      closeButton
      toastOptions={{ classNames: { toast: "font-sans", description: "text-[13px]" } }}
    />
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={250}>
        {children}
        <ThemedToaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
