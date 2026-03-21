import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code ?? 'ERROR',
      },
    });
    return;
  }

  // ZodError
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: {
        message: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: (err as any).errors,
      },
    });
    return;
  }

  // Erro genérico
  console.error('[Error]', err);
  res.status(500).json({
    error: {
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    },
  });
}
