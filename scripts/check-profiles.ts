import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("No DATABASE_URL"); process.exit(1); }
  const conn = await mysql.createConnection(url);
  const db = drizzle(conn);

  // Check profiles gender
  console.log("\n=== PROFILES (gender) ===");
  const profiles = await db.execute(sql`SELECT userId, trainerName, gender, matchGenderPreference FROM profiles`);
  console.table(profiles[0]);

  // Check userLocations isSharing
  console.log("\n=== USER LOCATIONS (isSharing) ===");
  const locations = await db.execute(sql`SELECT userId, isSharing, latitude, longitude, lastUpdated FROM userLocations`);
  console.table(locations[0]);

  await conn.end();
}

main().catch(console.error);
