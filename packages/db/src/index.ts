import { PrismaClient } from "@prisma/client";

/**
 * One PrismaClient per process. In dev we stash it on globalThis so `tsx watch`
 * reloads don't open a fresh connection pool on every change.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { Prisma } from "@prisma/client";
export type { Workspace, Member, Node, Acl, DocState, Comment, VersionSnapshot, ShareLink } from "@prisma/client";
