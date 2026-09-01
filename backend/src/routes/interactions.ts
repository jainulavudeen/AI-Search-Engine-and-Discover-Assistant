import { Router } from "express";
import { trackView, trackRegisterClick, trackRecommendationClick, listMyRecentViews } from "../controllers/interactionController";
import { authenticate, optionalAuthenticate } from "../middleware/authenticate";

const router = Router();

// Tracking works for anonymous visitors too (view/register-click don't
// require an account) — optionalAuthenticate attaches userId when present
// without blocking the request otherwise.
router.post("/view", optionalAuthenticate, trackView);
router.post("/register-click", optionalAuthenticate, trackRegisterClick);

// Recommendations themselves require login (see routes/recommendations.ts),
// so a recommendation click is inherently from an authenticated student.
router.post("/recommendation-click", authenticate, trackRecommendationClick);

// A student's own recently viewed opportunities — never another student's.
router.get("/recent-views", authenticate, listMyRecentViews);

export default router;
