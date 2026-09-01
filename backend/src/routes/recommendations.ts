import { Router } from "express";
import { listRecommendations, getMatch } from "../controllers/recommendationController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// All recommendation endpoints require authentication
router.use(authenticate);

/** GET /api/recommendations */
router.get("/", listRecommendations);

/** GET /api/recommendations/:opportunityId */
router.get("/:opportunityId", getMatch);

export default router;
