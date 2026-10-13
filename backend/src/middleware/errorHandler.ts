import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  details?: any;
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  console.error('[Error Handler]', {
    path: req.path,
    method: req.method,
    message: err.message || err,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle standard application errors with custom statusCode
  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    details: err.details || undefined,
  });
}
