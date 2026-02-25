import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const chatDbPath = path.join(__dirname, "..", "server", "chat-db.ts");
const chatDbSrc = fs.readFileSync(chatDbPath, "utf-8");

const chatTsxPath = path.join(__dirname, "..", "app", "chat.tsx");
const chatTsxSrc = fs.readFileSync(chatTsxPath, "utf-8");

const pushNotifPath = path.join(__dirname, "..", "server", "push-notifications.ts");
const pushNotifSrc = fs.readFileSync(pushNotifPath, "utf-8");

describe("Round 80: Push token deduplication", () => {
  it("savePushToken deletes old tokens for the user before inserting new one", () => {
    // The function should delete all old tokens when registering a new one
    expect(chatDbSrc).toContain("delete(pushTokens)");
    expect(chatDbSrc).toContain("eq(pushTokens.userId, userId)");
  });

  it("savePushToken has comment explaining one-token-per-user policy", () => {
    expect(chatDbSrc).toContain("Each user should only have ONE active push token");
  });

  it("savePushToken cleans up other tokens when existing token is re-registered", () => {
    // When the same token is registered again, it should still clean up OTHER tokens
    const savePushTokenFn = chatDbSrc.substring(
      chatDbSrc.indexOf("export async function savePushToken"),
      chatDbSrc.indexOf("export async function getUserPushTokens")
    );
    // Should delete tokens where token != current token
    expect(savePushTokenFn).toContain("!= ${token}");
  });

  it("push-notifications.ts has message ID dedup cache", () => {
    expect(pushNotifSrc).toContain("recentPushes");
    expect(pushNotifSrc).toContain("messageId");
  });
});

describe("Round 80: Inverted FlatList for reliable scroll", () => {
  it("uses inverted FlatList", () => {
    expect(chatTsxSrc).toContain("inverted");
  });

  it("has invertedMessages memo that reverses messages", () => {
    expect(chatTsxSrc).toContain("invertedMessages");
    expect(chatTsxSrc).toContain("[...messages].reverse()");
  });

  it("FlatList data uses invertedMessages", () => {
    expect(chatTsxSrc).toContain("data={invertedMessages}");
  });

  it("scrollToBottom uses scrollToOffset(0) for inverted list", () => {
    expect(chatTsxSrc).toContain("scrollToOffset({ offset: 0");
  });

  it("imports useMemo", () => {
    expect(chatTsxSrc).toContain("useMemo");
  });

  it("keyboard show listener still scrolls to bottom", () => {
    expect(chatTsxSrc).toContain("keyboardDidShow");
    expect(chatTsxSrc).toContain("scrollToBottom");
  });

  it("does not use scrollToEnd anymore (inverted list uses scrollToOffset)", () => {
    // scrollToEnd should not be in the FlatList onContentSizeChange
    const flatListSection = chatTsxSrc.substring(
      chatTsxSrc.indexOf("<FlatList"),
      chatTsxSrc.indexOf("</FlatList>") > 0 ? chatTsxSrc.indexOf("</FlatList>") : chatTsxSrc.indexOf("keyboardDismissMode") + 50
    );
    expect(flatListSection).not.toContain("scrollToEnd");
  });
});

describe("Round 80: No WebSocket in chat", () => {
  it("chat.tsx does not import useWebSocket", () => {
    expect(chatTsxSrc).not.toContain("useWebSocket");
  });

  it("chat.tsx does not reference wsStatus", () => {
    expect(chatTsxSrc).not.toContain("wsStatus");
  });

  it("connection status always shows connected", () => {
    expect(chatTsxSrc).toContain("chatConnected");
    expect(chatTsxSrc).toContain("Connected");
  });
});
