import { DatingIntent } from "@prisma/client";
import { z } from "zod";

export const discoverQuerySchema = z
  .object({
    minAge: z.coerce.number().int().min(18).max(100).optional(),
    maxAge: z.coerce.number().int().min(18).max(100).optional(),
    gender: z.string().min(1).max(32).optional(),
    datingIntent: z.nativeEnum(DatingIntent).optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
  .refine(
    (value) =>
      value.minAge === undefined ||
      value.maxAge === undefined ||
      value.minAge <= value.maxAge,
    {
      message: "minAge must be less than or equal to maxAge"
    }
  );
