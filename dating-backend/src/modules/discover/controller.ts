import { NextFunction, Response } from "express";
import { AppError } from "../../shared/errors/app-error";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { DiscoverService } from "./service";
import { discoverQuerySchema } from "./validation";

export class DiscoverController {
  static async getProfiles(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, "Unauthorized");
      }

      const query = discoverQuerySchema.parse(req.query);
      const result = await DiscoverService.getProfiles(userId, query);

      res.status(200).json({
        status: "success",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
