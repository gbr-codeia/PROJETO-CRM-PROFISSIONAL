"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMe } from "@/hooks/queries";
import { initials } from "@/lib/format";

export function ProfileMenu() {
  const { data: me } = useMe();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1 pr-2 transition-colors hover:border-line-accent"
        >
          <Avatar className="size-8">
            {me?.image && <AvatarImage src={me.image} alt={me?.name ?? ""} />}
            <AvatarFallback>{initials(me?.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[120px] truncate text-sm font-medium text-content sm:block">
            {me?.name ?? "—"}
          </span>
          <ChevronDown className="hidden size-4 text-content-subtle sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <Avatar className="size-9">
            {me?.image && <AvatarImage src={me.image} alt={me?.name ?? ""} />}
            <AvatarFallback>{initials(me?.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-content">{me?.name ?? "—"}</p>
            <p className="truncate text-xs text-content-muted">{me?.email ?? ""}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/configuracoes">
            <Settings className="size-4" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/clientes">
            <User className="size-4" />
            Meus clientes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
