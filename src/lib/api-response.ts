import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

/**
 * Standardized API envelope.
 *
 *   success:  { "success": true, "data": <payload>, "meta"?: <pagination/etc> }
 *   failure:  { "success": false, "error": { "code", "message", "details"? } }
 */
export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export function ok<T>(data: T, meta?: ApiMeta, status = 200) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });
}

export function created<T>(data: T, meta?: ApiMeta) {
  return ok(data, meta, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

/**
 * Convert any thrown value into a standardized error response.
 * Used by the route wrapper in `src/lib/api-handler.ts`.
 */
export function toErrorResponse(err: unknown) {
  if (err instanceof ZodError) {
    return fail("VALIDATION_ERROR", "Dados inválidos", 422, err.flatten());
  }

  if (err instanceof AppError) {
    return fail(err.code, err.message, err.status, err.details);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2025":
        return fail("NOT_FOUND", "Recurso não encontrado", 404);
      case "P2002":
        return fail("CONFLICT", "Registro duplicado", 409, {
          target: err.meta?.target,
        });
      case "P2003":
        return fail("CONFLICT", "Violação de referência (registro relacionado)", 409);
      default:
        break;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return fail("BAD_REQUEST", "Consulta inválida ao banco de dados", 400);
  }

  console.error("[api] unhandled error:", err);
  return fail("INTERNAL", "Erro interno do servidor", 500);
}
