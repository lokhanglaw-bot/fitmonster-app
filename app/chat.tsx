import { useState, useCallback, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useI18n } from "@/lib/i18n-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Message = {
  id: string;
  text?: string;
  imageUri?: string;
  sender: "me" | "them";
  timestamp: Date;
};

export default function ChatScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { friendId, friendName } = useLocalSearchParams<{ friendId: string; friendName: string }>();
  const [messages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const handleSendText = useCallback(() => {
    // Real-time chat not yet available
    if (!inputText.trim()) return;
    setInputText("");
  }, [inputText]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMe = item.sender === "me";
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        <View style={[styles.msgBubble, isMe ? { backgroundColor: "#7C3AED" } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          {item.text && (
            <Text style={[styles.msgText, { color: isMe ? "#fff" : colors.foreground }]}>{item.text}</Text>
          )}
          <Text style={[styles.msgTime, { color: isMe ? "rgba(255,255,255,0.6)" : colors.muted }]}>
            {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  }, [colors]);

  return (
    <ScreenContainer edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={[styles.chatHeader, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 44) + 8 }]}>
          <TouchableOpacity onPress={() => { if (router.canDismiss()) { router.dismiss(); } else { router.back(); } }} style={styles.backBtn}>
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={[styles.chatHeaderName, { color: colors.foreground }]}>{friendName || (t.friend || "Friend")}</Text>
          </View>
        </View>

        {/* Coming Soon Notice */}
        <View style={styles.flex}>
          {messages.length === 0 ? (
            <View style={styles.comingSoonContainer}>
              <Text style={styles.comingSoonEmoji}>💬</Text>
              <Text style={[styles.comingSoonTitle, { color: colors.foreground }]}>
                {(t as any).chatComingSoonTitle || "Real-time Chat Coming Soon"}
              </Text>
              <Text style={[styles.comingSoonDesc, { color: colors.muted }]}>
                {(t as any).chatComingSoonDesc || "Real-time messaging between trainers is under development. You can battle your friends in the meantime!"}
              </Text>
              <TouchableOpacity
                style={[styles.battleBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (router.canDismiss()) router.dismiss();
                  else router.back();
                }}
              >
                <Text style={styles.battleBtnText}>
                  {(t as any).backToBattle || "Back to Battle"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}
        </View>

        {/* Input Bar - disabled */}
        <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.muted, borderColor: colors.border }]}
            placeholder={(t as any).chatComingSoonShort || "Chat coming soon..."}
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            editable={false}
          />
          <View
            style={[styles.sendBtn, { backgroundColor: colors.surface }]}
          >
            <IconSymbol name="paperplane.fill" size={20} color={colors.muted} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chatHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  backBtn: { padding: 8 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { fontSize: 18, fontWeight: "700" },
  messagesList: { padding: 16, gap: 8 },
  msgRow: { alignItems: "flex-start", marginBottom: 8 },
  msgRowMe: { alignItems: "flex-end" },
  msgBubble: { maxWidth: "80%", borderRadius: 16, padding: 12 },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTime: { fontSize: 11, marginTop: 4, alignSelf: "flex-end" },
  inputBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, gap: 8 },
  textInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, fontSize: 15 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  comingSoonContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  comingSoonEmoji: { fontSize: 64, marginBottom: 16 },
  comingSoonTitle: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  comingSoonDesc: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  battleBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  battleBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
