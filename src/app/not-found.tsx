import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <div>
        <p className="text-5xl font-semibold tracking-tight text-content">404</p>
        <p className="mt-2 text-sm text-content-muted">Esta página não existe.</p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Voltar ao dashboard</Link>
      </Button>
    </div>
  );
}
