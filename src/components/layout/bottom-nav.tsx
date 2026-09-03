"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = NAV_ITEMS.filter((i) => i.primaryMobile);
  const secondary = NAV_ITEMS.filter((i) => !i.primaryMobile);
  const moreActive = secondary.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur-xl lg:hidden">
        <ul
          className="mx-auto grid max-w-lg grid-cols-5"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {primary.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-content-subtle",
                  )}
                >
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                moreActive ? "text-primary" : "text-content-subtle",
              )}
            >
              <MoreHorizontal className="size-5" />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader>
            <SheetTitle>Mais opções</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 p-4">
            {secondary.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-4 text-sm font-medium transition-colors",
                    active
                      ? "border-line-accent bg-primary-muted text-primary"
                      : "border-line bg-surface-raised text-content-muted",
                  )}
                >
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                signOut({ callbackUrl: "/login" });
              }}
              className="col-span-2 flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm font-medium text-danger"
            >
              <LogOut className="size-5" />
              Sair
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
