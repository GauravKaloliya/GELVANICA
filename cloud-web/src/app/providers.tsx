"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { SessionProvider } from "@/lib/session";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { AIProvider } from "@/lib/ai-context";
import ThemeProvider from "./components/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <WorkspaceProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider delayDuration={300}>
              <ToastProvider>
                <AIProvider>
                  {children}
                  <Toaster
                    position="bottom-right"
                    richColors
                    closeButton
                    aria-live="polite"
                    aria-atomic="false"
                    toastOptions={{
                      style: {
                        background: "var(--card-bg)",
                        border: "1px solid var(--border-color)",
                        color: "var(--foreground)",
                      },
                    }}
                  />
                </AIProvider>
              </ToastProvider>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </WorkspaceProvider>
    </SessionProvider>
  );
}
