import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { errorResponse } from '../utils/apiResponse';
import { config } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Centralized Express error handler.
 * Handles all errors passed via next(error).
 * Ensures no stack traces or secrets leak to clients.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log all errors server-side
  logger.error('Error handled', {
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Operational errors (AppError subclasses) - safe to surface
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message));
    return;
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json(errorResponse('Database validation failed'));
    return;
  }

  // Mongoose duplicate key
  if (err.name === 'MongoServerError' && (err as NodeJS.ErrnoException).code === '11000') {
    res.status(409).json(errorResponse('Resource already exists'));
    return;
  }

  // JWT errors handled by authService, but as a fallback
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json(errorResponse('Invalid or expired token'));
    return;
  }

  // Unknown errors — do NOT expose internals
  res.status(500).json(
    errorResponse(
      config.nodeEnv === 'development'
        ? err.message
        : 'An unexpected error occurred'
    )
  );
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(errorResponse(`Route ${req.method} ${req.path} not found`));
}
