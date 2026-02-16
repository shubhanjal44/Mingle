// src/routes/premium.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { premiumCheckMiddleware } from '../middleware/premium';
import { validate } from '../middleware/validation';
import { getUsersWhoLikedMe, applyBoost } from '../controllers/premium';
import { applyBoostSchema } from '../schemas/premium';

const router = Router();

// All premium routes require authentication and premium subscription
router.use(authMiddleware, premiumCheckMiddleware);

router.get('/who-liked-me', getUsersWhoLikedMe);
router.post('/boost', validate(applyBoostSchema), applyBoost);

export default router;