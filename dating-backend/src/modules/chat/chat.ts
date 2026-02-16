// src/controllers/chat.ts
import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { UnauthorizedError, NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { calculateAge } from '../utils/ageCalculator';
import { Prisma } from '@prisma/client';

// Helper to check if a user is part of a conversation
const isUserInConversation = async (userId: string, conversationId: string): Promise<boolean> => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      match: {
        select: {
          userOneId: true,
          userTwoId: true,
        },
      },
    },
  });

  if (!conversation) {
    return false;
  }

  return conversation.match.userOneId === userId || conversation.match.userTwoId === userId;
};

// Helper to check if two users have blocked each other
const areUsersBlocked = async (user1Id: string, user2Id: string): Promise<boolean> => {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: user1Id, blockedId: user2Id },
        { blockerId: user2Id, blockedId: user1Id },
      ],
    },
  });
  return !!block;
};

// Helper to get the other user's ID in a conversation
const getOtherUserIdInConversation = async (currentUserId: string, conversationId: string): Promise<string | null> => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { match: true },
  });
  if (!conversation) {
    return false;
  }

  return conversation.match.userOneId === userId || conversation.match.userTwoId === userId;
};

// List matches for the current user
export const listMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const currentUserId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { userOneId: currentUserId },
          { userTwoId: currentUserId },
        ],
      },
      include: {
        userOne: {
          select: { id: true, name: true, photos: { select: { url: true, order: true }, orderBy: { order: 'asc' } }, dateOfBirth: true },
        },
        userTwo: {
          select: { id: true, name: true, photos: { select: { url: true, order: true }, orderBy: { order: 'asc' } }, dateOfBirth: true },
        },
        conversation: {
          select: { id: true, updatedAt: true },
        },
      },
      orderBy: {
        createdAt: 'desc', // Order by most recent match
      },
      skip,
      take: Number(limit),
    });

    const matchesWithOtherUser = matches.map(match => {
      const otherUser = match.userOneId === currentUserId ? match.userTwo : match.userOne;
      const age = otherUser.dateOfBirth ? calculateAge(otherUser.dateOfBirth) : null;
      return {
        matchId: match.id,
        conversationId: match.conversation?.id,
        matchedAt: match.createdAt,
        lastMessageAt: match.conversation?.updatedAt, // This will be updated when a message is sent
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          age,
          photo: otherUser.photos.length > 0 ? otherUser.photos[0].url : null, // Primary photo
        },
      };
    });

    const totalMatches = await prisma.match.count({
      where: {
        OR: [
          { userOneId: currentUserId },
          { userTwoId: currentUserId },
        ],
      },
    });

    res.status(200).json({
      status: 'success',
      results: matchesWithOtherUser.length,
      totalPages: Math.ceil(totalMatches / Number(limit)),
      currentPage: Number(page),
      data: matchesWithOtherUser,
    });
  } catch (error) {
    next(error);
  }
};

// Send a message
export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const senderId = req.user.id;
    const { conversationId, content } = req.body;

    // Get the other user in the conversation
    const otherUserId = await getOtherUserIdInConversation(senderId, conversationId);
    if (!otherUserId) {
      return next(new NotFoundError('Conversation not found.'));
    }

    // Check if either user has blocked the other
    if (await areUsersBlocked(senderId, otherUserId)) {
      return next(new ForbiddenError('You cannot send messages to this user because of a block.'));
    }

    // Ensure the sender is part of the conversation
    if (!(await isUserInConversation(senderId, conversationId))) {
      return next(new ForbiddenError('You are not part of this conversation.'));
    }

    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
      },
    });

    // Update conversation's updatedAt to reflect new message activity
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Optional: Update activity score for sender
    await prisma.user.update({
      where: { id: senderId },
      data: { activityScore: { increment: 5 } }, // More points for sending messages
    });

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (error) {
    next(error);
  }
};

// Get messages for a conversation
export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const currentUserId = req.user.id;
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Get the other user in the conversation
    const otherUserId = await getOtherUserIdInConversation(currentUserId, conversationId);
    if (!otherUserId) {
      return next(new NotFoundError('Conversation not found.'));
    }

    // Check if either user has blocked the other
    if (await areUsersBlocked(currentUserId, otherUserId)) {
      return next(new ForbiddenError('You cannot view messages in this conversation because of a block.'));
    }

    // Ensure the current user is part of the conversation
    if (!(await isUserInConversation(currentUserId, conversationId))) {
      return next(new ForbiddenError('You are not part of this conversation.'));
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }, // Oldest messages first
      skip,
      take: Number(limit),
      include: {
        sender: {
          select: { id: true, name: true },
        },
      },
    });

    const totalMessages = await prisma.message.count({ where: { conversationId } });

    res.status(200).json({
      status: 'success',
      results: messages.length,
      totalPages: Math.ceil(totalMessages / Number(limit)),
      currentPage: Number(page),
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated.'));
    }

    const currentUserId = req.user.id;
    const { conversationId } = req.params;

    if (!(await isUserInConversation(currentUserId, conversationId))) {
      return next(new ForbiddenError('You are not part of this conversation.'));
    }

    // Mark all unread messages sent by the other user in this conversation as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: currentUserId }, // Messages sent by the other person
        readAt: null, // Only unread messages
      },
      data: {
        readAt: new Date(),
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Messages marked as read.',
    });
  } catch (error) {
    next(error);
  }
};