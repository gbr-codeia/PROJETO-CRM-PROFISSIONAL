"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const callbackUrl = params.get("callbackUrl") || "/dashboard";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        await api.post("/auth/register", {
          name: form.name,
          email: form.email,
          password: form.password,
        });
        toast.success("Conta criada com sucesso.");
      }

      const res = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (res?.error) {
        toast.error("E-mail ou senha inválidos.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Não foi possível concluir. Tente novamente.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -left-20 top-1/3 size-[420px] rounded-full bg-primary/10 blur-[120px]" />
        <Logo />
        <div className="relative space-y-4">
          <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-content">
            Do briefing à <span className="text-primary">entrega paga</span>, num só lugar.
          </h1>
          <p className="max-w-sm text-sm text-content-muted">
            Clientes, projetos, kanban de produção e financeiro integrados — feito para
            editores de vídeo que querem parar de usar cinco ferramentas.
          </p>
        </div>
        <div className="relative flex gap-6 text-xs text-content-subtle">
          <span>Kanban → Financeiro automático</span>
          <span>Pagamentos parciais</span>
          <span>Relatórios mensais</span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-xl font-semibold text-content">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h2>
          <p className="mt-1 text-sm text-content-muted">
            {mode === "login"
              ? "Acesse seu painel do EDITFLOW CRM."
              : "Comece a organizar seus projetos agora."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Seu nome"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="voce@estudio.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={mode === "register" ? 8 : undefined}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              {mode === "login" ? "Entrar" : "Criar conta e entrar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-content-muted">
            {mode === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
            <button
              type="button"
              onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
              className="font-medium text-primary hover:underline"
            >
              {mode === "login" ? "Criar conta" : "Entrar"}
            </button>
          </p>

          <p className="mt-4 rounded-xl border border-line bg-surface p-3 text-center text-xs text-content-subtle">
            Demo: <span className="text-content-muted">editor@editflow.dev</span> ·{" "}
            <span className="text-content-muted">editflow123</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <LoginInner />
    </Suspense>
  );
}
