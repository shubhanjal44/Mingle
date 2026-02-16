// src/routes/profile.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  updateProfile,
  addPrompt,
  updatePrompt,
  deletePrompt,
  addPhoto,
  deletePhoto,
  updatePhotoOrder,
  getMyProfile,
} from '../controllers/profile';
import {
  updateProfileSchema,
  addPromptSchema,
  updatePromptSchema,
  addPhotoSchema,
  updatePhotoOrderSchema,
} from '../schemas/profile';

const router = Router();

// All profile routes require authentication
router.use(authMiddleware);

router.get('/me', getMyProfile);
router.patch('/', validate(updateProfileSchema), updateProfile);
router.post('/prompts', validate(addPromptSchema), addPrompt);
router.patch('/prompts/:promptId', validate(updatePromptSchema), updatePrompt);
router.delete('/prompts/:promptId', deletePrompt); // No body validation needed for delete
router.post('/photos', validate(addPhotoSchema), addPhoto);
router.delete('/photos/:photoId', deletePhoto); // No body validation needed for delete
router.put('/photos/order', validate(updatePhotoOrderSchema), updatePhotoOrder); // Use PUT for full replacement of order

export default router;