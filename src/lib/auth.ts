/**
 * Simple mock auth for MVP. Structure allows adding NextAuth/Real auth later.
 * For dev: use a default user; no login required.
 */

import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const MOCK_USER_EMAIL = "dev@coursevault.local";
export const MOCK_USER_PASSWORD = "dev123";

export async function getOrCreateMockUser() {
  let user = await prisma.user.findUnique({ where: { email: MOCK_USER_EMAIL } });
  if (!user) {
    const hash = await bcrypt.hash(MOCK_USER_PASSWORD, 10);
    user = await prisma.user.create({
      data: {
        email: MOCK_USER_EMAIL,
        password: hash,
        name: "Dev User",
      },
    });
  }
  return user;
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
