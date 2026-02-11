import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include user from auth middleware
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    accountStatus: string;
  };
}

// Common types for controllers
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export type AuthRequestHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;
