"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-2xl border border-danger/25 bg-danger/10 p-4 text-danger">
        <RefreshCw className="size-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-content">Algo deu errado</h2>
        <p className="mt-1 text-sm text-content-muted">
          Não foi possível carregar esta página. Tente novamente.
        </p>
      </div>
      <Button onClick={reset} variant="secondary">
        <RefreshCw className="size-4" />
        Recarregar
      </Button>
    </div>
  );
}
