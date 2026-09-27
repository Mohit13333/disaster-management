import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { errorResponse } from '../utils/apiResponse';

/**
 * validate middleware factory
 * Validates request against a Zod schema.
 * Supports body, params, and query validation.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.filter((p) => p !== 'body' && p !== 'params' && p !== 'query').join('.'),
        message: err.message,
      }));

      res.status(400).json(errorResponse('Validation failed', errors));
      return;
    }

    // Attach parsed data back to req for use in controllers
    if (result.data.body !== undefined) req.body = result.data.body;
    if (result.data.params !== undefined) req.params = result.data.params;
    if (result.data.query !== undefined) req.query = result.data.query;

    next();
  };
}
