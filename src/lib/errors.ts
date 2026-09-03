/**
 * Typed application errors. Every error carries an HTTP status and a
 * machine-readable `code` so the API layer can produce standardized responses.
 */
export type AppErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "RATE_LIMITED"
  | "INTERNAL";

export class AppError extends Error {
  readonly status: number;
  readonly code: AppErrorCode;
  readonly details?: unknown;

  constructor(
    code: AppErrorCode,
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Requisição inválida", details?: unknown) {
    super("BAD_REQUEST", message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Autenticação necessária") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Você não tem acesso a este recurso") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Recurso") {
    super("NOT_FOUND", `${resource} não encontrado`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflito de estado", details?: unknown) {
    super("CONFLICT", message, 409, details);
  }
}

export class UnprocessableError extends AppError {
  constructor(message = "Não foi possível processar a requisição", details?: unknown) {
    super("UNPROCESSABLE", message, 422, details);
  }
}
