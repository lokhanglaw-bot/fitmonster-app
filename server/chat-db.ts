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
export async function getConversationPreviews(userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get all unique conversation partners
  const sent = await db
    .select({ partnerId: chatMessages.receiverId })
    .from(chatMessages)
    .where(eq(chatMessages.senderId, userId))
    .groupBy(chatMessages.receiverId);

  const received = await db
    .select({ partnerId: chatMessages.senderId })
    .from(chatMessages)
    .where(eq(chatMessages.receiverId, userId))
    .groupBy(chatMessages.senderId);

  const partnerIds = [...new Set([...sent.map((s) => s.partnerId), ...received.map((r) => r.partnerId)])];

  const previews = [];
  for (const partnerId of partnerIds) {
    const lastMsg = await db
      .select()
      .from(chatMessages)
      .where(
        or(
          and(eq(chatMessages.senderId, userId), eq(chatMessages.receiverId, partnerId)),
          and(eq(chatMessages.senderId, partnerId), eq(chatMessages.receiverId, userId))
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);

    if (lastMsg[0]) {
      previews.push({
        partnerId,
        lastMessage: lastMsg[0],
      });
    }
  }

  // Sort by most recent message
  previews.sort((a, b) => {
    const aTime = a.lastMessage.createdAt?.getTime() || 0;
    const bTime = b.lastMessage.createdAt?.getTime() || 0;
    return bTime - aTime;
  });

  return previews;
}

// Push token management
export async function savePushToken(userId: number, token: string, platform: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if token already exists for this user
  const existing = await db
    .select()
    .from(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)))
    .limit(1);

  if (existing.length > 0) {
    // Update lastUsed
    await db.update(pushTokens).set({ updatedAt: new Date() }).where(eq(pushTokens.id, existing[0].id));
    return existing[0].id;
  }

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
