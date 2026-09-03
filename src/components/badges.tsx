import { Badge } from "@/components/ui/badge";
import {
  FINANCIAL_STATUS,
  PAYMENT_STATUS,
  PRIORITY,
  PROJECT_STATUS,
} from "@/lib/domain";
import type {
  FinancialStatus,
  PaymentStatus,
  Priority,
  ProjectStatus,
} from "@/lib/api-types";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = PROJECT_STATUS[status];
  return (
    <Badge variant={s.variant} dot>
      {s.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const p = PRIORITY[priority];
  return <Badge variant={p.variant}>{p.label}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const p = PAYMENT_STATUS[status];
  return (
    <Badge variant={p.variant} dot>
      {p.label}
    </Badge>
  );
}

export function FinancialStatusBadge({ status }: { status: FinancialStatus }) {
  const s = FINANCIAL_STATUS[status];
  return (
    <Badge variant={s.variant} dot>
      {s.label}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: "INCOME" | "EXPENSE" }) {
  return (
    <Badge variant={type === "INCOME" ? "success" : "danger"}>
      {type === "INCOME" ? "Receita" : "Despesa"}
    </Badge>
  );
}
