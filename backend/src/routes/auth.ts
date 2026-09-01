import { Router } from "express";
import { register, login, getMe, completeOnboarding } from "../controllers/authController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

/** POST /api/auth/register */
router.post("/register", register);

/** POST /api/auth/login */
router.post("/login", login);

/** GET /api/auth/me — requires valid JWT */
router.get("/me", authenticate, getMe as any);

/** PUT /api/auth/onboarding — requires valid JWT */
router.put("/onboarding", authenticate, completeOnboarding as any);

export default router;
