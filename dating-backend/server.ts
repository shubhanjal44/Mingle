// src/server.ts
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth'; // Import authMiddleware
import authRoutes from './routes/auth';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/v1/auth', authRoutes);

// Example of a protected route
app.get('/api/v1/protected', authMiddleware, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: `Welcome, ${req.user?.name || req.user?.email}! This is a protected route.`,
    user: req.user,
  });
});

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new Error(`Can't find ${req.originalUrl} on this server!`));
});

// Global Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});