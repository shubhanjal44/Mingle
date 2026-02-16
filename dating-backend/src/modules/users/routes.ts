import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth.middleware";
import { UsersController } from "./controller";

const router = Router();

router.use(authMiddleware);

router.get("/me", UsersController.getMe);
router.patch("/profile", UsersController.updateProfile);
router.post("/prompts", UsersController.addPrompt);
router.patch("/prompts/:promptId", UsersController.updatePrompt);
router.delete("/prompts/:promptId", UsersController.deletePrompt);
router.post("/photos", UsersController.addPhoto);
router.delete("/photos/:photoId", UsersController.deletePhoto);
router.put("/photos/order", UsersController.reorderPhotos);

export default router;
