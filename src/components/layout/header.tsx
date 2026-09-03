"use client";

import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { PeriodSelector } from "@/components/layout/period-selector";
import { Notifications } from "@/components/layout/notifications";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { PAGE_TITLES } from "@/components/layout/nav-items";

/** Pages that react to the global period selector. */
const PERIOD_AWARE = ["/dashboard", "/financeiro", "/relatorios"];

export function Header() {
  const pathname = usePathname();
  const title =
    PAGE_TITLES[pathname] ??
    (Object.entries(PAGE_TITLES).find(([href]) => pathname.startsWith(`${href}/`))?.[1] ?? "");
  const showPeriod = PERIOD_AWARE.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3 lg:hidden">
          <Logo compact />
        </div>
        <h2 className="hidden text-lg font-semibold tracking-tight text-content lg:block">
          {title}
        </h2>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {showPeriod && (
            <div className="hidden sm:block">
              <PeriodSelector />
            </div>
          )}
          <Notifications />
          <ProfileMenu />
        </div>
      </div>

      {showPeriod && (
        <div className="border-t border-line px-4 py-2 sm:hidden">
          <PeriodSelector compact />
        </div>
      )}
    </header>
  );
}
