/**
 * Connection Service
 * Manages user connections (following/followers)
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';

class ConnectionService {
  /**
   * Create a connection (follow a user)
   */
  async createConnection(userId: string, connectedUserId: string) {
    try {
      // Cannot connect to yourself
      if (userId === connectedUserId) {
        throw new Error('Cannot connect to yourself');
      }

      // Check if connection already exists
      const existing = await prisma.connection.findUnique({
        where: {
          userId_connectedUserId: {
            userId,
            connectedUserId,
          },
        },
      });

      if (existing) {
        throw new Error('Connection already exists');
      }

      // Check if the user to connect exists
      const targetUser = await prisma.user.findUnique({
        where: { userId: connectedUserId },
        select: { userId: true, name: true, status: true },
      });

      if (!targetUser) {
        throw new Error('User not found');
      }

      if (targetUser.status !== 'ACTIVE') {
        throw new Error('Cannot connect to inactive user');
      }

      // Create connection
      const connection = await prisma.connection.create({
        data: {
          userId,
          connectedUserId,
        },
        include: {
          connectedUser: {
            select: {
              userId: true,
              name: true,
              avatar: true,
              bio: true,
              city: true,
              state: true,
            },
          },
        },
      });

      // Get current user info for notification
      const currentUser = await prisma.user.findUnique({
        where: { userId },
        select: { name: true },
      });

      // Notify the connected user
      await notificationService.createNotification({
        userId: connectedUserId,
        type: 'SYSTEM',
        title: 'New Connection',
        message: `${currentUser?.name || 'Someone'} connected with you`,
        data: {
          connectionId: connection.connectionId,
          userId,
        },
      });

      logger.info(`User ${userId} connected to ${connectedUserId}`);
      return connection;
    } catch (error) {
      logger.error('Failed to create connection:', error);
      throw error;
    }
  }

  /**
   * Remove a connection (unfollow a user)
   */
  async removeConnection(userId: string, connectedUserId: string) {
    try {
      const connection = await prisma.connection.findUnique({
        where: {
          userId_connectedUserId: {
            userId,
            connectedUserId,
          },
        },
      });

      if (!connection) {
        throw new Error('Connection not found');
      }

      await prisma.connection.delete({
        where: {
          connectionId: connection.connectionId,
        },
      });

      logger.info(`User ${userId} disconnected from ${connectedUserId}`);
      return true;
    } catch (error) {
      logger.error('Failed to remove connection:', error);
      throw error;
    }
  }

  /**
   * Get user's connections (users they are following)
   */
  async getUserConnections(userId: string) {
    try {
      const connections = await prisma.connection.findMany({
        where: { userId },
        include: {
          connectedUser: {
            select: {
              userId: true,
              name: true,
              avatar: true,
              bio: true,
              city: true,
              state: true,
              rating: true,
              completedSwaps: true,
              level: true,
              _count: {
                select: {
                  skills: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return connections.map((c) => ({
        connectionId: c.connectionId,
        connectedAt: c.createdAt,
        user: c.connectedUser,
      }));
    } catch (error) {
      logger.error('Failed to get user connections:', error);
      throw error;
    }
  }

  /**
   * Get user's followers (users who are following them)
   */
  async getUserFollowers(userId: string) {
    try {
      const followers = await prisma.connection.findMany({
        where: { connectedUserId: userId },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              avatar: true,
              bio: true,
              city: true,
              state: true,
              rating: true,
              completedSwaps: true,
              level: true,
              _count: {
                select: {
                  skills: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return followers.map((f) => ({
        connectionId: f.connectionId,
        connectedAt: f.createdAt,
        user: f.user,
      }));
    } catch (error) {
      logger.error('Failed to get user followers:', error);
      throw error;
    }
  }

  /**
   * Check if user is connected to another user
   */
  async isConnected(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const connection = await prisma.connection.findUnique({
        where: {
          userId_connectedUserId: {
            userId,
            connectedUserId: targetUserId,
          },
        },
      });

      return !!connection;
    } catch (error) {
      logger.error('Failed to check connection:', error);
      return false;
    }
  }

  /**
   * Check if two users are mutually connected
   */
  async areMutuallyConnected(userId1: string, userId2: string): Promise<boolean> {
    try {
      const [connection1, connection2] = await Promise.all([
        prisma.connection.findUnique({
          where: {
            userId_connectedUserId: {
              userId: userId1,
              connectedUserId: userId2,
            },
          },
        }),
        prisma.connection.findUnique({
          where: {
            userId_connectedUserId: {
              userId: userId2,
              connectedUserId: userId1,
            },
          },
        }),
      ]);

      return !!(connection1 && connection2);
    } catch (error) {
      logger.error('Failed to check mutual connection:', error);
      return false;
    }
  }

  /**
   * Get mutual connections between two users
   */
  async getMutualConnections(userId: string, targetUserId: string) {
    try {
      // Get connections of both users
      const [user1Connections, user2Connections] = await Promise.all([
        prisma.connection.findMany({
          where: { userId },
          select: { connectedUserId: true },
        }),
        prisma.connection.findMany({
          where: { userId: targetUserId },
          select: { connectedUserId: true },
        }),
      ]);

      // Find common connected users
      const user1ConnectedIds = user1Connections.map((c) => c.connectedUserId);
      const user2ConnectedIds = user2Connections.map((c) => c.connectedUserId);
      const mutualIds = user1ConnectedIds.filter((id) => user2ConnectedIds.includes(id));

      if (mutualIds.length === 0) {
        return [];
      }

      // Get user details for mutual connections
      const mutualUsers = await prisma.user.findMany({
        where: {
          userId: {
            in: mutualIds,
          },
        },
        select: {
          userId: true,
          name: true,
          avatar: true,
          bio: true,
          city: true,
          state: true,
        },
      });

      return mutualUsers;
    } catch (error) {
      logger.error('Failed to get mutual connections:', error);
      throw error;
    }
  }

  /**
   * Get connection statistics for a user
   */
  async getConnectionStats(userId: string) {
    try {
      const [followingCount, followersCount, mutualCount] = await Promise.all([
        // Count users this user is following
        prisma.connection.count({
          where: { userId },
        }),
        // Count users following this user
        prisma.connection.count({
          where: { connectedUserId: userId },
        }),
        // Count mutual connections
        this.getMutualConnectionsCount(userId),
      ]);

      return {
        following: followingCount,
        followers: followersCount,
        mutual: mutualCount,
      };
    } catch (error) {
      logger.error('Failed to get connection stats:', error);
      throw error;
    }
  }

  /**
   * Get count of mutual connections
   */
  private async getMutualConnectionsCount(userId: string): Promise<number> {
    try {
      // Get users this user is following
      const following = await prisma.connection.findMany({
        where: { userId },
        select: { connectedUserId: true },
      });

      const followingIds = following.map((c) => c.connectedUserId);

      if (followingIds.length === 0) {
        return 0;
      }

      // Count how many of those are also following this user back
      const mutualCount = await prisma.connection.count({
        where: {
          userId: {
            in: followingIds,
          },
          connectedUserId: userId,
        },
      });

      return mutualCount;
    } catch (error) {
      logger.error('Failed to get mutual connections count:', error);
      return 0;
    }
  }

  /**
   * Get suggested connections for a user
   * Based on mutual connections and similar skills
   */
  async getSuggestedConnections(userId: string, limit: number = 10) {
    try {
      // Get users already connected
      const existingConnections = await prisma.connection.findMany({
        where: { userId },
        select: { connectedUserId: true },
      });

      const connectedUserIds = existingConnections.map((c) => c.connectedUserId);

      // Get user's skills
      const userSkills = await prisma.userSkill.findMany({
        where: { userId },
        select: { skillId: true },
      });

      const userSkillIds = userSkills.map((s) => s.skillId);

      // Find users with similar skills who are not yet connected
      const suggestedUsers = await prisma.user.findMany({
        where: {
          userId: {
            not: userId,
            notIn: connectedUserIds,
          },
          status: 'ACTIVE',
          skills: {
            some: {
              skillId: {
                in: userSkillIds,
              },
            },
          },
        },
        select: {
          userId: true,
          name: true,
          avatar: true,
          bio: true,
          city: true,
          state: true,
          rating: true,
          level: true,
          completedSwaps: true,
          _count: {
            select: {
              skills: true,
              connections: true,
            },
          },
        },
        take: limit,
        orderBy: {
          rating: 'desc',
        },
      });

      return suggestedUsers;
    } catch (error) {
      logger.error('Failed to get suggested connections:', error);
      throw error;
    }
  }

  /**
   * Search for users to connect with
   */
  async searchUsers(
    userId: string,
    query: string,
    filters?: {
      city?: string;
      state?: string;
      skillId?: string;
    },
    limit: number = 20
  ) {
    try {
      const where: any = {
        userId: { not: userId },
        status: 'ACTIVE',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } },
        ],
      };

      if (filters?.city) {
        where.city = filters.city;
      }

      if (filters?.state) {
        where.state = filters.state;
      }

      if (filters?.skillId) {
        where.skills = {
          some: {
            skillId: filters.skillId,
          },
        };
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          userId: true,
          name: true,
          avatar: true,
          bio: true,
          city: true,
          state: true,
          rating: true,
          level: true,
          completedSwaps: true,
          _count: {
            select: {
              skills: true,
            },
          },
        },
        take: limit,
        orderBy: {
          rating: 'desc',
        },
      });

      // Check if current user is connected to each result
      const usersWithConnectionStatus = await Promise.all(
        users.map(async (user) => ({
          ...user,
          isConnected: await this.isConnected(userId, user.userId),
        }))
      );

      return usersWithConnectionStatus;
    } catch (error) {
      logger.error('Failed to search users:', error);
      throw error;
    }
  }
}

export const connectionService = new ConnectionService();
