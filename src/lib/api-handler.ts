import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/api-response";

export interface AuthedContext {
  /** Authenticated user id — every service call must be scoped by this. */
  userId: string;
  /** Route params (already awaited). */
  params: Record<string, string>;
  /** Parsed URL search params. */
  searchParams: URLSearchParams;
  req: NextRequest;
}

type RouteContext = { params: Promise<Record<string, string | string[]>> };

type Handler = (ctx: AuthedContext) => Promise<Response> | Response;

function normalizeParams(input: Record<string, string | string[]> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    out[key] = Array.isArray(value) ? (value[0] ?? "") : value;
  }
  return out;
}

/**
 * Wraps a route handler with:
 *  - authentication (401 when there is no session)
 *  - param/searchParam normalization
 *  - centralized error handling → standardized JSON envelope
 */
export function withAuth(handler: Handler) {
  return async (req: NextRequest, context: RouteContext): Promise<Response> => {
    try {
      const session = await auth();
      if (!session?.user?.id) {
        throw new UnauthorizedError();
      }

      const params = normalizeParams(context?.params ? await context.params : undefined);

      return await handler({
        userId: session.user.id,
        params,
        searchParams: req.nextUrl.searchParams,
        req,
      });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/**
 * Same as `withAuth` but for public routes (register, health).
 * Only provides centralized error handling.
 */
export function withHandler(
  handler: (req: NextRequest, params: Record<string, string>) => Promise<Response> | Response,
) {
  return async (req: NextRequest, context: RouteContext): Promise<Response> => {
    try {
      const params = normalizeParams(context?.params ? await context.params : undefined);
      return await handler(req, params);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** Parse and validate a JSON body; throws a Zod-friendly error on malformed JSON. */
export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
