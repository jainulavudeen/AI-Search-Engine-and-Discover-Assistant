import { Request, Response, NextFunction } from "express";
import { InteractionType } from "@prisma/client";
import { AuthRequest } from "../middleware/authenticate";
import prisma from "../lib/prisma";
import { logInteraction } from "../services/interactionService";

/**
 * GET /api/bookmarks
 * Returns all bookmarked opportunities for the logged-in user.
 */
export const listBookmarks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: { opportunity: true },
      orderBy: { createdAt: "desc" },
    });

    const opportunities = bookmarks.map((b) => b.opportunity);

    res.json({ status: "success", data: opportunities, total: opportunities.length });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/bookmarks/:opportunityId
 * Bookmarks an opportunity. Idempotent — no error if already bookmarked.
 */
export const addBookmark = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { opportunityId } = req.params;

    // Verify opportunity exists
    const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opp) {
      res.status(404).json({ status: "error", message: "Opportunity not found" });
      return;
    }

    // Check first so we only log an interaction for genuinely new bookmarks,
    // not repeated/idempotent calls.
    const existing = await prisma.bookmark.findUnique({
      where: { userId_opportunityId: { userId, opportunityId } },
    });

    // Upsert: create only if not already bookmarked
    await prisma.bookmark.upsert({
      where: { userId_opportunityId: { userId, opportunityId } },
      create: { userId, opportunityId },
      update: {}, // no-op if exists
    });

    if (!existing) {
      logInteraction({ userId, opportunityId, type: InteractionType.BOOKMARK });
    }

    res.status(201).json({ status: "success", bookmarked: true });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/bookmarks/:opportunityId
 * Removes a bookmark. Idempotent — no error if it doesn't exist.
 */
export const removeBookmark = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { opportunityId } = req.params;

    await prisma.bookmark.deleteMany({
      where: { userId, opportunityId },
    });

    res.json({ status: "success", bookmarked: false });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/bookmarks/ids
 * Returns only the IDs of bookmarked opportunities (for lightweight UI state).
 */
export const listBookmarkIds = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      select: { opportunityId: true },
    });

    res.json({
      status: "success",
      data: bookmarks.map((b) => b.opportunityId),
    });
  } catch (err) {
    next(err);
  }
};
