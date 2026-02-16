// src/routes/moderation.ts
import { Router } from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  blockUser,
  unblockUser,
  reportUser,
  getReports,
  updateReportStatus,
} from '../controllers/moderation';
import { blockUserSchema, reportUserSchema, adminUpdateReportSchema } from '../schemas/moderation';

const router = Router();

router.use(authMiddleware); // All moderation routes require authentication

router.post('/block', validate(blockUserSchema), blockUser);
router.delete('/block/:targetUserId', unblockUser);
router.post('/report', validate(reportUserSchema), reportUser);

router.get('/admin/reports', authorizeRoles('ADMIN', 'MODERATOR'), getReports);
router.patch('/admin/reports/:reportId', authorizeRoles('ADMIN', 'MODERATOR'), validate(adminUpdateReportSchema), updateReportStatus);

export default router;