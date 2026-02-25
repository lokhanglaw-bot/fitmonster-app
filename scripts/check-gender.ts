import "./load-env.js";
import { drizzle } from "drizzle-orm/mysql2";
import { userLocations, profiles, users } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  
  // Get all sharing users with their gender
  const locs = await db.select({
    userId: userLocations.userId,
    isSharing: userLocations.isSharing,
  }).from(userLocations).where(eq(userLocations.isSharing, true));
  
  console.log("Sharing users:", locs.length);
  
  for (const loc of locs) {
    const prof = await db.select({
      gender: profiles.gender,
      trainerName: profiles.trainerName,
    }).from(profiles).where(eq(profiles.userId, loc.userId)).limit(1);
    
    console.log(`User ${loc.userId}: gender=${prof[0]?.gender ?? 'NULL'}, name=${prof[0]?.trainerName ?? 'NULL'}`);
  }
  
  await conn.end();
}

main().catch(console.error);
