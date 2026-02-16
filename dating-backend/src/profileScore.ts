// src/utils/profileScore.ts
import { User, UserPhoto, Prompt } from '@prisma/client';

// Extend User type to include relations for score calculation
interface UserWithRelations extends User {
  photos: UserPhoto[];
  prompts: Prompt[];
}

export function calculateProfileCompletionScore(user: UserWithRelations): number {
  let score = 0;
  const maxScore = 100;

  // Base profile fields (assuming these are filled during registration or soon after)
  if (user.dateOfBirth) score += 10;
  if (user.gender) score += 10;
  if (user.name && user.name.length > 0) score += 5;

  // Optional profile fields
  if (user.bio && user.bio.length > 0) score += 15;
  if (user.datingIntent) score += 10;
  if (user.genderPreference) score += 10;
  if (user.city && user.city.length > 0) score += 5;
  if (user.state && user.state.length > 0) score += 5;
  if (user.latitude !== null && user.longitude !== null) score += 5; // Location coordinates

  // Prompts (3 required for full points)
  score += Math.min(user.prompts.length, 3) * 5; // 5% per prompt, max 15% for 3 prompts

  // Photos (minimum 2 required, max 5 for full points)
  score += Math.min(user.photos.length, 5) * 5; // 5% per photo, max 25% for 5 photos

  return Math.min(score, maxScore); // Cap score at 100
}