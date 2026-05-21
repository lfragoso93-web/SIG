import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError'

/**
 * Middleware centralizado de tratamento de erros.
 * Deve ser registrado APÓS todas as rotas no src/index.ts:
 *   app.use(errorHandler)
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
    })
    return
  }

  // Erro inesperado — nunca expor stack em produção
  const isDev = process.env.NODE_ENV !== 'production'
  console.error('[errorHandler] Erro não tratado:', err)

  res.status(500).json({
    error: 'InternalServerError',
    message: 'Erro interno do servidor.',
    ...(isDev && err instanceof Error ? { detail: err.message, stack: err.stack } : {}),
  })
}
