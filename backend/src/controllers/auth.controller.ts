import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { successResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../types';

class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const { token, user } = await authService.login(email, password);

      res.status(200).json(
        successResponse({ token, user }, 'Login successful')
      );
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.userId;
      const user = await authService.getUserById(userId);

      res.status(200).json(
        successResponse(user, 'User profile fetched successfully')
      );
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
