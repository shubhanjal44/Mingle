// src/routes/auth.ts
import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth';
import { validate } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { registerSchema, loginSchema } from '../schemas/auth';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authMiddleware, getMe);

export default router;