import { Router } from "express";
import { handleSearch } from "../controllers/searchController";
import { optionalAuthenticate } from "../middleware/authenticate";

const router = Router();

/**
 * POST /api/search
 * Works for anonymous visitors; if a valid Bearer token is present, the
 * logged-in student's profile is blended into ranking (see aiSearchService).
 */
router.post("/", optionalAuthenticate, handleSearch);

export default router;
