import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { calculateAge } from "../../shared/utils/profile.utils";
import { discoverQuerySchema } from "./validation";

type DiscoverQueryInput = z.infer<typeof discoverQuerySchema>;

export class DiscoverService {
  static async getProfiles(userId: string, query: DiscoverQueryInput) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const minAge = query.minAge ?? 18;
    const maxAge = query.maxAge ?? 35;

    const likedUsers = await prisma.like.findMany({
      where: { fromUserId: userId },
      select: { toUserId: true }
    });

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ userOneId: userId }, { userTwoId: userId }]
      },
      select: {
        userOneId: true,
        userTwoId: true
      }
    });

    const matchedUserIds = matches.map((match) =>
      match.userOneId === userId ? match.userTwoId : match.userOneId
    );

    const excludedIds = [
      userId,
      ...likedUsers.map((like) => like.toUserId),
      ...matchedUserIds
    ];

    const minDob = new Date();
    minDob.setFullYear(minDob.getFullYear() - maxAge - 1);
    const maxDob = new Date();
    maxDob.setFullYear(maxDob.getFullYear() - minAge);

    const where: Prisma.UserWhereInput = {
      id: { notIn: excludedIds },
      dateOfBirth: {
        gte: minDob,
        lte: maxDob
      },
      gender: query.gender,
      datingIntent: query.datingIntent,
      city: query.city,
      state: query.state
    };

    const [profiles, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          bio: true,
          gender: true,
          datingIntent: true,
          city: true,
          state: true,
          dateOfBirth: true,
          profileScore: true,
          activityScore: true,
          createdAt: true,
          photos: {
            select: { id: true, url: true, order: true },
            orderBy: { order: "asc" }
          },
          prompts: {
            select: { id: true, question: true, answer: true }
          }
        },
        orderBy: [
          { profileScore: "desc" },
          { activityScore: "desc" },
          { createdAt: "desc" }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    return {
      items: profiles.map((profile) => ({
        ...profile,
        age: profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : null,
        dateOfBirth: undefined
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }
}
