import { eq, and, desc, sql, or } from "drizzle-orm";
import { getDb } from "./db";
import { chatMessages, pushTokens } from "../drizzle/schema";

export interface SaveMessageInput {
  senderId: number;
  receiverId: number;
  message: string;
  messageType?: string;
}

export async function saveMessage(input: SaveMessageInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatMessages).values({
    senderId: input.senderId,
    receiverId: input.receiverId,
    message: input.message,
    messageType: (input.messageType || "text") as "text" | "image" | "audio" | "system",
  }) as any;

  const id = Number(result.insertId ?? result[0]?.insertId);

  // Return the saved message
  const saved = await db.select().from(chatMessages).where(eq(chatMessages.id, id)).limit(1);
  return saved[0] || null;
}

export async function getChatHistory(
  userId: number,
  friendId: number,
  limit: number = 50,
  before?: Date
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    or(
      and(eq(chatMessages.senderId, userId), eq(chatMessages.receiverId, friendId)),
      and(eq(chatMessages.senderId, friendId), eq(chatMessages.receiverId, userId))
    ),
  ];

  if (before) {
    conditions.push(sql`${chatMessages.createdAt} < ${before}`);
  }

  return db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

export async function markMessagesAsRead(senderId: number, receiverId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(chatMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(chatMessages.senderId, senderId),
        eq(chatMessages.receiverId, receiverId),
        eq(chatMessages.isRead, false)
      )
    );
}

export async function getUnreadCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(chatMessages)
    .where(
      and(eq(chatMessages.receiverId, userId), eq(chatMessages.isRead, false))
    );

  return Number(result[0]?.count || 0);
}

export async function getUnreadCountByFriend(userId: number): Promise<Array<{ senderId: number; count: number }>> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      senderId: chatMessages.senderId,
      count: sql<number>`COUNT(*)`,
    })
    .from(chatMessages)
    .where(
      and(eq(chatMessages.receiverId, userId), eq(chatMessages.isRead, false))
    )
    .groupBy(chatMessages.senderId);

  return result.map((r) => ({ senderId: r.senderId, count: Number(r.count) }));
}

// Get last message for each conversation
// FIX 15: Use SQL to get latest message per partner in 1 query instead of N+1
export async function getConversationPreviews(userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Single query: get the latest message for each conversation partner
  const rows = await db.execute(sql`
    SELECT m.* FROM ${chatMessages} m
    INNER JOIN (
      SELECT
        CASE WHEN sender_id = ${userId} THEN receiver_id ELSE sender_id END AS partner_id,
        MAX(id) AS max_id
      FROM ${chatMessages}
      WHERE sender_id = ${userId} OR receiver_id = ${userId}
      GROUP BY partner_id
    ) latest ON m.id = latest.max_id
    ORDER BY m.created_at DESC
  `);

  const results = (rows as any)[0] || rows;
  return (Array.isArray(results) ? results : []).map((row: any) => ({
    partnerId: row.sender_id === userId ? row.receiver_id : row.sender_id,
    lastMessage: {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      message: row.message,
      messageType: row.message_type,
      isRead: row.is_read,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    },
  }));
}

// Push token management
// IMPORTANT: Each user should only have ONE active push token at a time.
// When a new token is registered, all old tokens for that user are deleted.
// This prevents duplicate notifications (e.g., 22x) caused by stale tokens accumulating.
export async function savePushToken(userId: number, token: string, platform: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if this exact token already exists for this user
  const existing = await db
    .select()
    .from(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)))
    .limit(1);

  if (existing.length > 0) {
    // Token already registered - delete all OTHER tokens for this user, keep this one
    await db.delete(pushTokens).where(
      and(eq(pushTokens.userId, userId), sql`${pushTokens.token} != ${token}`)
    );
    await db.update(pushTokens).set({ updatedAt: new Date() }).where(eq(pushTokens.id, existing[0].id));
    console.log(`[Push] Token already exists for user ${userId}, cleaned up old tokens`);
    return existing[0].id;
  }

  // New token - delete ALL old tokens for this user first
  await db.delete(pushTokens).where(eq(pushTokens.userId, userId));
  console.log(`[Push] Deleted all old tokens for user ${userId}, registering new token`);

  const result = await db.insert(pushTokens).values({ userId, token, platform: platform as "ios" | "android" | "web" }) as any;
  return Number(result.insertId ?? result[0]?.insertId);
}

export async function getUserPushTokens(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const tokens = await db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
  return tokens.map((t) => t.token);
}

export async function removePushToken(token: string) {
  const db = await getDb();
  if (!db) return;

  await db.delete(pushTokens).where(eq(pushTokens.token, token));
}
