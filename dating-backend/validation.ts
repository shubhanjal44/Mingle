// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors';

export const validate = (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // ZodError is handled by the central errorHandler, but we can also throw a BadRequestError
        // for consistency if we want to wrap Zod errors in our custom ApiError structure.
        next(error);
      } else {
        next(new BadRequestError('Invalid request payload'));
      }
    }
  };