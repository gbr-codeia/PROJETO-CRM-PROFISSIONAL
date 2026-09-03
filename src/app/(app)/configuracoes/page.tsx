"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ColumnsManager } from "@/components/settings/columns-manager";
import { useMe } from "@/hooks/queries";
import { initials } from "@/lib/format";

export default function ConfiguracoesPage() {
  const { data: me, isLoading } = useMe();

  return (
    <div className="space-y-5">
      <PageHeader title="Configurações" description="Conta e personalização do fluxo de produção." />

      <Card>
        <CardHeader>
          <CardTitle>Conta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-12">
              {me?.image && <AvatarImage src={me.image} alt={me?.name ?? ""} />}
              <AvatarFallback className="text-base">{initials(me?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-content">
                {isLoading ? "Carregando…" : me?.name}
              </p>
              <p className="text-sm text-content-muted">{me?.email}</p>
            </div>
          </div>
          <Button variant="danger" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="size-4" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle>Colunas do Kanban</CardTitle>
          <p className="text-sm text-content-muted">
            Crie, renomeie, colora e reordene. A coluna marcada como{" "}
            <span className="text-primary">Entrega</span> dispara o lançamento financeiro automático.
          </p>
        </CardHeader>
        <CardContent>
          <ColumnsManager />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sobre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-content-muted">
          <p>EDITFLOW CRM — CRM para editores de vídeo.</p>
          <p>
            Fluxo integrado: Cliente → Projeto → Kanban → Entregue → Financeiro automático → Dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
