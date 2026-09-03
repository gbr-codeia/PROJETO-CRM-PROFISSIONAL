import type { ApiEnvelopeMeta } from "@/lib/api-types";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: ApiEnvelopeMeta;
}

type Query = Record<string, string | number | boolean | null | undefined | Array<string | number>>;

export function buildQuery(params?: Query): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) sp.append(key, String(v));
    } else {
      sp.set(key, String(value));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
    ...init,
  });

  if (res.status === 204) return { data: undefined as T };

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }

  const payload = json as
    | { success: true; data: T; meta?: ApiEnvelopeMeta }
    | { success: false; error: { code: string; message: string; details?: unknown } }
    | null;

  if (!res.ok || !payload || payload.success === false) {
    const err =
      payload && payload.success === false
        ? payload.error
        : { code: "HTTP_ERROR", message: `Erro ${res.status}` };
    throw new ApiError(err.message, err.code, res.status, "details" in err ? err.details : undefined);
  }

  return { data: payload.data, meta: payload.meta };
}

export const api = {
  get: <T>(path: string, params?: Query) => request<T>("GET", `${path}${buildQuery(params)}`),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  delete: <T>(path: string, params?: Query) => request<T>("DELETE", `${path}${buildQuery(params)}`),
};
