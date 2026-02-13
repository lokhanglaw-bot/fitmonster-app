import { useState, useCallback, useRef, useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useI18n } from "@/lib/i18n-context";

type Message = {
  id: string;
  text?: string;
  imageUri?: string;
  sender: "me" | "them";
  timestamp: Date;
};

const AUTO_REPLIES = [
  "Nice workout today! 💪",
  "Want to battle later?",
  "My monster just evolved! 🎉",
  "How many steps did you get today?",
  "Let's hit the gym together!",
  "Check out my new monster!",
  "GG! Great battle! 🏆",
  "What's your protein intake today?",
];

export default function ChatScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useI18n();
  const { friendId, friendName } = useLocalSearchParams<{ friendId: string; friendName: string }>();
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: `Hey! Ready to battle? 💪`, sender: "them", timestamp: new Date(Date.now() - 60000) },
  ]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback((text?: string, imageUri?: string) => {
    if (!text?.trim() && !imageUri) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      text: text?.trim(),
      imageUri,
      sender: "me",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");

    // Simulate auto-reply after a short delay
    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        text: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)],
        sender: "them",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
    }, 1500 + Math.random() * 2000);
  }, []);

  const handleSendText = useCallback(() => {
    sendMessage(inputText);
  }, [inputText, sendMessage]);

  const handleSendPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      sendMessage(undefined, result.assets[0].uri);
    }
  }, [sendMessage]);

  const handleCall = useCallback((type: "voice" | "video") => {
    Alert.alert(
      `${type === "voice" ? (t.voiceCall || "Voice Call") : (t.videoCall || "Video Call")}`,
      `${t.calling || "Calling"} ${friendName}...\n\n${t.callFeatureDesc || "This feature requires a real-time communication service and will be available when deployed with WebRTC integration."}`,
      [{ text: t.ok }]
    );
  }, [friendName]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMe = item.sender === "me";
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        <View style={[styles.msgBubble, isMe ? { backgroundColor: "#7C3AED" } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          {item.imageUri && (
            <Image source={{ uri: item.imageUri }} style={styles.msgImage} contentFit="cover" />
          )}
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
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={[styles.chatHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={[styles.chatHeaderName, { color: colors.foreground }]}>{friendName || (t.friend || "Friend")}</Text>
            <Text style={[styles.chatHeaderStatus, { color: "#22C55E" }]}>{t.online}</Text>
          </View>
          <View style={styles.chatHeaderActions}>
            <TouchableOpacity style={styles.headerActionBtn} onPress={() => handleCall("voice")}>
              <IconSymbol name="phone.fill" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionBtn} onPress={() => handleCall("video")}>
              <IconSymbol name="video.fill" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={handleSendPhoto}>
            <IconSymbol name="photo.fill" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            placeholder={t.typeMessage}
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            returnKeyType="send"
            onSubmitEditing={handleSendText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.primary : colors.surface }]}
            onPress={handleSendText}
            disabled={!inputText.trim()}
          >
            <IconSymbol name="paperplane.fill" size={20} color={inputText.trim() ? "#fff" : colors.muted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chatHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  backBtn: { padding: 8 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { fontSize: 18, fontWeight: "700" },
  chatHeaderStatus: { fontSize: 12 },
  chatHeaderActions: { flexDirection: "row", gap: 4 },
  headerActionBtn: { padding: 8 },
  messagesList: { padding: 16, gap: 8 },
  msgRow: { alignItems: "flex-start", marginBottom: 8 },
  msgRowMe: { alignItems: "flex-end" },
  msgBubble: { maxWidth: "80%", borderRadius: 16, padding: 12 },
  msgImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 4 },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTime: { fontSize: 11, marginTop: 4, alignSelf: "flex-end" },
  inputBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, gap: 8 },
  attachBtn: { padding: 8 },
  textInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, fontSize: 15 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
