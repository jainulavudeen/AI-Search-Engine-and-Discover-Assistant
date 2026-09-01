import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  listBookmarks,
  addBookmark,
  removeBookmark,
  listBookmarkIds,
} from "../controllers/bookmarkController";

const router = Router();

// All bookmark routes require authentication
router.use(authenticate);

// GET /api/bookmarks - all bookmarked opportunities (full objects)
router.get("/", listBookmarks);

// GET /api/bookmarks/ids - just the IDs (lightweight, for syncing UI state)
router.get("/ids", listBookmarkIds);

// POST /api/bookmarks/:opportunityId - bookmark an opportunity
router.post("/:opportunityId", addBookmark);

// DELETE /api/bookmarks/:opportunityId - remove a bookmark
router.delete("/:opportunityId", removeBookmark);

export default router;
