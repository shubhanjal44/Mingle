import { NextFunction, Request, Response } from "express";
import { AuthService } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.validation";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await AuthService.register(data);

      res.status(201).json({
        status: "success",
        message: "User registered successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await AuthService.login(data);

      res.status(200).json({
        status: "success",
        message: "Login successful",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
