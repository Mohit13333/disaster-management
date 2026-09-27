import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest, UserRole } from '../types';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

/**
 * authenticate middleware
 * Extracts and verifies JWT from Authorization header.
 * Attaches decoded payload to req.user.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No token provided'));
  }

  const token = authHeader.substring(7);

  try {
    const payload = authService.verifyToken(token);
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * authorize middleware factory
 * Restricts access to users with specific roles.
 * Must be used after authenticate.
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(user.role)) {
      return next(
        new ForbiddenError(
          `This action requires one of the following roles: ${roles.join(', ')}`
        )
      );
    }

    next();
  };
}
