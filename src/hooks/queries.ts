"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api, type ApiResult } from "@/lib/api";
import type {
  Activity,
  Client,
  DashboardCharts,
  DashboardSummary,
  FinancialRecord,
  KanbanBoardColumn,
  KanbanColumn,
  MonthlyReport,
  Payment,
  Project,
} from "@/lib/api-types";

export const qk = {
  me: ["me"] as const,
  dashboard: (month: number, year: number) => ["dashboard", month, year] as const,
  charts: (months: number, year?: number) => ["dashboard", "charts", months, year ?? null] as const,
  clients: (params: object) => ["clients", params] as const,
  client: (id: string) => ["clients", id] as const,
  projects: (params: object) => ["projects", params] as const,
  project: (id: string) => ["projects", id] as const,
  columns: ["kanban", "columns"] as const,
  board: ["kanban", "board"] as const,
  financial: (params: object) => ["financial", params] as const,
  financialRecord: (id: string) => ["financial", id] as const,
  payments: (recordId: string) => ["financial", recordId, "payments"] as const,
  report: (month: number, year: number, clientId?: string) =>
    ["reports", "monthly", month, year, clientId ?? null] as const,
  activities: (params: Record<string, unknown>) => ["activities", params] as const,
};

function invalidateFinancialWorld(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["financial"] });
  qc.invalidateQueries({ queryKey: ["reports"] });
  qc.invalidateQueries({ queryKey: ["projects"] });
  qc.invalidateQueries({ queryKey: ["clients"] });
  qc.invalidateQueries({ queryKey: ["kanban"] });
  qc.invalidateQueries({ queryKey: ["activities"] });
}

/* ─────────────────────────── User ─────────────────────────── */

export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => api.get<{ id: string; name: string; email: string; image: string | null }>("/me").then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

/* ───────────────────────── Dashboard ──────────────────────── */

export function useDashboard(month: number, year: number) {
  return useQuery({
    queryKey: qk.dashboard(month, year),
    queryFn: () => api.get<DashboardSummary>("/dashboard", { month, year }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useCharts(months: number, year?: number) {
  return useQuery({
    queryKey: qk.charts(months, year),
    queryFn: () => api.get<DashboardCharts>("/dashboard/charts", { months, year }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

/* ─────────────────────────── Clients ──────────────────────── */

export interface ClientsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export function useClients(params: ClientsParams = {}) {
  return useQuery({
    queryKey: qk.clients(params),
    queryFn: () => api.get<Client[]>("/clients", { ...params }),
    placeholderData: keepPreviousData,
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: qk.client(id ?? "none"),
    queryFn: () => api.get<Client>(`/clients/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Client>) => api.post<Client>("/clients", body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Client>) => api.put<Client>(`/clients/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/clients/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

/* ─────────────────────────── Projects ─────────────────────── */

export interface ProjectsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  status?: string | string[];
  priority?: string | string[];
  paymentStatus?: string | string[];
  clientId?: string;
  columnId?: string;
  month?: number;
  year?: number;
  from?: string;
  to?: string;
}

export function useProjects(params: ProjectsParams = {}) {
  return useQuery<ApiResult<Project[]>>({
    queryKey: qk.projects(params),
    queryFn: () => api.get<Project[]>("/projects", { ...params }),
    placeholderData: keepPreviousData,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: qk.project(id ?? "none"),
    queryFn: () => api.get<Project>(`/projects/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Project>("/projects", body).then((r) => r.data),
    onSuccess: () => invalidateFinancialWorld(qc),
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put<Project>(`/projects/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      invalidateFinancialWorld(qc);
      qc.invalidateQueries({ queryKey: qk.project(id) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, financial }: { id: string; financial: "keep" | "cancel" }) =>
      api.delete<{ id: string }>(`/projects/${id}`, { financial }).then((r) => r.data),
    onSuccess: () => invalidateFinancialWorld(qc),
  });
}

export function useMoveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, columnId, position }: { id: string; columnId: string; position?: number }) =>
      api.post<Project>(`/projects/${id}/move`, { columnId, position }).then((r) => r.data),
    onSuccess: () => invalidateFinancialWorld(qc),
  });
}

/**
 * Lightweight "create card right in the Kanban" flow: only a title, a value and
 * an optional color tag. When no client is given, the project is filed under a
 * "Sem cliente" bucket (created on demand) — refine it later in the details panel.
 */
export function useQuickAddProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      value: number;
      color?: string;
      columnId: string;
      clientId?: string;
    }) => {
      let clientId = input.clientId;
      if (!clientId) {
        const res = await api.get<Client[]>("/clients", {
          pageSize: 100,
          sortBy: "name",
          sortDir: "asc",
        });
        const bucket = res.data.find(
          (c) => c.name.trim().toLowerCase() === "sem cliente",
        );
        clientId = bucket?.id ?? (await api.post<Client>("/clients", { name: "Sem cliente" })).data.id;
      }
      return api
        .post<Project>("/projects", {
          clientId,
          title: input.title,
          value: input.value,
          color: input.color,
          columnId: input.columnId,
          priority: "MEDIUM",
        })
        .then((r) => r.data);
    },
    onSuccess: () => invalidateFinancialWorld(qc),
  });
}

/* ─────────────────────────── Kanban ───────────────────────── */

export function useColumns() {
  return useQuery({
    queryKey: qk.columns,
    queryFn: () => api.get<KanbanColumn[]>("/kanban/columns").then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useBoard() {
  return useQuery({
    queryKey: qk.board,
    queryFn: () => api.get<KanbanBoardColumn[]>("/kanban/board").then((r) => r.data),
  });
}

export function useCreateColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; color?: string; isDeliveredColumn?: boolean }) =>
      api.post<KanbanColumn>("/kanban/columns", body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kanban"] }),
  });
}

export function useUpdateColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; color?: string; isDeliveredColumn?: boolean }) =>
      api.put<KanbanColumn>(`/kanban/columns/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kanban"] }),
  });
}

export function useDeleteColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, moveTo }: { id: string; moveTo?: string }) =>
      api.delete<{ id: string }>(`/kanban/columns/${id}`, { moveTo }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kanban"] }),
  });
}

export function useReorderColumns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: string[]) => api.put<KanbanColumn[]>("/kanban/columns/reorder", { order }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kanban"] }),
  });
}

/* ────────────────────────── Financial ─────────────────────── */

export interface FinancialParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  type?: string;
  status?: string | string[];
  category?: string;
  clientId?: string;
  projectId?: string;
  month?: number;
  year?: number;
  from?: string;
  to?: string;
  autoGenerated?: boolean;
}

export function useFinancial(params: FinancialParams = {}) {
  return useQuery<ApiResult<FinancialRecord[]>>({
    queryKey: qk.financial(params),
    queryFn: () => api.get<FinancialRecord[]>("/financial", { ...params }),
    placeholderData: keepPreviousData,
  });
}

export function useFinancialRecord(id: string | undefined) {
  return useQuery({
    queryKey: qk.financialRecord(id ?? "none"),
    queryFn: () => api.get<FinancialRecord>(`/financial/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateFinancial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<FinancialRecord>("/financial", body).then((r) => r.data),
    onSuccess: () => invalidateFinancialWorld(qc),
  });
}

export function useUpdateFinancial(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put<FinancialRecord>(`/financial/${id}`, body).then((r) => r.data),
    onSuccess: () => invalidateFinancialWorld(qc),
  });
}

export function useDeleteFinancial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/financial/${id}`).then((r) => r.data),
    onSuccess: () => invalidateFinancialWorld(qc),
  });
}

export function usePayments(recordId: string | undefined) {
  return useQuery({
    queryKey: qk.payments(recordId ?? "none"),
    queryFn: () => api.get<Payment[]>(`/financial/${recordId}/payments`).then((r) => r.data),
    enabled: !!recordId,
  });
}

export function useAddPayment(recordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<FinancialRecord>(`/financial/${recordId}/payments`, body).then((r) => r.data),
    onSuccess: () => {
      invalidateFinancialWorld(qc);
      qc.invalidateQueries({ queryKey: ["financial", recordId] });
    },
  });
}

export function useDeletePayment(recordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      api.delete<FinancialRecord>(`/financial/${recordId}/payments/${paymentId}`).then((r) => r.data),
    onSuccess: () => {
      invalidateFinancialWorld(qc);
      qc.invalidateQueries({ queryKey: ["financial", recordId] });
    },
  });
}

/* ─────────────────────────── Reports ──────────────────────── */

export function useMonthlyReport(month: number, year: number, clientId?: string) {
  return useQuery({
    queryKey: qk.report(month, year, clientId),
    queryFn: () =>
      api.get<MonthlyReport>("/reports/monthly", { month, year, clientId }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

/* ────────────────────────── Activities ────────────────────── */

export function useActivities(params: { page?: number; pageSize?: number; projectId?: string } = {}) {
  return useQuery<ApiResult<Activity[]>>({
    queryKey: qk.activities(params),
    queryFn: () => api.get<Activity[]>("/activities", { ...params }),
    placeholderData: keepPreviousData,
  });
}
