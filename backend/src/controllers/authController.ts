import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  registerUser,
  loginUser,
  updateOnboarding,
  getUserById,
} from "../services/authService";
import { AuthRequest } from "../middleware/authenticate";

// ── Validation schemas ─────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
  college: z.string().max(200).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const onboardingSchema = z.object({
  course: z.string().max(100).optional(),
  year: z.number().int().min(1).max(5).optional(),
  interests: z.array(z.string().max(100)).max(20).optional(),
  preferredLocations: z.array(z.string().max(100)).max(10).optional(),
  opportunityTypes: z.array(z.string().max(100)).max(10).optional(),
});

// ── POST /api/auth/register ────────────────────────────────────────────────────

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { user, token } = await registerUser(parsed.data);

    res.status(201).json({
      status: "success",
      data: { user, token },
      meta: { redirectTo: "/onboarding" },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ───────────────────────────────────────────────────────

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { user, token } = await loginUser(parsed.data);

    res.json({
      status: "success",
      data: { user, token },
      // Tell the frontend where to redirect based on onboarding state
      meta: {
        redirectTo: user.onboardingCompleted ? "/dashboard" : "/onboarding",
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ status: "error", message: "User not found" });
      return;
    }
    res.json({ status: "success", data: { user } });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/auth/onboarding ──────────────────────────────────────────────────

export const completeOnboarding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = onboardingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const user = await updateOnboarding(req.user!.userId, parsed.data);
    res.json({
      status: "success",
      data: { user },
      meta: { redirectTo: "/dashboard" },
    });
  } catch (err) {
    next(err);
  }
};
