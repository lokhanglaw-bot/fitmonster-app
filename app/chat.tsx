import { useState, useCallback, useRef, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthContext } from "@/lib/auth-context";
import { useWebSocket } from "@/hooks/use-websocket";
import { EmojiPicker } from "@/components/emoji-picker";
import { ImagePreviewModal } from "@/components/image-preview-modal";
import { trpc } from "@/lib/trpc";

type ChatMessage = {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
};

export default function ChatScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { user } = useAuthContext();
  const { friendId, friendName } = useLocalSearchParams<{ friendId: string; friendName: string }>();
  const friendIdNum = Number(friendId);
  const myId = user?.id || 0;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const { status, send, on } = useWebSocket(myId);
  const uploadImageMutation = trpc.chat.uploadImage.useMutation();

  // Request chat history on connect
  useEffect(() => {
    if (status === "connected" && friendIdNum) {
      send({ type: "get_history", friendId: friendIdNum, limit: 50 });
      send({ type: "mark_read", senderId: friendIdNum });
    }
  }, [status, friendIdNum, send]);

  // Listen for WebSocket messages
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(on("chat_history", (msg) => {
      if (msg.friendId === friendIdNum) {
        const history = (msg.messages as ChatMessage[]).reverse();
        setMessages(history);
        setLoading(false);
      }
    }));

    unsubs.push(on("new_message", (msg) => {
      const newMsg = msg.message as ChatMessage;
      if (
        (newMsg.senderId === friendIdNum && newMsg.receiverId === myId) ||
        (newMsg.senderId === myId && newMsg.receiverId === friendIdNum)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.senderId === friendIdNum) {
          send({ type: "mark_read", senderId: friendIdNum });
        }
      }
    }));

    unsubs.push(on("typing", (msg) => {
      if (msg.senderId === friendIdNum) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      }
    }));

    unsubs.push(on("auth_success", () => {
      send({ type: "get_history", friendId: friendIdNum, limit: 50 });
      send({ type: "mark_read", senderId: friendIdNum });
    }));

    return () => {
      unsubs.forEach((u) => u());
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [on, friendIdNum, myId, send]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Close emoji picker when keyboard shows
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      setShowEmojiPicker(false);
    });
    return () => sub.remove();
  }, []);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || !friendIdNum) return;

    send({
      type: "send_message",
      receiverId: friendIdNum,
      message: text,
      messageType: "text",
    });
    setInputText("");
    setShowEmojiPicker(false);
  }, [inputText, friendIdNum, send]);

  const handleTyping = useCallback((text: string) => {
    setInputText(text);
    if (text.length > 0 && friendIdNum) {
      send({ type: "typing", receiverId: friendIdNum });
    }
  }, [friendIdNum, send]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setInputText((prev) => prev + emoji);
  }, []);

  const toggleEmojiPicker = useCallback(() => {
    if (showEmojiPicker) {
      setShowEmojiPicker(false);
      inputRef.current?.focus();
    } else {
      Keyboard.dismiss();
      setTimeout(() => setShowEmojiPicker(true), 100);
    }
  }, [showEmojiPicker]);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];

      // Check file size (max 5MB)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert(
          (t as any).error || "Error",
          (t as any).chatImageTooLarge || "Image too large (max 5MB)"
        );
        return;
      }

      if (!asset.base64) {
        Alert.alert((t as any).error || "Error", (t as any).chatImageFailed || "Failed to send image");
        return;
      }

      setUploadingImage(true);
      setShowEmojiPicker(false);

      // Upload to server
      const mimeType = asset.mimeType || "image/jpeg";
      const { url } = await uploadImageMutation.mutateAsync({
        base64: asset.base64,
        mimeType,
      });

      // Send image message via WebSocket
      send({
        type: "send_message",
        receiverId: friendIdNum,
        message: url,
        messageType: "image",
      });

      setUploadingImage(false);
    } catch (err: any) {
      console.error("[Chat] Image upload failed:", err);
      setUploadingImage(false);
      Alert.alert(
        (t as any).error || "Error",
        (t as any).chatImageFailed || "Failed to send image"
      );
    }
  }, [friendIdNum, send, t, uploadImageMutation]);

  const formatTime = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return (t as any).chatJustNow || "Just now";
    if (diffMins < 60) return `${diffMins} ${(t as any).chatMinutesAgo || "min ago"}`;

    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return timeStr;
    if (isYesterday) return `${(t as any).chatYesterday || "Yesterday"} ${timeStr}`;
    return `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`;
  }, [t]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === myId;
    const isImage = item.messageType === "image";

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        <View
          style={[
            styles.msgBubble,
            isImage && styles.msgBubbleImage,
            isMe
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          {isImage ? (
            <TouchableOpacity
              onPress={() => setPreviewImage(item.message)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: item.message }}
                style={styles.chatImage}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.msgText, { color: isMe ? "#fff" : colors.foreground }]}>
              {item.message}
            </Text>
          )}
          <View style={styles.msgMeta}>
            {isMe && item.isRead && (
              <Text style={[styles.readIndicator, { color: isMe ? "rgba(255,255,255,0.6)" : colors.muted }]}>
                ✓✓
              </Text>
            )}
            <Text style={[styles.msgTime, { color: isMe ? "rgba(255,255,255,0.6)" : colors.muted }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [colors, myId, formatTime]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>💬</Text>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          {(t as any).chatNoMessages || "No messages yet"}
        </Text>
        <Text style={[styles.emptyDesc, { color: colors.muted }]}>
          {(t as any).chatStartConversation || "Say hi to start the conversation!"}
        </Text>
      </View>
    );
  }, [loading, colors, t]);

  const statusText = status === "connected"
    ? ((t as any).chatConnected || "Connected")
    : status === "connecting"
    ? ((t as any).chatConnecting || "Connecting...")
    : ((t as any).chatDisconnected || "Disconnected");

  const statusColor = status === "connected" ? colors.success : status === "connecting" ? colors.warning : colors.error;

  return (
    <ScreenContainer edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View
          style={[
            styles.chatHeader,
            { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 44) + 8 },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              if (router.canDismiss()) router.dismiss();
              else router.back();
            }}
            style={styles.backBtn}
          >
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={[styles.chatHeaderName, { color: colors.foreground }]}>
              {friendName || "Friend"}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: colors.muted }]}>
                {isTyping ? ((t as any).chatTyping || "typing...") : statusText}
              </Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <View style={[styles.flex, { backgroundColor: colors.background }]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[
              styles.messagesList,
              messages.length === 0 && styles.messagesListEmpty,
            ]}
            ListEmptyComponent={renderEmpty}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        </View>

        {/* Uploading indicator */}
        {uploadingImage && (
          <View style={[styles.uploadingBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.uploadingText, { color: colors.muted }]}>
              {(t as any).chatImageSending || "Sending image..."}
            </Text>
          </View>
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {/* Emoji toggle button */}
          <TouchableOpacity
            onPress={toggleEmojiPicker}
            style={styles.iconBtn}
            activeOpacity={0.6}
          >
            <IconSymbol
              name={showEmojiPicker ? "chevron.left.forwardslash.chevron.right" : "face.smiling"}
              size={24}
              color={showEmojiPicker ? colors.primary : colors.muted}
            />
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border },
            ]}
            placeholder={(t as any).chatPlaceholder || "Type a message..."}
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={handleTyping}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            multiline
            maxLength={2000}
            onFocus={() => setShowEmojiPicker(false)}
          />

          {/* Image picker button */}
          <TouchableOpacity
            onPress={handlePickImage}
            style={styles.iconBtn}
            activeOpacity={0.6}
            disabled={uploadingImage}
          >
            <IconSymbol
              name="photo.on.rectangle"
              size={24}
              color={uploadingImage ? colors.border : colors.muted}
            />
          </TouchableOpacity>

          {/* Send button */}
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputText.trim() ? colors.primary : colors.surface,
              },
            ]}
            disabled={!inputText.trim()}
          >
            <IconSymbol
              name="paperplane.fill"
              size={20}
              color={inputText.trim() ? "#fff" : colors.muted}
            />
          </TouchableOpacity>
        </View>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </KeyboardAvoidingView>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        visible={!!previewImage}
        imageUrl={previewImage || ""}
        onClose={() => setPreviewImage(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { padding: 8 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { fontSize: 18, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12 },
  messagesList: { padding: 16, gap: 4 },
  messagesListEmpty: { flex: 1 },
  msgRow: { alignItems: "flex-start", marginBottom: 8 },
  msgRowMe: { alignItems: "flex-end" },
  msgBubble: { maxWidth: "80%", borderRadius: 16, padding: 12 },
  msgBubbleImage: { padding: 4, overflow: "hidden" },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, alignSelf: "flex-end" },
  readIndicator: { fontSize: 11 },
  msgTime: { fontSize: 11 },
  chatImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  uploadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  uploadingText: { fontSize: 13 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 22 },
});
