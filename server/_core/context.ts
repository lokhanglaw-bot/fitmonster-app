import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authResult = await sdk.authenticateRequest(opts.req);
    if (authResult) {
      user = authResult;
    }
  } catch {
    // unauthenticated — user stays null, publicProcedures still work
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
