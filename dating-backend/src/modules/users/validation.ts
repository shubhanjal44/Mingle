import { DatingIntent } from "@prisma/client";
import { z } from "zod";

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    bio: z.string().max(500).optional(),
    dateOfBirth: z.coerce.date().optional(),
    gender: z.string().min(1).max(32).optional(),
    interestedIn: z.string().min(1).max(32).optional(),
    datingIntent: z.nativeEnum(DatingIntent).optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().min(1).max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required"
  });

export const addPromptSchema = z.object({
  question: z.string().min(3).max(120),
  answer: z.string().min(3).max(300)
});

export const updatePromptSchema = z
  .object({
    question: z.string().min(3).max(120).optional(),
    answer: z.string().min(3).max(300).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required"
  });

export const addPhotoSchema = z.object({
  url: z.string().url(),
  order: z.number().int().min(0).optional()
});

export const reorderPhotosSchema = z.object({
  photos: z
    .array(
      z.object({
        id: z.string().uuid(),
        order: z.number().int().min(0)
      })
    )
    .min(1)
});
