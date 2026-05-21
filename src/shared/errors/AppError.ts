/**
 * Classe base para erros de aplicação conhecidos.
 * O errorHandler centralizado usa instanceof para diferenciar
 * erros esperados (negócio/validação) de erros inesperados (500).
 */
export class AppError extends Error {
  public readonly statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** 404 — recurso não encontrado */
export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado.`, 404)
    this.name = 'NotFoundError'
  }
}

/** 422 — erro de validação / regra de negócio */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422)
    this.name = 'ValidationError'
  }
}

/** 401 — não autenticado */
export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado.') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}
