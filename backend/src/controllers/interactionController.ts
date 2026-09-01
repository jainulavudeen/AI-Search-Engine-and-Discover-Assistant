import { Response, NextFunction } from "express";
import { z } from "zod";
import { InteractionType } from "@prisma/client";
import { logInteraction, getRecentViews } from "../services/interactionService";
import { AuthRequest } from "../middleware/authenticate";

const trackSchema = z.object({
  opportunityId: z.string().min(1),
});

function track(type: InteractionType) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = trackSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ status: "error", message: "opportunityId is required" });
        return;
      }

      // Fire-and-forget: tracking must never block or fail the student's
      // actual action. Respond immediately; log in the background.
      logInteraction({
        userId: req.user?.userId ?? null,
        opportunityId: parsed.data.opportunityId,
        type,
      });

      res.status(202).json({ status: "success" });
    } catch (err) {
      next(err);
    }
  };
}

export const trackView = track(InteractionType.VIEW);
export const trackRegisterClick = track(InteractionType.REGISTER_CLICK);
export const trackRecommendationClick = track(InteractionType.RECOMMENDATION_CLICK);

/**
 * GET /api/interactions/recent-views
 * Only ever the authenticated caller's own history — userId comes from the
 * verified JWT, never from a query param or request body.
 */
export const listMyRecentViews = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const opportunities = await getRecentViews(req.user!.userId);
    res.json({ status: "success", data: opportunities });
  } catch (err) {
    next(err);
  }
};
