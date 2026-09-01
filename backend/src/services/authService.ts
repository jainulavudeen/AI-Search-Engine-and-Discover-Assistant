import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { signToken } from "../lib/jwt";

// ── Safe user shape (no passwordHash) ─────────────────────────────────────────

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  college: true,
  course: true,
  year: true,
  interests: true,
  preferredLocations: true,
  opportunityTypes: true,
  onboardingCompleted: true,
  createdAt: true,
} as const;

// ── Registration ───────────────────────────────────────────────────────────────

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  college?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: params.email },
  });
  if (existing) {
    const err = new Error("This email is already registered. Please log in.");
    (err as NodeJS.ErrnoException).code = "DUPLICATE_EMAIL";
    Object.assign(err, { statusCode: 409 });
    throw err;
  }

  const passwordHash = await bcrypt.hash(params.password, 12);

  const user = await prisma.user.create({
    data: {
      name: params.name,
      email: params.email,
      passwordHash,
      college: params.college,
    },
    select: SAFE_SELECT,
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return { user, token };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginUser(params: {
  email: string;
  password: string;
}) {
  const user = await prisma.user.findUnique({
    where: { email: params.email },
  });

  // Constant-time comparison even when user doesn't exist
  const dummyHash = "$2a$12$invalidhashthatnevermatchesanything";
  const hash = user?.passwordHash ?? dummyHash;
  const valid = await bcrypt.compare(params.password, hash);

  if (!user || !valid) {
    const err = new Error("Invalid email or password");
    Object.assign(err, { statusCode: 401 });
    throw err;
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const safeUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: SAFE_SELECT,
  });

  return { user: safeUser!, token };
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export async function updateOnboarding(
  userId: string,
  data: {
    course?: string;
    year?: number;
    interests?: string[];
    preferredLocations?: string[];
    opportunityTypes?: string[];
  }
) {
  return prisma.user.update({
    where: { id: userId },
    data: { ...data, onboardingCompleted: true },
    select: SAFE_SELECT,
  });
}

// ── Get user ──────────────────────────────────────────────────────────────────

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_SELECT,
  });
}
