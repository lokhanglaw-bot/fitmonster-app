import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getUserById, getUserByOpenId } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    // For local login users, try X-User-Id or X-Open-Id header fallback
    const xUserId = opts.req.headers["x-user-id"];
    const xOpenId = opts.req.headers["x-open-id"];
    
    if (xUserId) {
      const numId = Number(xUserId);
      if (!isNaN(numId) && numId > 0) {
        try {
          const dbUser = await getUserById(numId);
          if (dbUser) {
            user = dbUser;
          }
        } catch (e) {
          // ignore
        }
      }
    }
    
    if (!user && xOpenId && typeof xOpenId === "string") {
      try {
        const dbUser = await getUserByOpenId(xOpenId);
        if (dbUser) {
          user = dbUser;
        }
      } catch (e) {
        // ignore
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
