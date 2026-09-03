"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PeriodProvider } from "@/components/period-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <PeriodProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </PeriodProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "!bg-surface-overlay !border !border-line !text-content !rounded-xl !shadow-card",
              description: "!text-content-muted",
              actionButton: "!bg-primary !text-primary-foreground",
            },
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}
