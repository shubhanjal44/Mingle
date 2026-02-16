import { Prompt, User, UserPhoto, UserSubscription } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import {
  calculateAge,
  calculateProfileScore
} from "../../shared/utils/profile.utils";
import {
  addPhotoSchema,
  addPromptSchema,
  reorderPhotosSchema,
  updateProfileSchema,
  updatePromptSchema
} from "./validation";

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
type AddPromptInput = z.infer<typeof addPromptSchema>;
type UpdatePromptInput = z.infer<typeof updatePromptSchema>;
type AddPhotoInput = z.infer<typeof addPhotoSchema>;
type ReorderPhotosInput = z.infer<typeof reorderPhotosSchema>;

type UserProfile = User & {
  photos: UserPhoto[];
  prompts: Prompt[];
  subscription: UserSubscription | null;
};

type SanitizedUserProfile = Omit<UserProfile, "password"> & {
  age: number | null;
};

export class UsersService {
  private static sanitizeProfile(profile: UserProfile): SanitizedUserProfile {
    const { password: _password, ...safeUser } = profile;
    return {
      ...safeUser,
      age: profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : null
    };
  }

  private static async fetchProfile(userId: string) {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        photos: {
          orderBy: { order: "asc" }
        },
        prompts: true,
        subscription: true
      }
    });

    if (!profile) {
      throw new AppError(404, "User not found");
    }

    return profile;
  }

  private static async refreshProfileScore(userId: string) {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      include: { photos: true, prompts: true }
    });

    if (!profile) {
      throw new AppError(404, "User not found");
    }

    const score = calculateProfileScore(profile);

    await prisma.user.update({
      where: { id: userId },
      data: { profileScore: score }
    });
  }

  static async getMe(userId: string) {
    const profile = await this.fetchProfile(userId);
    return this.sanitizeProfile(profile);
  }

  static async updateProfile(userId: string, data: UpdateProfileInput) {
    if (data.dateOfBirth && data.dateOfBirth > new Date()) {
      throw new AppError(400, "Date of birth cannot be in the future");
    }

    await prisma.user.update({
      where: { id: userId },
      data
    });

    await this.refreshProfileScore(userId);
    return this.getMe(userId);
  }

  static async addPrompt(userId: string, data: AddPromptInput) {
    const promptsCount = await prisma.prompt.count({
      where: { userId }
    });

    if (promptsCount >= 3) {
      throw new AppError(400, "You can only add up to 3 prompts");
    }

    const prompt = await prisma.prompt.create({
      data: {
        userId,
        question: data.question,
        answer: data.answer
      }
    });

    await this.refreshProfileScore(userId);
    return prompt;
  }

  static async updatePrompt(
    userId: string,
    promptId: string,
    data: UpdatePromptInput
  ) {
    const updated = await prisma.prompt.updateMany({
      where: { id: promptId, userId },
      data
    });

    if (updated.count === 0) {
      throw new AppError(404, "Prompt not found");
    }

    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId }
    });

    await this.refreshProfileScore(userId);
    return prompt;
  }

  static async deletePrompt(userId: string, promptId: string) {
    const deleted = await prisma.prompt.deleteMany({
      where: { id: promptId, userId }
    });

    if (deleted.count === 0) {
      throw new AppError(404, "Prompt not found");
    }

    await this.refreshProfileScore(userId);
  }

  static async addPhoto(userId: string, data: AddPhotoInput) {
    const photosCount = await prisma.userPhoto.count({
      where: { userId }
    });

    if (photosCount >= 5) {
      throw new AppError(400, "You can only add up to 5 photos");
    }

    let nextOrder = data.order;

    if (nextOrder === undefined) {
      const lastPhoto = await prisma.userPhoto.findFirst({
        where: { userId },
        orderBy: { order: "desc" }
      });
      nextOrder = (lastPhoto?.order ?? -1) + 1;
    } else {
      await prisma.userPhoto.updateMany({
        where: {
          userId,
          order: { gte: nextOrder }
        },
        data: {
          order: { increment: 1 }
        }
      });
    }

    const photo = await prisma.userPhoto.create({
      data: {
        userId,
        url: data.url,
        order: nextOrder
      }
    });

    await this.refreshProfileScore(userId);
    return photo;
  }

  static async deletePhoto(userId: string, photoId: string) {
    const photo = await prisma.userPhoto.findFirst({
      where: { id: photoId, userId }
    });

    if (!photo) {
      throw new AppError(404, "Photo not found");
    }

    const photosCount = await prisma.userPhoto.count({
      where: { userId }
    });

    if (photosCount <= 2) {
      throw new AppError(400, "You must keep at least 2 photos");
    }

    await prisma.userPhoto.delete({
      where: { id: photo.id }
    });

    await prisma.userPhoto.updateMany({
      where: {
        userId,
        order: { gt: photo.order }
      },
      data: {
        order: { decrement: 1 }
      }
    });

    await this.refreshProfileScore(userId);
  }

  static async reorderPhotos(userId: string, data: ReorderPhotosInput) {
    const existingPhotos = await prisma.userPhoto.findMany({
      where: { userId }
    });

    if (existingPhotos.length !== data.photos.length) {
      throw new AppError(
        400,
        "Provide all current photos to reorder successfully"
      );
    }

    const existingIds = new Set(existingPhotos.map((photo) => photo.id));
    const incomingIds = new Set(data.photos.map((photo) => photo.id));
    const incomingOrders = data.photos.map((photo) => photo.order);

    if (
      existingIds.size !== incomingIds.size ||
      [...existingIds].some((id) => !incomingIds.has(id))
    ) {
      throw new AppError(400, "Photo id mismatch");
    }

    if (new Set(incomingOrders).size !== incomingOrders.length) {
      throw new AppError(400, "Photo order must be unique");
    }

    await prisma.$transaction(
      data.photos.map((photo) =>
        prisma.userPhoto.update({
          where: { id: photo.id },
          data: { order: photo.order }
        })
      )
    );

    await this.refreshProfileScore(userId);

    return prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { order: "asc" }
    });
  }
}
