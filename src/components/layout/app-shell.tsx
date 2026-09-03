import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <Sidebar />
      <div className="lg:pl-[248px]">
        <Header />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
