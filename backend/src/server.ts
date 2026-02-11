import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

// Import configurations
import { corsOptions } from './config/cors';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { redis } from './config/redis';
import { performanceMiddleware } from './middleware/performance';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import skillRoutes from './routes/skill.routes';
import matchRoutes from './routes/match.routes';
import swapRoutes from './routes/swap.routes';
import notificationRoutes from './routes/notification.routes';
import reviewRoutes from './routes/review.routes';
import chatRoutes from './routes/chat.routes';
import gamificationRoutes from './routes/gamification.routes';
import eventRoutes from './routes/event.routes';
import connectionRoutes from './routes/connection.routes';
import subscriptionRoutes from './routes/subscription.routes';
import webhookRoutes from './routes/webhook.routes';
import adminRoutes from './routes/admin.routes';
import moderationRoutes from './routes/moderation.routes';
import performanceRoutes from './routes/performance.routes';

// Import services
import { chatService } from './services/chat.service';

const app: Application = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
});

// Global middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Performance monitoring (track all requests)
app.use(performanceMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/skills`, skillRoutes);
app.use(`/api/${API_VERSION}/matches`, matchRoutes);
app.use(`/api/${API_VERSION}/swaps`, swapRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/reviews`, reviewRoutes);
app.use(`/api/${API_VERSION}/chat`, chatRoutes);
app.use(`/api/${API_VERSION}/gamification`, gamificationRoutes);
app.use(`/api/${API_VERSION}/events`, eventRoutes);
app.use(`/api/${API_VERSION}/connections`, connectionRoutes);
app.use(`/api/${API_VERSION}/subscriptions`, subscriptionRoutes);
app.use(`/api/${API_VERSION}/webhooks`, webhookRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/moderation`, moderationRoutes);
app.use(`/api/${API_VERSION}/performance`, performanceRoutes);

// Socket.IO connection handling with Chat support
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  let currentUserId: string | undefined;

  // User authentication for socket
  socket.on('auth:identify', (data: { userId: string }) => {
    currentUserId = data.userId;
    chatService.handleUserConnect(socket, data.userId);
    socket.emit('auth:identified', { userId: data.userId });
  });

  // Join a conversation room
  socket.on('conversation:join', (data: { otherUserId: string }) => {
    if (!currentUserId) return;
    const conversationId = chatService.getConversationId(
      currentUserId,
      data.otherUserId
    );
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // Leave a conversation room
  socket.on('conversation:leave', (data: { otherUserId: string }) => {
    if (!currentUserId) return;
    const conversationId = chatService.getConversationId(
      currentUserId,
      data.otherUserId
    );
    socket.leave(conversationId);
    console.log(`Socket ${socket.id} left conversation ${conversationId}`);
  });

  // Typing indicator - start typing
  socket.on('typing:start', (data: { receiverId: string }) => {
    if (!currentUserId) return;
    chatService.handleTyping(socket, currentUserId, data.receiverId, true);
  });

  // Typing indicator - stop typing
  socket.on('typing:stop', (data: { receiverId: string }) => {
    if (!currentUserId) return;
    chatService.handleTyping(socket, currentUserId, data.receiverId, false);
  });

  // Message delivered acknowledgment
  socket.on('message:delivered', async (data: { messageId: string }) => {
    try {
      await chatService.markMessageAsDelivered(data.messageId);
    } catch (error) {
      console.error('Error marking message as delivered:', error);
    }
  });

  // Generic room join/leave (for backward compatibility)
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('leave-room', (roomId: string) => {
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (currentUserId) {
      chatService.handleUserDisconnect(socket, currentUserId);
    }
  });
});

// Make io accessible to routes
app.set('io', io);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const port = process.env.port || 3000;
const host = '0.0.0.0';


// Initialize Redis connection
redis.connect().catch((error) => {
  console.error('Failed to connect to Redis:', error.message);
  console.warn('Server will continue without Redis caching');
});

httpServer.listen(port, () => {
  const env = (process.env.NODE_ENV || 'development').padEnd(28);
  const redisStatus = (redis.isReady() ? 'Connected' : 'Unavailable').padEnd(32);
  
  console.log(`
    ╔═══════════════════════════════════════════╗
    ║  tej-india India Backend Server Started  ║
    ╠═══════════════════════════════════════════╣
    ║  Environment: ${env}║
    ║  Port: ${port.toString().padEnd(35)}║
    ║  API Version: ${API_VERSION.padEnd(30)}║
    ║  Redis: ${redisStatus}║
    ╚═══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(async () => {
    console.log('HTTP server closed');

    // Disconnect Redis
    try {
      await redis.disconnect();
      console.log('Redis disconnected');
    } catch (error) {
      console.error('Error disconnecting Redis:', error);
    }

    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  httpServer.close(async () => {
    console.log('HTTP server closed');

    // Disconnect Redis
    try {
      await redis.disconnect();
      console.log('Redis disconnected');
    } catch (error) {
      console.error('Error disconnecting Redis:', error);
    }

    process.exit(0);
  });
});

export { app, io }; 