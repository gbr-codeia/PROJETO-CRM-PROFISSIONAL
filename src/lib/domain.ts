import type {
  FinancialStatus,
  PaymentStatus,
  Priority,
  ProjectStatus,
} from "@/lib/api-types";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info" | "neutral";

export const PROJECT_STATUS: Record<
  ProjectStatus,
  { label: string; variant: BadgeVariant; hex: string }
> = {
  NEW: { label: "Novo", variant: "info", hex: "#5aa8f5" },
  WAITING_MATERIAL: { label: "Aguardando material", variant: "warning", hex: "#f5b544" },
  EDITING: { label: "Em edição", variant: "info", hex: "#7c8cf8" },
  REVIEW: { label: "Revisão", variant: "primary", hex: "#1ED9B6" },
  ADJUSTMENTS: { label: "Ajustes", variant: "danger", hex: "#f0685f" },
  DELIVERED: { label: "Entregue", variant: "success", hex: "#1ED9B6" },
  CANCELLED: { label: "Cancelado", variant: "neutral", hex: "#6a6a6a" },
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "NEW",
  "WAITING_MATERIAL",
  "EDITING",
  "REVIEW",
  "ADJUSTMENTS",
  "DELIVERED",
  "CANCELLED",
];

export const PRIORITY: Record<Priority, { label: string; variant: BadgeVariant; hex: string }> = {
  LOW: { label: "Baixa", variant: "neutral", hex: "#6a6a6a" },
  MEDIUM: { label: "Média", variant: "info", hex: "#5aa8f5" },
  HIGH: { label: "Alta", variant: "warning", hex: "#f5b544" },
  URGENT: { label: "Urgente", variant: "danger", hex: "#f0685f" },
};

export const PAYMENT_STATUS: Record<
  PaymentStatus,
  { label: string; variant: BadgeVariant }
> = {
  PENDING: { label: "Pendente", variant: "warning" },
  PARTIAL: { label: "Parcial", variant: "info" },
  PAID: { label: "Pago", variant: "success" },
};

export const FINANCIAL_STATUS: Record<
  FinancialStatus,
  { label: string; variant: BadgeVariant }
> = {
  PENDING: { label: "Pendente", variant: "warning" },
  PARTIAL: { label: "Parcial", variant: "info" },
  PAID: { label: "Pago", variant: "success" },
  CANCELLED: { label: "Cancelado", variant: "neutral" },
};

export const INCOME_CATEGORIES = [
  "Edição de Vídeo",
  "Filmagem",
  "Fotografia",
  "Projeto Especial",
  "Outros",
];

export const EXPENSE_CATEGORIES = [
  "Assinaturas",
  "Equipamentos",
  "Software",
  "Freelancer",
  "Transporte",
  "Marketing",
  "Outros",
];

export const PROJECT_TYPES = [
  "Edição de Vídeo",
  "Filmagem e Edição",
  "Reels / Shorts",
  "YouTube",
  "Motion Graphics",
  "Documentário",
  "Institucional",
  "Casamento",
  "Projeto Especial",
];

export const PAYMENT_METHODS = ["PIX", "Transferência", "Dinheiro", "Cartão de crédito", "Boleto", "Outro"];

/** Color tags available for Kanban cards / projects. */
export const CARD_COLORS: { hex: string; label: string }[] = [
  { hex: "#1ED9B6", label: "Turquesa" },
  { hex: "#5aa8f5", label: "Azul" },
  { hex: "#a855f7", label: "Roxo" },
  { hex: "#f5b544", label: "Âmbar" },
  { hex: "#f0685f", label: "Vermelho" },
  { hex: "#ec4899", label: "Rosa" },
  { hex: "#94a3b8", label: "Cinza" },
];

export const ACTIVITY_LABEL: Record<string, string> = {
  CLIENT_CREATED: "Cliente criado",
  CLIENT_UPDATED: "Cliente atualizado",
  CLIENT_DELETED: "Cliente removido",
  PROJECT_CREATED: "Projeto criado",
  PROJECT_UPDATED: "Projeto atualizado",
  PROJECT_MOVED: "Projeto movido",
  PROJECT_DELIVERED: "Projeto entregue",
  PROJECT_CANCELLED: "Projeto cancelado",
  PROJECT_REOPENED: "Projeto reaberto",
  PROJECT_DELETED: "Projeto removido",
  KANBAN_COLUMN_CREATED: "Coluna criada",
  KANBAN_COLUMN_UPDATED: "Coluna atualizada",
  KANBAN_COLUMN_DELETED: "Coluna removida",
  FINANCIAL_CREATED: "Lançamento criado",
  FINANCIAL_UPDATED: "Lançamento atualizado",
  FINANCIAL_CANCELLED: "Lançamento cancelado",
  FINANCIAL_DELETED: "Lançamento removido",
  PAYMENT_REGISTERED: "Pagamento registrado",
  PAYMENT_DELETED: "Pagamento removido",
};
