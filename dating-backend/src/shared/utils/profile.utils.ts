import { Prompt, User, UserPhoto } from "@prisma/client";

type ProfileInput = Pick<
  User,
  "bio" | "dateOfBirth" | "gender" | "interestedIn" | "datingIntent" | "city"
> & {
  photos: UserPhoto[];
  prompts: Prompt[];
};

export const calculateAge = (dateOfBirth: Date) => {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1;
  }
  return age;
};

export const calculateProfileScore = (profile: ProfileInput) => {
  let score = 0;

  if (profile.bio) score += 10;
  if (profile.dateOfBirth) score += 10;
  if (profile.gender) score += 10;
  if (profile.interestedIn) score += 10;
  if (profile.datingIntent) score += 10;
  if (profile.city) score += 10;

  score += Math.min(profile.photos.length, 5) * 6;
  score += Math.min(profile.prompts.length, 3) * 10;

  return Math.min(score, 100);
};
