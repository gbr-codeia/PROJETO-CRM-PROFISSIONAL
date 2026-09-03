import {
  Clapperboard,
  FileBarChart,
  LayoutGrid,
  Settings,
  SquareKanban,
  Users,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Shown in the mobile bottom navigation. */
  primaryMobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid, primaryMobile: true },
  { label: "Projetos", href: "/projetos", icon: Clapperboard, primaryMobile: true },
  { label: "Kanban", href: "/kanban", icon: SquareKanban, primaryMobile: true },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Financeiro", href: "/financeiro", icon: Wallet, primaryMobile: true },
  { label: "Relatórios", href: "/relatorios", icon: FileBarChart },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

export const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projetos": "Projetos",
  "/kanban": "Kanban de Produção",
  "/clientes": "Clientes",
  "/financeiro": "Financeiro",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
};
