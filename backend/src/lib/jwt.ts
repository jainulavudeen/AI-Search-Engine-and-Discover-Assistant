import jwt, { SignOptions } from "jsonwebtoken";
import { Role } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set in environment variables");
  return s;
}

export function signToken(payload: JwtPayload): string {
  const opts: SignOptions = { expiresIn: "7d" };
  return jwt.sign(payload, getSecret(), opts);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getSecret());
  return decoded as unknown as JwtPayload;
}
