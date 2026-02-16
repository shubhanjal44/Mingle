import { NextFunction, Response } from "express";
import { AppError } from "../../shared/errors/app-error";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import {
  addPhotoSchema,
  addPromptSchema,
  reorderPhotosSchema,
  updateProfileSchema,
  updatePromptSchema
} from "./validation";
import { UsersService } from "./service";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }
  return userId;
};

export class UsersController {
  static async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const profile = await UsersService.getMe(userId);
      res.status(200).json({
        status: "success",
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = getUserId(req);
      const payload = updateProfileSchema.parse(req.body);
      const profile = await UsersService.updateProfile(userId, payload);
      res.status(200).json({
        status: "success",
        message: "Profile updated",
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  static async addPrompt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const payload = addPromptSchema.parse(req.body);
      const prompt = await UsersService.addPrompt(userId, payload);
      res.status(201).json({
        status: "success",
        message: "Prompt added",
        data: prompt
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePrompt(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = getUserId(req);
      const promptId = req.params.promptId;
      const payload = updatePromptSchema.parse(req.body);
      const prompt = await UsersService.updatePrompt(userId, promptId, payload);
      res.status(200).json({
        status: "success",
        message: "Prompt updated",
        data: prompt
      });
    } catch (error) {
      next(error);
    }
  }

  static async deletePrompt(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = getUserId(req);
      const promptId = req.params.promptId;
      await UsersService.deletePrompt(userId, promptId);
      res.status(200).json({
        status: "success",
        message: "Prompt deleted"
      });
    } catch (error) {
      next(error);
    }
  }

  static async addPhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = getUserId(req);
      const payload = addPhotoSchema.parse(req.body);
      const photo = await UsersService.addPhoto(userId, payload);
      res.status(201).json({
        status: "success",
        message: "Photo added",
        data: photo
      });
    } catch (error) {
      next(error);
    }
  }

  static async deletePhoto(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = getUserId(req);
      const photoId = req.params.photoId;
      await UsersService.deletePhoto(userId, photoId);
      res.status(200).json({
        status: "success",
        message: "Photo deleted"
      });
    } catch (error) {
      next(error);
    }
  }

  static async reorderPhotos(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = getUserId(req);
      const payload = reorderPhotosSchema.parse(req.body);
      const photos = await UsersService.reorderPhotos(userId, payload);
      res.status(200).json({
        status: "success",
        message: "Photo order updated",
        data: photos
      });
    } catch (error) {
      next(error);
    }
  }
}
