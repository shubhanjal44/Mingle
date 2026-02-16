// src/controllers/profile.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { calculateProfileCompletionScore } from '../utils/profileScore';
import { calculateAge } from '../utils/ageCalculator'; // Import from utility
import { Prisma } from '@prisma/client'; // Import Prisma for specific error types

// Get current user's profile (more detailed than getMe)
export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        photos: { orderBy: { order: 'asc' } },
        prompts: true,
        subscription: true,
      },
    });

    if (!user) {
      return next(new NotFoundError('User profile not found.'));
    }

    const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : null;
    const profileCompletionScore = calculateProfileCompletionScore(user);

    res.status(200).json({
      status: 'success',
      data: {
        ...user,
        age,
        profileCompletionScore,
        password: undefined, // Never send password hash
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile details
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const userId = req.user.id;
    const updateData = req.body;

    // If dateOfBirth is provided, convert it to Date object
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        photos: { orderBy: { order: 'asc' } },
        prompts: true,
        subscription: true,
      },
    });

    const age = updatedUser.dateOfBirth ? calculateAge(updatedUser.dateOfBirth) : null;
    const profileCompletionScore = calculateProfileCompletionScore(updatedUser);

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        ...updatedUser,
        age,
        profileCompletionScore,
        password: undefined,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // Record to update not found
        return next(new NotFoundError('User not found.'));
      }
    }
    next(error);
  }
};

// Add a new prompt
export const addPrompt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const userId = req.user.id;
    const { question, answer } = req.body;

    const existingPromptsCount = await prisma.prompt.count({
      where: { userId },
    });

    if (existingPromptsCount >= 3) {
      return next(new BadRequestError('You can only have a maximum of 3 prompts.'));
    }

    const newPrompt = await prisma.prompt.create({
      data: {
        userId,
        question,
        answer,
      },
    });

    // Recalculate profile score
    const userWithRelations = await prisma.user.findUnique({
      where: { id: userId },
      include: { photos: true, prompts: true },
    });
    if (userWithRelations) {
      const newScore = calculateProfileCompletionScore(userWithRelations);
      await prisma.user.update({
        where: { id: userId },
        data: { profileScore: newScore },
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Prompt added successfully',
      data: newPrompt,
    });
  } catch (error) {
    next(error);
  }
};

// Update an existing prompt
export const updatePrompt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const userId = req.user.id;
    const { promptId } = req.params; // From URL params
    const { question, answer } = req.body;

    const updatedPrompt = await prisma.prompt.update({
      where: {
        id: promptId,
        userId, // Ensure user owns the prompt
      },
      data: {
        question,
        answer,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Prompt updated successfully',
      data: updatedPrompt,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return next(new NotFoundError('Prompt not found or you do not have permission to update it.'));
      }
    }
    next(error);
  }
};

// Delete a prompt
export const deletePrompt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const userId = req.user.id;
    const { promptId } = req.params; // From URL params

    await prisma.prompt.delete({
      where: {
        id: promptId,
        userId, // Ensure user owns the prompt
      },
    });

    // Recalculate profile score
    const userWithRelations = await prisma.user.findUnique({
      where: { id: userId },
      include: { photos: true, prompts: true },
    });
    if (userWithRelations) {
      const newScore = calculateProfileCompletionScore(userWithRelations);
      await prisma.user.update({
        where: { id: userId },
        data: { profileScore: newScore },
      });
    }

    res.status(204).json({
      status: 'success',
      message: 'Prompt deleted successfully',
      data: null,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return next(new NotFoundError('Prompt not found or you do not have permission to delete it.'));
      }
    }
    next(error);
  }
};

// Add a new photo
export const addPhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const userId = req.user.id;
    let { url, order } = req.body;

    const existingPhotosCount = await prisma.userPhoto.count({
      where: { userId },
    });

    if (existingPhotosCount >= 5) { // Max 5 photos
      return next(new BadRequestError('You can only upload a maximum of 5 photos.'));
    }

    // If order is not provided, assign the next available order
    if (order === undefined || order === null) {
      const maxOrderPhoto = await prisma.userPhoto.findFirst({
        where: { userId },
        orderBy: { order: 'desc' },
      });
      order = (maxOrderPhoto?.order || -1) + 1;
    } else {
      // If order is provided, ensure it's unique and adjust others if necessary
      const photoAtOrder = await prisma.userPhoto.findUnique({
        where: { userId_order: { userId, order } },
      });
      if (photoAtOrder) {
        // Shift existing photos to make space
        await prisma.userPhoto.updateMany({
          where: {
            userId,
            order: { gte: order },
          },
          data: {
            order: { increment: 1 },
          },
        });
      }
    }

    const newPhoto = await prisma.userPhoto.create({
      data: {
        userId,
        url,
        order,
      },
    });

    // Recalculate profile score
    const userWithRelations = await prisma.user.findUnique({
      where: { id: userId },
      include: { photos: true, prompts: true },
    });
    if (userWithRelations) {
      const newScore = calculateProfileCompletionScore(userWithRelations);
      await prisma.user.update({
        where: { id: userId },
        data: { profileScore: newScore },
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Photo added successfully',
      data: newPhoto,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a photo
export const deletePhoto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const userId = req.user.id;
    const { photoId } = req.params; // From URL params

    const photoToDelete = await prisma.userPhoto.findUnique({
      where: { id: photoId, userId },
    });

    if (!photoToDelete) {
      return next(new NotFoundError('Photo not found or you do not have permission to delete it.'));
    }

    const existingPhotosCount = await prisma.userPhoto.count({
      where: { userId },
    });

    if (existingPhotosCount <= 2) { // Minimum 2 photos
      return next(new BadRequestError('You must have at least 2 photos.'));
    }

    await prisma.userPhoto.delete({
      where: { id: photoId },
    });

    // Re-order remaining photos to fill the gap
    await prisma.userPhoto.updateMany({
      where: {
        userId,
        order: { gt: photoToDelete.order },
      },
      data: {
        order: { decrement: 1 },
      },
    });

    // Recalculate profile score
    const userWithRelations = await prisma.user.findUnique({
      where: { id: userId },
      include: { photos: true, prompts: true },
    });
    if (userWithRelations) {
      const newScore = calculateProfileCompletionScore(userWithRelations);
      await prisma.user.update({
        where: { id: userId },
        data: { profileScore: newScore },
      });
    }

    res.status(204).json({
      status: 'success',
      message: 'Photo deleted successfully',
      data: null,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return next(new NotFoundError('Photo not found or you do not have permission to delete it.'));
      }
    }
    next(error);
  }
};

// Update photo order
export const updatePhotoOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const userId = req.user.id;
    const photosToUpdate = req.body.photos; // Array of { id, order }

    // Fetch all current photos for the user to validate and re-order
    const currentPhotos = await prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    if (currentPhotos.length !== photosToUpdate.length) {
      return next(new BadRequestError('All existing photos must be included in the order update.'));
    }

    const currentPhotoIds = new Set(currentPhotos.map(p => p.id));
    const incomingPhotoIds = new Set(photosToUpdate.map((p: { id: string; order: number; }) => p.id));

    if (currentPhotoIds.size !== incomingPhotoIds.size || ![...currentPhotoIds].every(id => incomingPhotoIds.has(id))) {
      return next(new BadRequestError('Mismatch in photo IDs provided for reordering.'));
    }

    // Validate that new orders are unique and within bounds
    const newOrders = photosToUpdate.map((p: { id: string; order: number; }) => p.order);
    if (new Set(newOrders).size !== newOrders.length) {
      return next(new BadRequestError('Photo orders must be unique.'));
    }
    if (Math.min(...newOrders) < 0 || Math.max(...newOrders) >= currentPhotos.length) {
      return next(new BadRequestError(`Photo orders must be between 0 and ${currentPhotos.length - 1}.`));
    }

    // Perform updates in a transaction to ensure consistency
    await prisma.$transaction(
      photosToUpdate.map((photo: { id: string; order: number; }) =>
        prisma.userPhoto.update({
          where: { id: photo.id, userId },
          data: { order: photo.order },
        })
      )
    );

    res.status(200).json({
      status: 'success',
      message: 'Photo order updated successfully',
      data: photosToUpdate, // Return the new order
    });
  } catch (error) {
    next(error);
  }
};