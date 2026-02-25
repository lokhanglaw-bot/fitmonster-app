import "./load-env.js";
import { drizzle } from "drizzle-orm/mysql2";
import { userLocations, profiles, friendships } from "../drizzle/schema";
import { desc } from "drizzle-orm";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const db = drizzle(process.env.DATABASE_URL);

  // Check all locations
  const locs = await db.select().from(userLocations).orderBy(desc(userLocations.lastUpdated));
  console.log("=== All User Locations ===");
  for (const loc of locs) {
    const now = Date.now();
    const updated = new Date(loc.lastUpdated).getTime();
    const hoursAgo = ((now - updated) / 3600000).toFixed(1);
    console.log(`  userId=${loc.userId}, lat=${loc.latitude}, lng=${loc.longitude}, sharing=${loc.isSharing}, lastUpdated=${loc.lastUpdated} (${hoursAgo}h ago)`);
  }

  // Check friendships
  const friends = await db.select().from(friendships);
  console.log("\n=== All Friendships ===");
  for (const f of friends) {
    console.log(`  userId=${f.userId} -> friendId=${f.friendId}, status=${f.status}`);
  }

  // Check profiles
  const profs = await db.select().from(profiles);
  console.log("\n=== All Profiles ===");
  for (const p of profs) {
    console.log(`  userId=${p.userId}, name=${p.trainerName}, gender=${p.gender}`);
  }

  process.exit(0);
}

main().catch(console.error);
